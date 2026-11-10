import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ApiRequest,
  type ApiResponse,
  buildDepartures,
  clearUpstreamCache,
  collectAlerts,
  limitStep,
  default as handler,
  scheduledCrossingMs,
  parseRequest,
} from "../api/departures";
import { getDirectionConfig } from "../src/config/routes";

interface MockResponse<TBody> {
  headers: Record<string, string | string[]>;
  statusCode: number;
  body: TBody | null;
  res: ApiResponse;
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
  } as unknown as ApiResponse;

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
    vi.unstubAllGlobals();
    clearUpstreamCache();
  });

  it("parses valid request params", () => {
    const request = {
      query: {
        route: "arsvagen_mortavika",
        direction: "arsvagen_to_mortavika",
        limit: "6",
      },
    } as unknown as ApiRequest;

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
      } as unknown as ApiRequest)?.limit;

    expect(parse("30")).toBe(30);
    expect(parse("500")).toBe(30);
  });

  it("reads how far back to list, capped and defaulting to upcoming only", () => {
    const parse = (back?: string) =>
      parseRequest({
        query: {
          route: "halhjem_sandvikvag",
          direction: "halhjem_to_sandvikvag",
          ...(back === undefined ? {} : { back }),
        },
      } as unknown as ApiRequest)?.backMinutes;

    expect(parse()).toBe(0);
    expect(parse("180")).toBe(180);
    // Rounded up to whole hours, so near-identical requests share a cache entry.
    expect(parse("1")).toBe(60);
    expect(parse("150")).toBe(180);
    expect(parse("9999")).toBe(240);
    expect(parse("-5")).toBe(0);
    expect(parse("abc")).toBe(0);
  });

  it("rejects unknown and repeated parameters, which would only bust the cache", () => {
    const base = { route: "arsvagen_mortavika", direction: "arsvagen_to_mortavika" };
    expect(parseRequest({ query: { ...base, x: "123" } })).toBeNull();
    expect(parseRequest({ query: { ...base, limit: ["6", "12"] } })).toBeNull();
    expect(parseRequest({ query: base })).not.toBeNull();
  });

  it("asks Entur for a fixed set of sizes", () => {
    expect(limitStep(1)).toBe(6);
    expect(limitStep(6)).toBe(6);
    expect(limitStep(7)).toBe(12);
    expect(limitStep(20)).toBe(20);
    expect(limitStep(30)).toBe(30);
  });

  it("rejects invalid route/direction", () => {
    const request = {
      query: {
        route: "nope",
        direction: "still-nope",
      },
    } as unknown as ApiRequest;

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
    expect(departures[1].arrivalTimeIso).toBe("2026-02-22T10:44:00.000Z");
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

  it("counts the crossing from this call's stop, not the trip's first", () => {
    const passingTimes = [
      { departure: { time: "10:00:00" } },
      { arrival: { time: "10:20:00" }, departure: { time: "10:25:00" } },
      { arrival: { time: "10:50:00" } },
    ];
    expect(
      scheduledCrossingMs({ stopPositionInPattern: 1, serviceJourney: { passingTimes } }),
    ).toBe(25 * 60_000);
    // Missing or out-of-range positions keep the old whole-trip reading.
    expect(scheduledCrossingMs({ serviceJourney: { passingTimes } })).toBe(50 * 60_000);
    expect(
      scheduledCrossingMs({ stopPositionInPattern: 2, serviceJourney: { passingTimes } }),
    ).toBe(50 * 60_000);
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
    } as unknown as ApiRequest;

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
    } as unknown as ApiRequest;

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

  it("shares one Entur call between requests that differ only in limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({ data: { stopPlace: { estimatedCalls: [] } } }),
      })),
    );
    const request = (limit: string): ApiRequest => ({
      method: "GET",
      query: { route: "arsvagen_mortavika", direction: "arsvagen_to_mortavika", limit },
    });

    await handler(request("7"), createMockResponse().res);
    await handler(request("12"), createMockResponse().res);
    expect(fetch).toHaveBeenCalledTimes(1);

    await handler(request("20"), createMockResponse().res);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not remember a failed Entur call", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { stopPlace: { estimatedCalls: [] } } }),
        }),
    );
    const request: ApiRequest = {
      method: "GET",
      query: { route: "arsvagen_mortavika", direction: "arsvagen_to_mortavika" },
    };

    const failed = createMockResponse();
    await handler(request, failed.res);
    expect(failed.statusCode).toBe(502);

    const retried = createMockResponse();
    await handler(request, retried.res);
    expect(retried.statusCode).toBe(200);
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
    } as unknown as ApiRequest;

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
    } as unknown as ApiRequest;

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
