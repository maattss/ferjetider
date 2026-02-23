import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getDirectionConfig,
  isDirectionKey,
  isRouteKey,
  type DirectionConfig,
  type DirectionKey,
  type RouteKey,
} from "../src/config/routes";
import {
  formatOsloTime,
  minutesUntilDeparture,
} from "../src/lib/time";
import type {
  Departure,
  DeparturesResponse,
} from "../src/types/departures";

const ENTUR_ENDPOINT = "https://api.entur.io/journey-planner/v3/graphql";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

const ESTIMATED_CALLS_QUERY = `
  query EstimatedCalls($stopPlaceId: String!, $numberOfDepartures: Int!) {
    stopPlace(id: $stopPlaceId) {
      id
      name
      estimatedCalls(numberOfDepartures: $numberOfDepartures) {
        realtime
        aimedDepartureTime
        expectedDepartureTime
        destinationDisplay {
          frontText
        }
        quay {
          id
          name
        }
      }
    }
  }
`;

interface EstimatedCallNode {
  realtime?: boolean;
  aimedDepartureTime?: string | null;
  expectedDepartureTime?: string | null;
  destinationDisplay?: {
    frontText?: string | null;
  } | null;
  quay?: {
    id?: string | null;
    name?: string | null;
  } | null;
}

interface EnturGraphResponse {
  data?: {
    stopPlace?: {
      estimatedCalls?: EstimatedCallNode[];
    } | null;
  };
  errors?: Array<{ message?: string }>;
}

interface ParsedRequest {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  limit: number;
  directionConfig: DirectionConfig;
}

function asSingleQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }
  return null;
}

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) {
    return DEFAULT_LIMIT;
  }

  const numericLimit = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(numericLimit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, numericLimit));
}

export function parseRequest(req: VercelRequest): ParsedRequest | null {
  const routeValue = asSingleQueryValue(req.query.route);
  const directionValue = asSingleQueryValue(req.query.direction);
  const limitValue = asSingleQueryValue(req.query.limit);

  if (!routeValue || !directionValue) {
    return null;
  }

  if (!isRouteKey(routeValue) || !isDirectionKey(directionValue)) {
    return null;
  }

  const directionConfig = getDirectionConfig(routeValue, directionValue);
  if (!directionConfig) {
    return null;
  }

  return {
    routeKey: routeValue,
    directionKey: directionValue,
    limit: parseLimit(limitValue),
    directionConfig,
  };
}

function normalizeForCompare(value: string): string {
  return value
    .toLocaleLowerCase("nb-NO")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesDestination(destination: string, aliases: string[]): boolean {
  const normalizedDestination = normalizeForCompare(destination);
  return aliases.some((alias) => normalizedDestination.includes(normalizeForCompare(alias)));
}

function normalizeEstimatedCall(call: EstimatedCallNode): Omit<Departure, "displayTime" | "minutesUntil"> | null {
  const departureIso = call.expectedDepartureTime ?? call.aimedDepartureTime;
  if (!departureIso) {
    return null;
  }

  const date = new Date(departureIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    departureTimeIso: departureIso,
    destination: call.destinationDisplay?.frontText?.trim() || "Ukjent destinasjon",
    quay: call.quay?.name?.trim() || "Ukjent",
    realtime: Boolean(call.realtime),
  };
}

export function buildDepartures(
  calls: EstimatedCallNode[],
  directionConfig: DirectionConfig,
  limit: number,
  now: Date = new Date(),
): Departure[] {
  const normalizedCalls = calls
    .map(normalizeEstimatedCall)
    .filter((call): call is Omit<Departure, "displayTime" | "minutesUntil"> => Boolean(call))
    .sort(
      (left, right) =>
        new Date(left.departureTimeIso).getTime() - new Date(right.departureTimeIso).getTime(),
    );

  const filtered = normalizedCalls.filter((call) =>
    matchesDestination(call.destination, directionConfig.destinationAliases),
  );

  return filtered.slice(0, limit).map((departure) => ({
    ...departure,
    displayTime: formatOsloTime(departure.departureTimeIso),
    minutesUntil: minutesUntilDeparture(departure.departureTimeIso, now),
  }));
}

function sendError(
  res: VercelResponse,
  code: number,
  message: string,
): VercelResponse {
  return res.status(code).json({ error: message });
}

async function fetchEnturCalls(
  directionConfig: DirectionConfig,
  limit: number,
): Promise<EstimatedCallNode[]> {
  const clientName = process.env.ENTUR_CLIENT_NAME || "ferjetider-app";
  const departuresForFetch = Math.max(limit * 3, 12);

  const response = await fetch(ENTUR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": clientName,
    },
    body: JSON.stringify({
      query: ESTIMATED_CALLS_QUERY,
      variables: {
        stopPlaceId: directionConfig.fromStopPlaceId,
        numberOfDepartures: departuresForFetch,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Entur svarte med status ${response.status}`);
  }

  const payload = (await response.json()) as EnturGraphResponse;
  if (payload.errors?.length) {
    const firstError = payload.errors[0]?.message || "Ukjent GraphQL-feil";
    throw new Error(`Entur GraphQL-feil: ${firstError}`);
  }

  return payload.data?.stopPlace?.estimatedCalls || [];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<VercelResponse | void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "Kun GET er støttet for dette endepunktet.");
  }

  const parsedRequest = parseRequest(req);
  if (!parsedRequest) {
    return sendError(
      res,
      400,
      "Ugyldig forespørsel. Bruk gyldig route/direction og valgfri limit.",
    );
  }

  try {
    const estimatedCalls = await fetchEnturCalls(
      parsedRequest.directionConfig,
      parsedRequest.limit,
    );

    const departures = buildDepartures(
      estimatedCalls,
      parsedRequest.directionConfig,
      parsedRequest.limit,
    );

    const payload: DeparturesResponse = {
      routeKey: parsedRequest.routeKey,
      directionKey: parsedRequest.directionKey,
      updatedAt: new Date().toISOString(),
      isFallback: false,
      departures,
    };

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(payload);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Ukjent feil";
    return sendError(
      res,
      502,
      `Kunne ikke hente live-data fra Entur akkurat nå (${reason}).`,
    );
  }
}
