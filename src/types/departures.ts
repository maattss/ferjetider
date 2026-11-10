import type { DirectionKey, RouteKey } from "../config/routes";

export interface Departure {
  /** Expected departure, falling back to the timetable when there is no live estimate. */
  departureTimeIso: string;
  aimedDepartureTimeIso: string;
  /** Expected departure plus the scheduled crossing time for this trip. */
  arrivalTimeIso: string;
  delayMinutes: number;
  cancelled: boolean;
  displayTime: string;
  /**
   * Minutes from when the server built the response. Responses are cached for
   * up to 90 seconds, so this is approximate; the page counts from
   * departureTimeIso instead. Kept for API users.
   */
  minutesUntil: number;
  destination: string;
  quay: string;
  realtime: boolean;
}

export interface ServiceAlert {
  /** Headline, often just "Trafikkmelding". */
  summary: string;
  /** What actually happened, when Entur says. */
  description: string | null;
}

export interface DeparturesResponse {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  updatedAt: string;
  isFallback: boolean;
  departures: Departure[];
  /**
   * Service alerts from Entur, e.g. weather cancellations. Plain strings come
   * from caches saved before descriptions were fetched.
   */
  alerts: Array<ServiceAlert | string>;
}

export interface DeparturesErrorPayload {
  error: string;
}
