import { describe, expect, it } from "vitest";
import {
  getDirectionConfig,
  isDirectionKey,
  isRouteKey,
  ROUTES,
} from "../src/config/routes";

describe("route config", () => {
  it("contains both required route groups", () => {
    expect(ROUTES).toHaveLength(2);
    expect(ROUTES.map((route) => route.key)).toEqual(
      expect.arrayContaining(["arsvagen_mortavika", "halhjem_sandvikvag"]),
    );
  });

  it("validates route and direction keys", () => {
    expect(isRouteKey("arsvagen_mortavika")).toBe(true);
    expect(isRouteKey("invalid")).toBe(false);
    expect(isDirectionKey("halhjem_to_sandvikvag")).toBe(true);
    expect(isDirectionKey("invalid")).toBe(false);
  });

  it("returns only directions that belong to route", () => {
    expect(
      getDirectionConfig("arsvagen_mortavika", "arsvagen_to_mortavika"),
    ).toBeDefined();
    expect(
      getDirectionConfig("arsvagen_mortavika", "halhjem_to_sandvikvag" as any),
    ).toBeUndefined();
  });
});
