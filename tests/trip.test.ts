import { describe, expect, it } from "vitest";
import { firstSailing, planConnection } from "../src/lib/trip";
import type { Departure } from "../src/types/departures";

const MIN = 60_000;
const DRIVE_MS = 65 * MIN;

function departure(depart: string, arrive: string, cancelled = false): Departure {
  const day = "2026-02-22T";
  return {
    departureTimeIso: `${day}${depart}:00.000Z`,
    aimedDepartureTimeIso: `${day}${depart}:00.000Z`,
    arrivalTimeIso: `${day}${arrive}:00.000Z`,
    delayMinutes: 0,
    cancelled,
    displayTime: depart,
    minutesUntil: 0,
    destination: "X",
    quay: "1",
    realtime: true,
  };
}

describe("planConnection", () => {
  // 10:00 Mortavika, lands 10:28, at Sandvikvåg 11:33.
  const first = departure("10:00", "10:28");

  it("picks the first sailing with boarding margin", () => {
    const plan = planConnection(
      first,
      [departure("11:20", "12:05"), departure("11:36", "12:21"), departure("11:50", "12:35")],
      DRIVE_MS,
    );
    // 11:36 leaves only 3 minutes after arriving: too tight to count.
    expect(plan?.second?.displayTime).toBe("11:50");
    expect(plan?.marginMs).toBe(17 * MIN);
  });

  it("skips cancelled sailings", () => {
    const plan = planConnection(
      first,
      [departure("11:50", "12:35", true), departure("12:30", "13:15")],
      DRIVE_MS,
    );
    expect(plan?.second?.displayTime).toBe("12:30");
  });

  it("reports when nothing known leaves late enough", () => {
    const plan = planConnection(first, [departure("11:00", "11:45")], DRIVE_MS);
    expect(plan?.second).toBeNull();
    expect(plan?.marginMs).toBeNull();
  });
});

describe("firstSailing", () => {
  it("skips cancelled departures", () => {
    expect(
      firstSailing([departure("10:00", "10:28", true), departure("10:20", "10:48")])
        ?.displayTime,
    ).toBe("10:20");
  });
});
