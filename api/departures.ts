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
  ServiceAlert,
} from "../src/types/departures";

/**
 * The parts of Vercel's Node.js request and response helpers this handler
 * uses. The runtime provides them; declaring them here saves pulling in
 * `@vercel/node` and its dependency tree just for two types.
 */
export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  setHeader(name: string, value: string): ApiResponse;
}

const ENTUR_ENDPOINT = "https://api.entur.io/journey-planner/v3/graphql";
const DEFAULT_LIMIT = 6;
// Daytime sailings run every ~15 min and the trip plan looks up to ~5 hours
// ahead for the second ferry, so the ceiling has to cover that.
const MAX_LIMIT = 30;
/**
 * Entur is asked for one of these sizes, never the exact limit, so requests
 * that differ only a little in `limit` share one upstream call.
 */
const LIMIT_STEPS = [6, 12, 20, MAX_LIMIT] as const;
// Lets the first leg list sailings that already left, for a driver who opens
// the page on the way. Past the drive to the second quay they no longer matter.
const MAX_BACK_MINUTES = 240;
/** `back` is rounded up to this, for the same reason as LIMIT_STEPS. */
const BACK_STEP_MINUTES = 60;
const ENTUR_TIMEOUT_MS = 5_000;
/** Matches the CDN's s-maxage, so a warm function adds no extra staleness. */
const UPSTREAM_CACHE_MS = 30_000;
const ALLOWED_PARAMS = new Set(["route", "direction", "limit", "back"]);

const ESTIMATED_CALLS_QUERY = `
  query EstimatedCalls(
    $stopPlaceId: String!
    $numberOfDepartures: Int!
    $startTime: DateTime
  ) {
    stopPlace(id: $stopPlaceId) {
      id
      name
      estimatedCalls(
        numberOfDepartures: $numberOfDepartures
        startTime: $startTime
        includeCancelledTrips: true
        whiteListedModes: [water]
      ) {
        realtime
        cancellation
        stopPositionInPattern
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
          description {
            value
            language
          }
        }
      }
    }
  }
`;

type TranslatedText = Array<{ value?: string | null; language?: string | null }> | null;

interface SituationNode {
  summary?: TranslatedText;
  description?: TranslatedText;
}

interface PassingTimeNode {
  departure?: { time?: string | null } | null;
  arrival?: { time?: string | null } | null;
}

export interface EstimatedCallNode {
  realtime?: boolean;
  cancellation?: boolean;
  /** This call's index in the trip's stops, and so in its passing times. */
  stopPositionInPattern?: number | null;
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
  /** Minutes before now to start listing from; 0 for upcoming only. */
  backMinutes: number;
  directionConfig: DirectionConfig;
}

/**
 * Every distinct query string is its own entry in Vercel's CDN cache, and each
 * miss reaches Entur. Refusing parameters we do not read, and repeated ones,
 * keeps a cache-busting `?x=123` from turning into an Entur call.
 */
function hasOnlyKnownParams(query: ApiRequest["query"]): boolean {
  return Object.entries(query).every(
    ([key, value]) => ALLOWED_PARAMS.has(key) && !Array.isArray(value),
  );
}

function asSingleQueryValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
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

/** Rounded up to whole hours: an hour more of past sailings costs nothing. */
function parseBackMinutes(rawBack: string | null): number {
  const minutes = rawBack ? Number.parseInt(rawBack, 10) : 0;
  if (Number.isNaN(minutes)) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(MAX_BACK_MINUTES, minutes));
  return Math.ceil(clamped / BACK_STEP_MINUTES) * BACK_STEP_MINUTES;
}

/** The smallest fetch size that covers the limit. */
export function limitStep(limit: number): number {
  return LIMIT_STEPS.find((step) => step >= limit) ?? MAX_LIMIT;
}

export function parseRequest(req: ApiRequest): ParsedRequest | null {
  if (!hasOnlyKnownParams(req.query)) {
    return null;
  }
  const routeValue = asSingleQueryValue(req.query.route);
  const directionValue = asSingleQueryValue(req.query.direction);
  const limitValue = asSingleQueryValue(req.query.limit);
  const backValue = asSingleQueryValue(req.query.back);

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
    backMinutes: parseBackMinutes(backValue),
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
 *
 * The crossing starts at this call's own stop, not at the trip's first one, so
 * a trip that calls somewhere before our quay is not counted from there.
 */
export function scheduledCrossingMs(call: EstimatedCallNode): number | null {
  const passingTimes = call.serviceJourney?.passingTimes;
  if (!passingTimes || passingTimes.length < 2) {
    return null;
  }

  const position = call.stopPositionInPattern;
  const startIndex =
    typeof position === "number" &&
    Number.isInteger(position) &&
    position >= 0 &&
    position < passingTimes.length - 1
      ? position
      : 0;

  const departure = localTimeToSeconds(passingTimes[startIndex].departure?.time);
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

function pickNorwegian(texts: TranslatedText | undefined): string | null {
  const options = texts ?? [];
  const norwegian = options.find((t) => t.language && /^(no|nb|nob)$/i.test(t.language));
  const text = (norwegian ?? options[0])?.value?.trim();
  return text || null;
}

/**
 * The summary is often just "Trafikkmelding"; what actually happened is in
 * the description, so carry both.
 */
function situationAlert(situation: SituationNode): ServiceAlert | null {
  const summary = pickNorwegian(situation.summary);
  const description = pickNorwegian(situation.description);
  if (!summary && !description) {
    return null;
  }
  return {
    summary: summary ?? "Trafikkmelding",
    description: description && description !== summary ? description : null,
  };
}

/**
 * Alerts on the ferry sailings themselves (weather, a vessel out of service),
 * deduplicated. Stop-wide alerts are left out: at these quays they are mostly
 * about the buses that also call there.
 */
export function collectAlerts(calls: EstimatedCallNode[]): ServiceAlert[] {
  const byText = new Map<string, ServiceAlert>();
  for (const situation of calls.flatMap((call) => call.situations ?? [])) {
    const alert = situationAlert(situation);
    if (alert) {
      byText.set(`${alert.summary}\n${alert.description ?? ""}`, alert);
    }
  }
  return [...byText.values()];
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
  res: ApiResponse,
  code: number,
  message: string,
): ApiResponse {
  return res.status(code).json({ error: message });
}

const upstreamCache = new Map<string, { expiresAtMs: number; result: Promise<StopPlaceNode | null> }>();

/** Only for tests, which need each case to reach the mocked fetch. */
export function clearUpstreamCache(): void {
  upstreamCache.clear();
}

/**
 * A warm function instance answers requests that map to the same Entur call
 * from memory for a short while. Concurrent misses share one call; a failed
 * call is forgotten at once so the next request tries again.
 */
function cachedEnturStopPlace(
  directionConfig: DirectionConfig,
  limit: number,
  backMinutes: number,
): Promise<StopPlaceNode | null> {
  const step = limitStep(limit);
  const key = `${directionConfig.key}:${step}:${backMinutes}`;
  const now = Date.now();

  for (const [cachedKey, entry] of upstreamCache) {
    if (entry.expiresAtMs <= now) {
      upstreamCache.delete(cachedKey);
    }
  }

  const cached = upstreamCache.get(key);
  if (cached) {
    return cached.result;
  }

  const result = fetchEnturStopPlace(directionConfig, step, backMinutes);
  upstreamCache.set(key, { expiresAtMs: now + UPSTREAM_CACHE_MS, result });
  result.catch(() => {
    if (upstreamCache.get(key)?.result === result) {
      upstreamCache.delete(key);
    }
  });
  return result;
}

async function fetchEnturStopPlace(
  directionConfig: DirectionConfig,
  limit: number,
  backMinutes: number,
): Promise<StopPlaceNode | null> {
  const clientName = process.env.ENTUR_CLIENT_NAME || "ferjetider-app";
  // Only ferries are requested, but keep headroom for sailings the destination
  // filter drops.
  const departuresForFetch = Math.max(limit * 2, 12);

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
          // Null lets Entur start from now, as before.
          startTime:
            backMinutes > 0
              ? new Date(Date.now() - backMinutes * 60_000).toISOString()
              : null,
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
  req: ApiRequest,
  res: ApiResponse,
): Promise<ApiResponse | void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "Kun GET er støttet for dette endepunktet.");
  }

  const parsedRequest = parseRequest(req);
  if (!parsedRequest) {
    return sendError(
      res,
      400,
      "Ugyldig forespørsel. Bruk gyldig route og direction, eventuelt limit og back, og ingen andre parametre.",
    );
  }

  try {
    const stopPlace = await cachedEnturStopPlace(
      parsedRequest.directionConfig,
      parsedRequest.limit,
      parsedRequest.backMinutes,
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
