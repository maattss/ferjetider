import { vi } from "vitest";
import type { DirectionKey, RouteKey } from "../src/config/routes";
import type { Departure, DeparturesResponse } from "../src/types/departures";

export const MIN = 60_000;
export const NOW = new Date("2026-02-22T10:00:00.000Z");

/** A sailing `departIn` minutes after NOW, landing `crossing` minutes later. */
export function sailing(
  departIn: number,
  { crossing = 28, cancelled = false, label }: { crossing?: number; cancelled?: boolean; label?: string } = {},
): Departure {
  const depart = new Date(NOW.getTime() + departIn * MIN).toISOString();
  return {
    departureTimeIso: depart,
    aimedDepartureTimeIso: depart,
    arrivalTimeIso: new Date(NOW.getTime() + (departIn + crossing) * MIN).toISOString(),
    delayMinutes: 0,
    cancelled,
    displayTime: label ?? `T${departIn}`,
    minutesUntil: Math.max(0, departIn),
    destination: "X",
    quay: "1",
    realtime: true,
  };
}

export function payload(
  routeKey: RouteKey,
  directionKey: DirectionKey,
  departures: Departure[],
): DeparturesResponse {
  return {
    routeKey,
    directionKey,
    updatedAt: NOW.toISOString(),
    isFallback: false,
    departures,
    alerts: [],
  };
}

export function okResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

export function errorResponse(status: number, body: unknown): Response {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

/** Freezes the clock without faking timers, so testing-library's waitFor still runs. */
export function freezeClock(at: Date = NOW): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at);
}
