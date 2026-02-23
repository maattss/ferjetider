import { describe, expect, it } from "vitest";
import {
  formatMinutesLabel,
  formatOsloTime,
  minutesUntilDeparture,
} from "../src/lib/time";

describe("time utils", () => {
  it("formats oslo time as HH:mm", () => {
    const result = formatOsloTime("2026-02-22T10:05:00.000Z");
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("calculates non-negative minute difference", () => {
    const now = new Date("2026-02-22T10:00:00.000Z");
    const result = minutesUntilDeparture("2026-02-22T10:12:00.000Z", now);
    expect(result).toBe(12);
  });

  it("formats minute labels", () => {
    expect(formatMinutesLabel(0)).toBe("Nå");
    expect(formatMinutesLabel(7)).toBe("7 min");
    expect(formatMinutesLabel(60)).toBe("1t");
    expect(formatMinutesLabel(87)).toBe("1t 27m");
    expect(formatMinutesLabel(120)).toBe("2t");
  });
});
