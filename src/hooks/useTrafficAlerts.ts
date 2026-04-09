import { useCallback, useEffect, useRef, useState } from "react";
import type { TrafficAlert } from "@/types/traffic";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — incidents change slowly

interface UseTrafficAlertsResult {
  alerts: TrafficAlert[];
  isLoading: boolean;
  error: string | null;
}

export function useTrafficAlerts(): UseTrafficAlertsResult {
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/traffic");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { alerts?: TrafficAlert[]; error?: string };
      if (data.error) throw new Error(data.error);
      setAlerts(data.alerts ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();
    intervalRef.current = setInterval(() => void fetchAlerts(), POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchAlerts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAlerts]);

  return { alerts, isLoading, error };
}
