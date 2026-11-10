import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DirectionKey, RouteKey } from "@/config/routes";
import {
  buildCacheKey,
  loadDeparturesFromCache,
  saveDeparturesToCache,
} from "@/lib/storage";
import type { DeparturesErrorPayload, DeparturesResponse } from "@/types/departures";

const REFRESH_INTERVAL_MS = 60_000;
const GENERIC_ERROR = "Kunne ikke hente ferjetider akkurat nå.";

/**
 * Marks a message we wrote ourselves and are happy to show the user. Anything
 * else (a JSON parse failure, a network TypeError) carries a developer-facing
 * string that must not reach the page.
 */
class ApiError extends Error {}

interface UseDeparturesParams {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  limit?: number;
  /** Also list sailings from this many minutes back. */
  back?: number;
}

export interface UseDeparturesResult {
  data: DeparturesResponse | null;
  error: string | null;
  isLoading: boolean;
  isFetching: boolean;
  isFallback: boolean;
  refetch: () => Promise<void>;
}

/** The cached copy, marked as such, to show while live data loads. */
function cachedFallback(cacheKey: string): DeparturesResponse | null {
  const cached = loadDeparturesFromCache(cacheKey);
  return cached ? { ...cached, isFallback: true } : null;
}

export function useDepartures({
  routeKey,
  directionKey,
  limit = 6,
  back = 0,
}: UseDeparturesParams): UseDeparturesResult {
  const cacheKey = useMemo(
    () => buildCacheKey(routeKey, directionKey),
    [routeKey, directionKey],
  );

  const [data, setData] = useState<DeparturesResponse | null>(() => cachedFallback(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => data === null);
  const [isFetching, setIsFetching] = useState(false);
  const [isFallback, setIsFallback] = useState(() => data !== null);

  // A new route starts over from its own cached copy. Done during render, as
  // React recommends, so the old route's departures never paint under the new
  // route's name.
  const [shownKey, setShownKey] = useState(cacheKey);
  if (shownKey !== cacheKey) {
    const fallback = cachedFallback(cacheKey);
    setShownKey(cacheKey);
    setData(fallback);
    setError(null);
    setIsFallback(fallback !== null);
    setIsLoading(fallback === null);
  }

  const abortRef = useRef<AbortController | null>(null);

  const fetchDepartures = useCallback(
    async (background = false) => {
      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setIsFetching(true);
      if (!background) {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams({
          route: routeKey,
          direction: directionKey,
          limit: String(limit),
        });
        if (back > 0) {
          params.set("back", String(back));
        }

        const response = await fetch(`/api/departures?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          let message = `API-feil (${response.status})`;
          try {
            const payload = (await response.json()) as DeparturesErrorPayload;
            if (payload.error) {
              message = payload.error;
            }
          } catch {
            // Keep default fallback message.
          }
          throw new ApiError(message);
        }

        let payload: DeparturesResponse;
        try {
          payload = (await response.json()) as DeparturesResponse;
        } catch {
          throw new ApiError("Fikk et uventet svar fra serveren.");
        }

        setData(payload);
        setError(null);
        setIsFallback(false);
        saveDeparturesToCache(cacheKey, payload);
      } catch (fetchError) {
        if (abortController.signal.aborted) {
          return;
        }

        const cached = loadDeparturesFromCache(cacheKey);
        if (cached) {
          setData({ ...cached, isFallback: true });
          setIsFallback(true);
          setError("Live-data utilgjengelig. Viser sist lagrede avganger.");
          return;
        }

        setError(
          fetchError instanceof ApiError ? fetchError.message : GENERIC_ERROR,
        );
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [back, cacheKey, directionKey, limit, routeKey],
  );

  useEffect(() => {
    // With a cached copy on screen the first fetch can run in the background.
    // Flagging the request as in flight is the synchronous part; the data
    // itself comes back from the network, which is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDepartures(loadDeparturesFromCache(cacheKey) !== null);

    // A hidden tab needs no fresh data; the visibility handler below fetches
    // as soon as it is shown again.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchDepartures(true);
      }
    }, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchDepartures(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      abortRef.current?.abort();
    };
  }, [cacheKey, fetchDepartures]);

  const refetch = useCallback(() => fetchDepartures(false), [fetchDepartures]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isFallback,
    refetch,
  };
}
