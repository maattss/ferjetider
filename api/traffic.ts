import type { VercelRequest, VercelResponse } from "@vercel/node";
import { XMLParser } from "fast-xml-parser";
import type { AlertType, TrafficAlert, TrafficResponse } from "../src/types/traffic.js";

const DATEX_ENDPOINT =
  "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi/GetSituation/pullsnapshotdata";

// Match E 39 or E39, case-insensitive
const E39_RE = /\bE\s?39\b/i;

function alertTypeFromXsiType(xsiType: string): AlertType {
  const t = xsiType.toLowerCase();
  if (t.includes("maintenance") || t.includes("roadwork")) return "roadworks";
  if (t.includes("accident")) return "accident";
  if (t.includes("closure") || t.includes("carriage") || t.includes("lane")) return "closure";
  return "other";
}

// Walk an unknown tree and pull out the first string value found
function firstString(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    for (const item of node) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  if (node && typeof node === "object") {
    for (const key of Object.keys(node as Record<string, unknown>)) {
      if (key.startsWith("@_")) continue;
      const s = firstString((node as Record<string, unknown>)[key]);
      if (s) return s;
    }
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseAlerts(xmlText: string): TrafficAlert[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => ["situation", "situationRecord", "generalPublicComment"].includes(name),
    textNodeName: "#text",
    parseAttributeValue: false,
    removeNSPrefix: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let root: any;
  try {
    root = parser.parse(xmlText);
  } catch {
    return [];
  }

  const situations: unknown[] =
    root?.d2LogicalModel?.payloadPublication?.situation ?? [];

  const alerts: TrafficAlert[] = [];

  for (const situation of situations) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = situation as any;
    const id: string = s["@_id"] ?? "unknown";

    for (const record of asArray(s.situationRecord)) {
      if (!record) continue;

      // Skip inactive situations
      const validityStatus: string = record?.validity?.validityStatus ?? "";
      if (validityStatus && validityStatus !== "active" && validityStatus !== "definedByContext") {
        continue;
      }

      // Extract Norwegian description
      const comments = asArray(record.generalPublicComment);
      let description = "";
      for (const comment of comments) {
        const text = firstString(comment?.comment?.values?.value ?? comment?.comment?.values);
        if (text) {
          description = text;
          break;
        }
      }

      if (!description) continue;

      // Only show E39 incidents
      if (!E39_RE.test(description)) continue;

      const xsiType: string = record["@_xsi:type"] ?? "";
      const type = alertTypeFromXsiType(xsiType);

      const timeSpec = record?.validity?.validityTimeSpecification;
      const validFrom: string | undefined = timeSpec?.overallStartTime;
      const validTo: string | undefined = timeSpec?.overallEndTime;

      alerts.push({ id, type, description, validFrom, validTo });
    }
  }

  return alerts;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<VercelResponse | void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Kun GET er støttet." });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const username = process.env.VEGVESEN_DATEX_USERNAME;
  const password = process.env.VEGVESEN_DATEX_PASSWORD;

  // Gracefully return empty when credentials are not configured
  if (!username || !password) {
    const empty: TrafficResponse = { alerts: [], fetchedAt: new Date().toISOString() };
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(empty);
  }

  try {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    const datexRes = await fetch(DATEX_ENDPOINT, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/xml, text/xml",
      },
    });

    if (!datexRes.ok) {
      throw new Error(`DATEX svarte med status ${datexRes.status}`);
    }

    const xmlText = await datexRes.text();
    const alerts = parseAlerts(xmlText);

    const response: TrafficResponse = { alerts, fetchedAt: new Date().toISOString() };
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(response);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Ukjent feil";
    return res.status(502).json({ error: `Trafikkvarsler utilgjengelig (${reason}).` });
  }
}
