import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DirectionKey, RouteKey } from "@/config/routes";
import {
  buildCacheKey,
  loadDeparturesFromCache,
  saveDeparturesToCache,
} from "@/lib/storage";
import type { DeparturesErrorPayload, DeparturesResponse } from "@/types/departures";

const REFRESH_INTERVAL_MS = 60_000;

interface UseDeparturesParams {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  limit?: number;
}

interface UseDeparturesResult {
  data: DeparturesResponse | null;
  error: string | null;
  isLoading: boolean;
  isFetching: boolean;
  isFallback: boolean;
  refetch: () => Promise<void>;
}

export function useDepartures({
  routeKey,
  directionKey,
  limit = 6,
}: UseDeparturesParams): UseDeparturesResult {
  const [data, setData] = useState<DeparturesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = useMemo(
    () => buildCacheKey(routeKey, directionKey),
    [routeKey, directionKey],
  );

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
          throw new Error(message);
        }

        const payload = (await response.json()) as DeparturesResponse;
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
          fetchError instanceof Error
            ? fetchError.message
            : "Kunne ikke hente ferjetider akkurat nå.",
        );
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [cacheKey, directionKey, limit, routeKey],
  );

  useEffect(() => {
    const cached = loadDeparturesFromCache(cacheKey);
    if (cached) {
      setData({ ...cached, isFallback: true });
      setIsFallback(true);
      setIsLoading(false);
    } else {
      setData(null);
      setIsFallback(false);
      setIsLoading(true);
    }

    void fetchDepartures(Boolean(cached));

    const timer = window.setInterval(() => {
      void fetchDepartures(true);
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

  return {
    data,
    error,
    isLoading,
    isFetching,
    isFallback,
    refetch: () => fetchDepartures(false),
  };
}
