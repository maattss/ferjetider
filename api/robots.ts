import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildRobotsTxt, getBaseUrl } from "./seo";

export default function handler(req: VercelRequest, res: VercelResponse): VercelResponse {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const baseUrl = getBaseUrl(req);
  const robotsTxt = buildRobotsTxt(baseUrl);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400");

  return res.status(200).send(robotsTxt);
}
