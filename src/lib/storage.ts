import type { DeparturesResponse } from "@/types/departures";

const CACHE_VERSION = 2;
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 6;

interface CacheEnvelope {
  version: number;
  savedAtIso: string;
  payload: DeparturesResponse;
}

export function buildCacheKey(routeKey: string, directionKey: string): string {
  return `ferjetider:${routeKey}:${directionKey}:v${CACHE_VERSION}`;
}

export function saveDeparturesToCache(
  key: string,
  payload: DeparturesResponse,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const envelope: CacheEnvelope = {
    version: CACHE_VERSION,
    savedAtIso: new Date().toISOString(),
    payload,
  };

  writeStorage(key, JSON.stringify(envelope));
}

export function loadDeparturesFromCache(key: string): DeparturesResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = readStorage(key);
  if (!rawValue) {
    return null;
  }

  try {
    const envelope = JSON.parse(rawValue) as CacheEnvelope;
    if (
      envelope.version !== CACHE_VERSION ||
      typeof envelope.savedAtIso !== "string" ||
      !envelope.payload
    ) {
      return null;
    }

    const age = Date.now() - new Date(envelope.savedAtIso).getTime();
    if (Number.isNaN(age) || age > MAX_CACHE_AGE_MS) {
      return null;
    }

    return envelope.payload;
  } catch {
    return null;
  }
}

/** localStorage throws in private mode or when blocked; treat that as empty. */
export function readStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Nothing to do: the page works without persistence.
  }
}
