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
  minutesUntil: number;
  destination: string;
  quay: string;
  realtime: boolean;
}

export interface DeparturesResponse {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  updatedAt: string;
  isFallback: boolean;
  departures: Departure[];
  /** Service alerts from Entur, e.g. weather cancellations. */
  alerts: string[];
}

export interface DeparturesErrorPayload {
  error: string;
}
