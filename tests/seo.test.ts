import { describe, expect, it } from "vitest";
import type { VercelRequest } from "@vercel/node";
import {
  buildRobotsTxt,
  buildSitemapXml,
  getBaseUrl,
} from "../api/seo";

describe("seo utilities", () => {
  it("builds base URL from forwarded headers", () => {
    const req = {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "ferjetider.no",
      },
    } as unknown as VercelRequest;

    expect(getBaseUrl(req)).toBe("https://ferjetider.no");
  });

  it("builds sitemap with all indexable route URLs", () => {
    const xml = buildSitemapXml("https://ferjetider.no");

    expect(xml).toContain("https://ferjetider.no/");
    expect(xml).toContain(
      "https://ferjetider.no/?travelDirection=mot_bergen",
    );
    expect(xml).toContain(
      "https://ferjetider.no/?travelDirection=mot_stavanger",
    );
  });

  it("builds robots with sitemap reference", () => {
    const robots = buildRobotsTxt("https://ferjetider.no");

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Sitemap: https://ferjetider.no/sitemap.xml");
  });
});
