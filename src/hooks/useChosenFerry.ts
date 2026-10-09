import { useCallback, useEffect, useState } from "react";
import type { TravelDirectionKey } from "@/config/routes";
import { readStorage, writeStorage } from "@/lib/storage";
import type { Departure } from "@/types/departures";

interface ChosenEnvelope {
  departure: Departure;
  expiresAtMs: number;
}

function storageKey(travelDirection: TravelDirectionKey): string {
  return `ferjetider:chosen:${travelDirection}`;
}

function load(travelDirection: TravelDirectionKey): ChosenEnvelope | null {
  const raw = readStorage(storageKey(travelDirection));
  if (!raw) {
    return null;
  }
  try {
    const envelope = JSON.parse(raw) as ChosenEnvelope;
    if (!envelope.departure?.aimedDepartureTimeIso || !(envelope.expiresAtMs > Date.now())) {
      return null;
    }
    return envelope;
  } catch {
    return null;
  }
}

/**
 * The first ferry the driver tapped. Kept (and persisted, so a reload in the
 * car does not lose it) after that ferry sails, until they should have reached
 * the second quay — that stretch is exactly when the plan matters most.
 */
export function useChosenFerry(travelDirection: TravelDirectionKey, now: Date) {
  const [chosen, setChosen] = useState<ChosenEnvelope | null>(() => load(travelDirection));

  const choose = useCallback(
    (departure: Departure | null, expiresAtMs = 0) => {
      const next = departure ? { departure, expiresAtMs } : null;
      setChosen(next);
      writeStorage(storageKey(travelDirection), next ? JSON.stringify(next) : null);
    },
    [travelDirection],
  );

  const expired = chosen !== null && chosen.expiresAtMs <= now.getTime();

  useEffect(() => {
    if (expired) {
      choose(null);
    }
  }, [expired, choose]);

  return { chosen: expired ? null : (chosen?.departure ?? null), choose };
}
