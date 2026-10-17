// Relative import: vite.config.ts loads this file for the build, outside the
// "@" alias.
import {
  DRIVE_BETWEEN_SAMBAND_MINUTES,
  ROUTE_MAP,
  type RouteKey,
  type TravelDirectionKey,
} from "../config/routes";

export const SITE_ORIGIN = "https://ferjetider.fyi";
export const SITE_NAME = "Ferjetider Bergen-Stavanger";

export type SeoPageKey = "home" | "mot_stavanger" | RouteKey;

export interface SeoSection {
  heading: string;
  paragraphs: string[];
}

export interface SeoLink {
  path: string;
  label: string;
}

export interface SeoPage {
  key: SeoPageKey;
  path: string;
  title: string;
  description: string;
  heading: string;
  sections: SeoSection[];
  /**
   * Direction pages fix the direction the app opens in. Samband pages leave it
   * to the visitor, so their URL stays put when the direction is switched.
   */
  travelDirection?: TravelDirectionKey;
}

function crossingMinutes(routeKey: RouteKey): number {
  return ROUTE_MAP[routeKey].directions[0].crossingMinutes;
}

const BOKNAFJORDEN = crossingMinutes("arsvagen_mortavika");
const LANGENUEN = crossingMinutes("halhjem_sandvikvag");

const DRIVE_TEXT = `ca. ${Math.floor(DRIVE_BETWEEN_SAMBAND_MINUTES / 60)} t ${DRIVE_BETWEEN_SAMBAND_MINUTES % 60} min`;

const E39_SECTION: SeoSection = {
  heading: "To ferjer på E39 mellom Bergen og Stavanger",
  paragraphs: [
    `Kjører du E39 mellom Bergen og Stavanger, tar du to ferjer: Halhjem–Sandvikvåg over Langenuen (ca. ${LANGENUEN} min) og Arsvågen–Mortavika over Boknafjorden (ca. ${BOKNAFJORDEN} min). Mellom Sandvikvåg og Arsvågen er det ${DRIVE_TEXT} kjøring via Stord og Aksdal.`,
    "Ferjetider viser neste avganger på begge sambandene i sanntid fra Entur, med forsinkelser og innstilte avganger. Trykk på ferjen du tar, så regner siden ut hvilken ferje du rekker på det andre sambandet.",
  ],
};

export const SEO_PAGES: SeoPage[] = [
  {
    key: "home",
    path: "/",
    title: "Ferjetider mot Bergen: Mortavika–Arsvågen og Sandvikvåg–Halhjem",
    description:
      "Neste ferje mot Bergen på E39: live avganger Mortavika–Arsvågen og Sandvikvåg–Halhjem fra Entur, med forsinkelser, innstillinger og reiseplan.",
    heading: "Ferjetider på E39 mot Bergen",
    travelDirection: "mot_bergen",
    sections: [E39_SECTION],
  },
  {
    key: "mot_stavanger",
    path: "/mot-stavanger",
    title: "Ferjetider mot Stavanger: Halhjem–Sandvikvåg og Arsvågen–Mortavika",
    description:
      "Neste ferje mot Stavanger på E39: live avganger Halhjem–Sandvikvåg og Arsvågen–Mortavika fra Entur, med forsinkelser, innstillinger og reiseplan.",
    heading: "Ferjetider på E39 mot Stavanger",
    travelDirection: "mot_stavanger",
    sections: [E39_SECTION],
  },
  {
    key: "arsvagen_mortavika",
    path: "/arsvagen-mortavika",
    title: "Ferje Arsvågen–Mortavika: neste avganger i sanntid",
    description: `Ferjetider Arsvågen–Mortavika over Boknafjorden på E39. Live avganger begge veier, overfart ca. ${BOKNAFJORDEN} min, med forsinkelser og innstilte avganger.`,
    heading: "Ferje Arsvågen–Mortavika",
    sections: [
      {
        heading: "Om sambandet Arsvågen–Mortavika",
        paragraphs: [
          `Arsvågen–Mortavika krysser Boknafjorden og er E39-ferjen mellom Bokn og Rennesøy, nord for Stavanger. Overfarten tar ca. ${BOKNAFJORDEN} minutter, og ferjene går hele døgnet.`,
          "Mot Bergen tar du ferjen fra Mortavika til Arsvågen. Mot Stavanger går den fra Arsvågen til Mortavika. Avgangene over er hentet fra Entur og oppdateres hvert minutt.",
        ],
      },
      E39_SECTION,
    ],
  },
  {
    key: "halhjem_sandvikvag",
    path: "/halhjem-sandvikvag",
    title: "Ferje Halhjem–Sandvikvåg: neste avganger i sanntid",
    description: `Ferjetider Halhjem–Sandvikvåg over Langenuen på E39. Live avganger begge veier, overfart ca. ${LANGENUEN} min, med forsinkelser og innstilte avganger.`,
    heading: "Ferje Halhjem–Sandvikvåg",
    sections: [
      {
        heading: "Om sambandet Halhjem–Sandvikvåg",
        paragraphs: [
          `Halhjem–Sandvikvåg krysser Langenuen og er E39-ferjen mellom Os sør for Bergen og Fitjar på Stord. Overfarten tar ca. ${LANGENUEN} minutter.`,
          "Mot Stavanger tar du ferjen fra Halhjem til Sandvikvåg. Mot Bergen går den fra Sandvikvåg til Halhjem. Avgangene over er hentet fra Entur og oppdateres hvert minutt.",
        ],
      },
      E39_SECTION,
    ],
  },
];

export const SEO_PAGE_MAP = Object.fromEntries(
  SEO_PAGES.map((page) => [page.key, page]),
) as Record<SeoPageKey, SeoPage>;

/** Links every page carries to the others, so crawlers can reach them all. */
export const SEO_LINKS: SeoLink[] = [
  { path: "/", label: "Ferjetider mot Bergen" },
  { path: "/mot-stavanger", label: "Ferjetider mot Stavanger" },
  { path: "/arsvagen-mortavika", label: "Arsvågen–Mortavika" },
  { path: "/halhjem-sandvikvag", label: "Halhjem–Sandvikvåg" },
];

function normalisePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function findSeoPage(pathname: string): SeoPage | undefined {
  const path = normalisePath(pathname);
  return SEO_PAGES.find((page) => page.path === path);
}

export function directionPage(travelDirection: TravelDirectionKey): SeoPage {
  return travelDirection === "mot_stavanger"
    ? SEO_PAGE_MAP.mot_stavanger
    : SEO_PAGE_MAP.home;
}

export function pageUrl(page: SeoPage, origin = SITE_ORIGIN): string {
  return `${origin}${page.path}`;
}

export function buildJsonLd(page: SeoPage, origin = SITE_ORIGIN): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: SITE_NAME,
        url: `${origin}/`,
        inLanguage: "nb-NO",
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl(page, origin)}#webpage`,
        url: pageUrl(page, origin),
        name: page.title,
        description: page.description,
        inLanguage: "nb-NO",
        isPartOf: { "@id": `${origin}/#website` },
      },
    ],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The page text as static HTML, for the build to put in each page before the
 * app loads. The app renders the same heading (in its header) and the same
 * sections (`SeoContent`), so crawlers see the same text with or without
 * JavaScript.
 */
export function renderSeoContentHtml(page: SeoPage): string {
  const sections = page.sections
    .map(
      (section) =>
        `<div><h2>${escapeHtml(section.heading)}</h2>` +
        section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("") +
        `</div>`,
    )
    .join("");
  const links = SEO_LINKS.filter((link) => link.path !== page.path)
    .map((link) => `<li><a href="${link.path}">${escapeHtml(link.label)}</a></li>`)
    .join("");

  return (
    `<h1>${escapeHtml(page.heading)}</h1>` +
    `<section class="about">${sections}` +
    `<nav aria-label="Flere ferjetider"><ul>${links}</ul></nav>` +
    `</section>`
  );
}

export function buildSitemapXml(lastModified: string, origin = SITE_ORIGIN): string {
  const entries = SEO_PAGES.map((page) =>
    [
      "  <url>",
      `    <loc>${escapeHtml(pageUrl(page, origin))}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      "  </url>",
    ].join("\n"),
  ).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobotsTxt(origin = SITE_ORIGIN): string {
  return ["User-agent: *", "Allow: /", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");
}

function replaceAttribute(html: string, pattern: RegExp, value: string): string {
  if (!pattern.test(html)) {
    throw new Error(`prerender: ${pattern} not found in index.html`);
  }
  return html.replace(pattern, (_match, before: string) => `${before}${escapeHtml(value)}"`);
}

/** Bakes a page's metadata and text into the built index.html. */
export function prerenderPage(template: string, page: SeoPage, origin = SITE_ORIGIN): string {
  const url = pageUrl(page, origin);
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);

  for (const [attr, value] of [
    ['name="description"', page.description],
    ['property="og:title"', page.title],
    ['property="og:description"', page.description],
    ['property="og:url"', url],
    ['name="twitter:title"', page.title],
    ['name="twitter:description"', page.description],
  ] as const) {
    html = replaceAttribute(html, new RegExp(`(${attr}\\s+content=")[^"]*"`), value);
  }
  html = replaceAttribute(html, /(rel="canonical"\s+href=")[^"]*"/, url);

  const jsonLd = buildJsonLd(page, origin).replace(/</g, "\\u003c");
  return html
    .replace(
      /(<script id="schema-jsonld" type="application\/ld\+json">)(<\/script>)/,
      (_match, open: string, close: string) => `${open}${jsonLd}${close}`,
    )
    .replace('<div id="root"></div>', () => `<div id="root">${renderSeoContentHtml(page)}</div>`);
}
