import type { Departure } from "@/types/departures";

/** Keep a departure visible for a short while after its time so "Nå" is readable. */
export const DEPARTED_GRACE_MS = 60_000;
/** Used for the approach bar when we cannot infer the real headway. */
export const FALLBACK_HEADWAY_MS = 20 * 60_000;
const MIN_HEADWAY_MS = 10 * 60_000;
const MAX_HEADWAY_MS = 90 * 60_000;

function departureTime(departure: Departure): number {
  return new Date(departure.departureTimeIso).getTime();
}

/**
 * Cached data can be hours old, so drop anything that has already sailed
 * instead of pinning it at "0 min".
 */
export function upcomingDepartures(
  departures: Departure[],
  now: Date,
): Departure[] {
  const cutoff = now.getTime() - DEPARTED_GRACE_MS;
  return departures.filter((departure) => {
    const time = departureTime(departure);
    return !Number.isNaN(time) && time > cutoff;
  });
}

/**
 * Infer headway from the gap between the next two departures. The two sambands
 * run at very different frequencies, so a single hardcoded span leaves the
 * slower one's progress bar pinned at zero for most of the wait.
 */
export function estimateHeadwayMs(departures: Departure[]): number {
  if (departures.length < 2) {
    return FALLBACK_HEADWAY_MS;
  }

  const gap = departureTime(departures[1]) - departureTime(departures[0]);
  if (!Number.isFinite(gap) || gap <= 0) {
    return FALLBACK_HEADWAY_MS;
  }

  return Math.min(MAX_HEADWAY_MS, Math.max(MIN_HEADWAY_MS, gap));
}

/**
 * Whole minutes and remaining seconds. Floors rather than rounds: a countdown
 * showing 4 min 40 s must not read "5 min 40".
 */
export function countdownParts(diffMs: number): {
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

/** How far the next ferry has travelled through its headway window, 0-100. */
export function approachPercent(diffMs: number, headwayMs: number): number {
  if (headwayMs <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, 100 - (diffMs / headwayMs) * 100));
}
