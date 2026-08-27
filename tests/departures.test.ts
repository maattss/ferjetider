import { describe, expect, it } from "vitest";
import {
  approachPercent,
  countdownParts,
  estimateHeadwayMs,
  FALLBACK_HEADWAY_MS,
  upcomingDepartures,
} from "../src/lib/departures";
import type { Departure } from "../src/types/departures";

function departure(iso: string): Departure {
  return {
    departureTimeIso: iso,
    displayTime: "00:00",
    minutesUntil: 0,
    destination: "Mortavika",
    quay: "Arsvågen",
    realtime: true,
  };
}

const NOW = new Date("2026-02-22T10:00:00.000Z");

describe("upcomingDepartures", () => {
  it("drops departures that have already sailed", () => {
    const result = upcomingDepartures(
      [
        departure("2026-02-22T04:00:00.000Z"),
        departure("2026-02-22T09:30:00.000Z"),
        departure("2026-02-22T10:20:00.000Z"),
      ],
      NOW,
    );

    expect(result.map((d) => d.departureTimeIso)).toEqual([
      "2026-02-22T10:20:00.000Z",
    ]);
  });

  it("keeps a just-departed ferry inside the grace window", () => {
    const result = upcomingDepartures(
      [departure("2026-02-22T09:59:30.000Z")],
      NOW,
    );

    expect(result).toHaveLength(1);
  });

  it("ignores unparseable timestamps", () => {
    expect(upcomingDepartures([departure("ikke-en-dato")], NOW)).toHaveLength(0);
  });

  it("returns nothing for a stale cache where everything has sailed", () => {
    const result = upcomingDepartures(
      [
        departure("2026-02-22T05:00:00.000Z"),
        departure("2026-02-22T05:40:00.000Z"),
      ],
      NOW,
    );

    expect(result).toEqual([]);
  });
});

describe("estimateHeadwayMs", () => {
  it("falls back when there is nothing to measure", () => {
    expect(estimateHeadwayMs([])).toBe(FALLBACK_HEADWAY_MS);
    expect(estimateHeadwayMs([departure("2026-02-22T10:20:00.000Z")])).toBe(
      FALLBACK_HEADWAY_MS,
    );
  });

  it("uses the gap between the next two departures", () => {
    const headway = estimateHeadwayMs([
      departure("2026-02-22T10:20:00.000Z"),
      departure("2026-02-22T11:00:00.000Z"),
    ]);

    expect(headway).toBe(40 * 60_000);
  });

  it("clamps implausible gaps", () => {
    expect(
      estimateHeadwayMs([
        departure("2026-02-22T10:20:00.000Z"),
        departure("2026-02-22T10:22:00.000Z"),
      ]),
    ).toBe(10 * 60_000);

    expect(
      estimateHeadwayMs([
        departure("2026-02-22T10:20:00.000Z"),
        departure("2026-02-22T18:00:00.000Z"),
      ]),
    ).toBe(90 * 60_000);
  });
});

describe("countdownParts", () => {
  it("floors minutes so 4:40 never reads as 5:40", () => {
    expect(countdownParts(4 * 60_000 + 40_000)).toEqual({
      minutes: 4,
      seconds: 40,
    });
  });

  it("handles exact minutes and past departures", () => {
    expect(countdownParts(5 * 60_000)).toEqual({ minutes: 5, seconds: 0 });
    expect(countdownParts(-30_000)).toEqual({ minutes: 0, seconds: 0 });
  });
});

describe("approachPercent", () => {
  it("fills as the ferry approaches", () => {
    expect(approachPercent(20 * 60_000, 20 * 60_000)).toBe(0);
    expect(approachPercent(10 * 60_000, 20 * 60_000)).toBe(50);
    expect(approachPercent(0, 20 * 60_000)).toBe(100);
  });

  it("clamps to 0-100", () => {
    expect(approachPercent(90 * 60_000, 20 * 60_000)).toBe(0);
    expect(approachPercent(-60_000, 20 * 60_000)).toBe(100);
    expect(approachPercent(60_000, 0)).toBe(0);
  });
});
