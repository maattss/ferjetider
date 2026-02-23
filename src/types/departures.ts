import type { DirectionKey, RouteKey } from "../config/routes";

export interface Departure {
  departureTimeIso: string;
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
}

export interface DeparturesErrorPayload {
  error: string;
}
