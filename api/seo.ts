import type { VercelRequest } from "@vercel/node";

const INDEXABLE_PATHS = [
  "/",
  "/?route=arsvagen_mortavika&direction=arsvagen_to_mortavika",
  "/?route=arsvagen_mortavika&direction=mortavika_to_arsvagen",
  "/?route=halhjem_sandvikvag&direction=halhjem_to_sandvikvag",
  "/?route=halhjem_sandvikvag&direction=sandvikvag_to_halhjem",
];

function readHeader(
  headerValue: string | string[] | undefined,
  fallback = "",
): string {
  if (Array.isArray(headerValue)) {
    return headerValue[0] || fallback;
  }

  return headerValue || fallback;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getBaseUrl(req: VercelRequest): string {
  const host = readHeader(req.headers["x-forwarded-host"], readHeader(req.headers.host));
  const protoHeader = readHeader(req.headers["x-forwarded-proto"], "https");
  const proto = protoHeader.split(",")[0]?.trim() || "https";

  if (!host) {
    return "https://ferjetider.fyi";
  }

  return `${proto}://${host}`;
}

export function buildSitemapXml(baseUrl: string): string {
  const origin = trimTrailingSlash(baseUrl);
  const lastModified = new Date().toISOString();

  const entries = INDEXABLE_PATHS.map((path) => {
    const url = `${origin}${path}`;

    return [
      "  <url>",
      `    <loc>${escapeXml(url)}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      "    <changefreq>hourly</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
  ].join("\n");
}

export function buildRobotsTxt(baseUrl: string): string {
  const origin = trimTrailingSlash(baseUrl);

  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
  ].join("\n");
}
