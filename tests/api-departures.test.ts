import { afterEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildDepartures,
  collectAlerts,
  default as handler,
  scheduledCrossingMs,
  parseRequest,
} from "../api/departures";
import { getDirectionConfig } from "../src/config/routes";

interface MockResponse<TBody> {
  headers: Record<string, string | string[]>;
  statusCode: number;
  body: TBody | null;
  res: VercelResponse;
}

function createMockResponse<TBody>(): MockResponse<TBody> {
  const headers: Record<string, string | string[]> = {};
  let statusCode = 200;
  let body: TBody | null = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: TBody) {
      body = payload;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      headers[name] = value;
      return this;
    },
  } as unknown as VercelResponse;

  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    res,
  };
}

describe("api departures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses valid request params", () => {
    const request = {
      query: {
        route: "arsvagen_mortavika",
        direction: "arsvagen_to_mortavika",
        limit: "6",
      },
    } as unknown as VercelRequest;

    const parsed = parseRequest(request);

    expect(parsed).toBeTruthy();
    expect(parsed?.limit).toBe(6);
    expect(parsed?.routeKey).toBe("arsvagen_mortavika");
  });

  it("allows enough departures to reach the second ferry, but caps them", () => {
    const parse = (limit: string) =>
      parseRequest({
        query: {
          route: "arsvagen_mortavika",
          direction: "arsvagen_to_mortavika",
          limit,
        },
      } as unknown as VercelRequest)?.limit;

    expect(parse("30")).toBe(30);
    expect(parse("500")).toBe(30);
  });

  it("rejects invalid route/direction", () => {
    const request = {
      query: {
        route: "nope",
        direction: "still-nope",
      },
    } as unknown as VercelRequest;

    expect(parseRequest(request)).toBeNull();
  });

  it("normalizes and filters estimated calls", () => {
    const directionConfig = getDirectionConfig(
      "halhjem_sandvikvag",
      "halhjem_to_sandvikvag",
    );

    expect(directionConfig).toBeDefined();

    const departures = buildDepartures(
      [
        {
          expectedDepartureTime: "2026-02-22T10:10:00.000Z",
          destinationDisplay: { frontText: "Sandvikvåg" },
          quay: { name: "1" },
          realtime: true,
        },
        {
          expectedDepartureTime: "2026-02-22T10:05:00.000Z",
          destinationDisplay: { frontText: "Bergen" },
          quay: { name: "2" },
          realtime: false,
        },
      ],
      directionConfig!,
      6,
      new Date("2026-02-22T10:00:00.000Z"),
    );

    expect(departures).toHaveLength(1);
    expect(departures[0].destination).toContain("Sandvik");
    expect(departures[0].minutesUntil).toBe(10);
  });

  it("returns empty list when no departures match direction aliases", () => {
    const directionConfig = getDirectionConfig(
      "arsvagen_mortavika",
      "arsvagen_to_mortavika",
    );

    expect(directionConfig).toBeDefined();

    const departures = buildDepartures(
      [
        {
          expectedDepartureTime: "2026-02-22T10:10:00.000Z",
          destinationDisplay: { frontText: "Stavanger" },
          quay: { name: "X" },
          realtime: true,
        },
      ],
      directionConfig!,
      6,
      new Date("2026-02-22T10:00:00.000Z"),
    );

    expect(departures).toHaveLength(0);
  });

  it("keeps cancelled sailings and reports delay and arrival", () => {
    const directionConfig = getDirectionConfig(
      "arsvagen_mortavika",
      "mortavika_to_arsvagen",
    );

    const departures = buildDepartures(
      [
        {
          aimedDepartureTime: "2026-02-22T10:00:00.000Z",
          expectedDepartureTime: "2026-02-22T10:07:00.000Z",
          destinationDisplay: { frontText: "Arsvågen" },
          serviceJourney: {
            passingTimes: [
              { departure: { time: "11:00:00" }, arrival: { time: "11:00:00" } },
              { departure: { time: "11:28:00" }, arrival: { time: "11:28:00" } },
            ],
          },
        },
        {
          aimedDepartureTime: "2026-02-22T10:20:00.000Z",
          expectedDepartureTime: "2026-02-22T10:20:00.000Z",
          destinationDisplay: { frontText: "Arsvågen" },
          cancellation: true,
        },
      ],
      directionConfig!,
      6,
      new Date("2026-02-22T09:50:00.000Z"),
    );

    expect(departures).toHaveLength(2);
    expect(departures[0].delayMinutes).toBe(7);
    expect(departures[0].arrivalTimeIso).toBe("2026-02-22T10:35:00.000Z");
    expect(departures[1].cancelled).toBe(true);
    // No passing times: falls back to the configured crossing.
    expect(departures[1].arrivalTimeIso).toBe("2026-02-22T10:48:00.000Z");
  });

  it("derives crossing time across midnight", () => {
    expect(
      scheduledCrossingMs({
        serviceJourney: {
          passingTimes: [
            { departure: { time: "23:40:00" } },
            { arrival: { time: "00:25:00" } },
          ],
        },
      }),
    ).toBe(45 * 60_000);
    expect(scheduledCrossingMs({})).toBeNull();
  });

  it("collects deduplicated alerts, preferring Norwegian", () => {
    const weather = {
      summary: [
        { value: "Weather", language: "en" },
        { value: "Innstilt grunnet vær", language: "no" },
      ],
    };
    expect(
      collectAlerts([{ situations: [weather] }, { situations: [weather] }, {}]),
    ).toEqual([{ summary: "Innstilt grunnet vær", description: null }]);
  });

  it("carries the description behind a generic summary", () => {
    const notice = {
      summary: [{ value: "Trafikkmelding", language: null }],
      description: [{ value: "Suppleringsruten er innstilt søndag.", language: null }],
    };
    expect(collectAlerts([{ situations: [notice] }])).toEqual([
      { summary: "Trafikkmelding", description: "Suppleringsruten er innstilt søndag." },
    ]);
  });

  it("returns 400 for invalid request params", async () => {
    const request = {
      method: "GET",
      query: {
        route: "unknown",
        direction: "unknown",
      },
    } as unknown as VercelRequest;

    const response = createMockResponse<{ error: string }>();

    await handler(request, response.res);

    expect(response.statusCode).toBe(400);
    expect(response.body?.error).toContain("Ugyldig forespørsel");
  });

  it("returns 200 and normalized payload for valid request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            stopPlace: {
              estimatedCalls: [
                {
                  expectedDepartureTime: "2026-02-22T10:10:00.000Z",
                  destinationDisplay: { frontText: "Mortavika" },
                  quay: { name: "A" },
                  realtime: true,
                },
              ],
            },
          },
        }),
      }),
    );

    const request = {
      method: "GET",
      query: {
        route: "arsvagen_mortavika",
        direction: "arsvagen_to_mortavika",
        limit: "6",
      },
    } as unknown as VercelRequest;

    const response = createMockResponse<{
      departures: Array<{ destination: string }>;
    }>();

    await handler(request, response.res);

    expect(response.statusCode).toBe(200);
    expect(response.body?.departures).toHaveLength(1);
    expect(response.body?.departures[0].destination).toBe("Mortavika");
    const query = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    ).query as string;
    expect(query).toContain("includeCancelledTrips: true");
    expect(query).toContain("whiteListedModes: [water]");
  });

  it("returns 502 when Entur fetch fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const request = {
      method: "GET",
      query: {
        route: "arsvagen_mortavika",
        direction: "arsvagen_to_mortavika",
      },
    } as unknown as VercelRequest;

    const response = createMockResponse<{ error: string }>();

    await handler(request, response.res);

    expect(response.statusCode).toBe(502);
    expect(response.body?.error).toContain("Kunne ikke hente live-data");
    expect(response.body?.error).not.toContain("network down");
  });

  it("keeps upstream GraphQL detail out of the 502 body and in the logs", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const upstreamDetail =
      "Validation error of type FieldUndefined: Field 'quay' at /stopPlace";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errors: [{ message: upstreamDetail }] }),
      }),
    );

    const request = {
      method: "GET",
      query: {
        route: "arsvagen_mortavika",
        direction: "arsvagen_to_mortavika",
      },
    } as unknown as VercelRequest;

    const response = createMockResponse<{ error: string }>();

    await handler(request, response.res);

    expect(response.statusCode).toBe(502);
    expect(response.body?.error).toBe(
      "Kunne ikke hente live-data fra Entur akkurat nå. Prøv igjen om litt.",
    );
    expect(response.body?.error).not.toContain("Validation error");
    expect(logged).toHaveBeenCalledWith(
      "Henting fra Entur feilet",
      expect.objectContaining({ reason: expect.stringContaining(upstreamDetail) }),
    );
  });
});
