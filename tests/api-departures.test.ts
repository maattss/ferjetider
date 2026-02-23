import { afterEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildDepartures,
  default as handler,
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
  });

  it("returns 502 when Entur fetch fails", async () => {
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
  });
});
