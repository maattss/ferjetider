import type { Departure } from "@/types/departures";

/** Be in the queue this long before the second ferry sails. */
export const BOARDING_MARGIN_MS = 5 * 60_000;
/** Below this much slack the plan flags the connection as tight. */
export const TIGHT_MARGIN_MS = 12 * 60_000;

export interface TripConnection {
  first: Departure;
  /** When the first ferry lands on the far side. */
  firstArrivalMs: number;
  /** When you reach the second ferry's quay after driving. */
  atSecondQuayMs: number;
  /** Null when no known departure leaves late enough. */
  second: Departure | null;
  /** Slack between reaching the quay and the second ferry sailing. */
  marginMs: number | null;
}

function time(iso: string): number {
  return new Date(iso).getTime();
}

/** The aimed time is stable across delay updates, so it identifies a sailing. */
export function departureId(departure: Departure): string {
  return departure.aimedDepartureTimeIso;
}

export function firstSailing(departures: Departure[]): Departure | undefined {
  return departures.find((departure) => !departure.cancelled);
}

export function planConnection(
  first: Departure,
  secondDepartures: Departure[],
  driveMs: number,
): TripConnection | null {
  const firstArrivalMs = time(first.arrivalTimeIso);
  if (Number.isNaN(firstArrivalMs)) {
    return null;
  }

  const atSecondQuayMs = firstArrivalMs + driveMs;
  const second =
    secondDepartures.find(
      (departure) =>
        !departure.cancelled &&
        time(departure.departureTimeIso) - atSecondQuayMs >= BOARDING_MARGIN_MS,
    ) ?? null;

  return {
    first,
    firstArrivalMs,
    atSecondQuayMs,
    second,
    marginMs: second ? time(second.departureTimeIso) - atSecondQuayMs : null,
  };
}
