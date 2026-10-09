import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getDirectionConfig,
  isDirectionKey,
  isRouteKey,
  type DirectionConfig,
  type DirectionKey,
  type RouteKey,
} from "../src/config/routes.js";
import {
  formatOsloTime,
  minutesUntilDeparture,
} from "../src/lib/time.js";
import type {
  Departure,
  DeparturesResponse,
} from "../src/types/departures";

const ENTUR_ENDPOINT = "https://api.entur.io/journey-planner/v3/graphql";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
const ENTUR_TIMEOUT_MS = 5_000;

const ESTIMATED_CALLS_QUERY = `
  query EstimatedCalls($stopPlaceId: String!, $numberOfDepartures: Int!) {
    stopPlace(id: $stopPlaceId) {
      id
      name
      estimatedCalls(
        numberOfDepartures: $numberOfDepartures
        includeCancelledTrips: true
        whiteListedModes: [water]
      ) {
        realtime
        cancellation
        aimedDepartureTime
        expectedDepartureTime
        destinationDisplay {
          frontText
        }
        quay {
          id
          name
        }
        serviceJourney {
          passingTimes {
            departure {
              time
            }
            arrival {
              time
            }
          }
        }
        situations {
          summary {
            value
            language
          }
        }
      }
    }
  }
`;

interface SituationNode {
  summary?: Array<{ value?: string | null; language?: string | null }> | null;
}

interface PassingTimeNode {
  departure?: { time?: string | null } | null;
  arrival?: { time?: string | null } | null;
}

export interface EstimatedCallNode {
  realtime?: boolean;
  cancellation?: boolean;
  aimedDepartureTime?: string | null;
  expectedDepartureTime?: string | null;
  destinationDisplay?: {
    frontText?: string | null;
  } | null;
  quay?: {
    id?: string | null;
    name?: string | null;
  } | null;
  serviceJourney?: {
    passingTimes?: PassingTimeNode[] | null;
  } | null;
  situations?: SituationNode[] | null;
}

interface StopPlaceNode {
  estimatedCalls?: EstimatedCallNode[];
}

interface EnturGraphResponse {
  data?: {
    stopPlace?: StopPlaceNode | null;
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

const SECONDS_PER_DAY = 24 * 60 * 60;
const MAX_CROSSING_SECONDS = 3 * 60 * 60;

function localTimeToSeconds(value: string | null | undefined): number | null {
  const match = value?.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
}

/**
 * Entur has no live arrival times for these ferries, but the timetable's
 * passing times give the scheduled crossing for each trip. Times are local
 * clock times, so a trip across midnight wraps.
 */
export function scheduledCrossingMs(call: EstimatedCallNode): number | null {
  const passingTimes = call.serviceJourney?.passingTimes;
  if (!passingTimes || passingTimes.length < 2) {
    return null;
  }

  const departure = localTimeToSeconds(passingTimes[0].departure?.time);
  const arrival = localTimeToSeconds(passingTimes[passingTimes.length - 1].arrival?.time);
  if (departure === null || arrival === null) {
    return null;
  }

  const seconds = (arrival - departure + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  if (seconds <= 0 || seconds > MAX_CROSSING_SECONDS) {
    return null;
  }
  return seconds * 1000;
}

type NormalizedCall = Omit<Departure, "displayTime" | "minutesUntil">;

function normalizeEstimatedCall(
  call: EstimatedCallNode,
  fallbackCrossingMinutes: number,
): NormalizedCall | null {
  const departureIso = call.expectedDepartureTime ?? call.aimedDepartureTime;
  if (!departureIso) {
    return null;
  }

  const date = new Date(departureIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const aimedIso = call.aimedDepartureTime ?? departureIso;
  const aimedTime = new Date(aimedIso).getTime();
  const delayMinutes = Number.isNaN(aimedTime)
    ? 0
    : Math.max(0, Math.round((date.getTime() - aimedTime) / 60_000));

  const crossingMs = scheduledCrossingMs(call) ?? fallbackCrossingMinutes * 60_000;

  return {
    departureTimeIso: departureIso,
    aimedDepartureTimeIso: aimedIso,
    arrivalTimeIso: new Date(date.getTime() + crossingMs).toISOString(),
    delayMinutes,
    cancelled: Boolean(call.cancellation),
    destination: call.destinationDisplay?.frontText?.trim() || "Ukjent destinasjon",
    quay: call.quay?.name?.trim() || "Ukjent",
    realtime: Boolean(call.realtime),
  };
}

function situationText(situation: SituationNode): string | null {
  const summaries = situation.summary ?? [];
  const norwegian = summaries.find((s) => s.language && /^(no|nb|nob)$/i.test(s.language));
  const text = (norwegian ?? summaries[0])?.value?.trim();
  return text || null;
}

/**
 * Alerts on the ferry sailings themselves (weather, a vessel out of service),
 * deduplicated. Stop-wide alerts are left out: at these quays they are mostly
 * about the buses that also call there.
 */
export function collectAlerts(calls: EstimatedCallNode[]): string[] {
  const texts = calls
    .flatMap((call) => call.situations ?? [])
    .map(situationText)
    .filter((text): text is string => Boolean(text));
  return [...new Set(texts)];
}

export function buildDepartures(
  calls: EstimatedCallNode[],
  directionConfig: DirectionConfig,
  limit: number,
  now: Date = new Date(),
): Departure[] {
  const normalizedCalls = calls
    .map((call) => normalizeEstimatedCall(call, directionConfig.crossingMinutes))
    .filter((call): call is NormalizedCall => Boolean(call))
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

async function fetchEnturStopPlace(
  directionConfig: DirectionConfig,
  limit: number,
): Promise<StopPlaceNode | null> {
  const clientName = process.env.ENTUR_CLIENT_NAME || "ferjetider-app";
  const departuresForFetch = Math.max(limit * 3, 12);

  let response: Response;
  try {
    response = await fetch(ENTUR_ENDPOINT, {
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
      // Without this a hanging upstream holds the function open until the
      // platform kills it, turning a slow Entur into a slow page for everyone.
      signal: AbortSignal.timeout(ENTUR_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Entur svarte ikke innen ${ENTUR_TIMEOUT_MS} ms`);
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Entur svarte med status ${response.status}`);
  }

  const payload = (await response.json()) as EnturGraphResponse;
  if (payload.errors?.length) {
    const firstError = payload.errors[0]?.message || "Ukjent GraphQL-feil";
    throw new Error(`Entur GraphQL-feil: ${firstError}`);
  }

  return payload.data?.stopPlace ?? null;
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
    const stopPlace = await fetchEnturStopPlace(
      parsedRequest.directionConfig,
      parsedRequest.limit,
    );
    const estimatedCalls = (stopPlace?.estimatedCalls ?? []).filter((call) =>
      matchesDestination(
        call.destinationDisplay?.frontText ?? "",
        parsedRequest.directionConfig.destinationAliases,
      ),
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
      alerts: collectAlerts(estimatedCalls),
    };

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    return res.status(200).json(payload);
  } catch (error) {
    // The reason is either arbitrary text from Entur's GraphQL response or a
    // raw fetch failure. It belongs in the logs, not in a message the page
    // renders to someone standing on the quay.
    console.error("Henting fra Entur feilet", {
      routeKey: parsedRequest.routeKey,
      directionKey: parsedRequest.directionKey,
      reason: error instanceof Error ? error.message : String(error),
    });

    return sendError(
      res,
      502,
      "Kunne ikke hente live-data fra Entur akkurat nå. Prøv igjen om litt.",
    );
  }
}
