import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SEO_PAGES,
  SEO_PAGE_MAP,
  buildRobotsTxt,
  buildSitemapXml,
  directionPage,
  findSeoPage,
  prerenderPage,
} from "@/lib/seo";

const template = readFileSync(path.resolve(__dirname, "../index.html"), "utf8");

describe("seo pages", () => {
  it("gives every page its own path, title, description and heading", () => {
    for (const field of ["path", "title", "description", "heading"] as const) {
      const values = SEO_PAGES.map((page) => page[field]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("finds pages by path, ignoring a trailing slash", () => {
    expect(findSeoPage("/")?.key).toBe("home");
    expect(findSeoPage("/mot-stavanger/")?.key).toBe("mot_stavanger");
    expect(findSeoPage("/arsvagen-mortavika")?.key).toBe("arsvagen_mortavika");
    expect(findSeoPage("/finnes-ikke")).toBeUndefined();
  });

  it("maps each travel direction to its page", () => {
    expect(directionPage("mot_bergen")).toBe(SEO_PAGE_MAP.home);
    expect(directionPage("mot_stavanger")).toBe(SEO_PAGE_MAP.mot_stavanger);
  });
});

describe("prerenderPage", () => {
  const html = prerenderPage(template, SEO_PAGE_MAP.halhjem_sandvikvag);

  it("bakes in the page's own metadata", () => {
    expect(html).toContain("<title>Ferje Halhjem–Sandvikvåg: neste avganger i sanntid</title>");
    expect(html).toMatch(
      /rel="canonical"\s+href="https:\/\/ferjetider\.fyi\/halhjem-sandvikvag"/,
    );
    expect(html).toMatch(
      /property="og:url"\s+content="https:\/\/ferjetider\.fyi\/halhjem-sandvikvag"/,
    );
    expect(html).toContain('"@type":"WebPage"');
  });

  it("puts the heading, text and links to the other pages in the root", () => {
    expect(html).toContain('<div id="root"><h1>Ferje Halhjem–Sandvikvåg</h1>');
    expect(html).toContain("<h2>Om sambandet Halhjem–Sandvikvåg</h2>");
    expect(html).toContain('<a href="/arsvagen-mortavika">');
    expect(html).not.toContain('<a href="/halhjem-sandvikvag">');
  });

  it("keeps the root URL canonical with a trailing slash", () => {
    expect(prerenderPage(template, SEO_PAGE_MAP.home)).toMatch(
      /rel="canonical"\s+href="https:\/\/ferjetider\.fyi\/"/,
    );
  });
});

describe("robots and sitemap", () => {
  it("lists every page in the sitemap with the given date", () => {
    const xml = buildSitemapXml("2026-10-17");

    for (const page of SEO_PAGES) {
      expect(xml).toContain(`<loc>https://ferjetider.fyi${page.path}</loc>`);
    }
    expect(xml).toContain("<lastmod>2026-10-17</lastmod>");
    expect(xml).not.toContain("travelDirection");
  });

  it("points robots.txt at the sitemap", () => {
    const robots = buildRobotsTxt();

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Sitemap: https://ferjetider.fyi/sitemap.xml");
  });
});
