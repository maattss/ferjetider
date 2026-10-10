import { useEffect } from "react";
import {
  DRIVE_BETWEEN_SAMBAND_MINUTES,
  type TravelDirectionConfig,
} from "@/config/routes";
import { DeparturePanel } from "@/components/DeparturePanel";
import { TripPlan } from "@/components/TripPlan";
import { useChosenFerry } from "@/hooks/useChosenFerry";
import { useDepartures } from "@/hooks/useDepartures";
import { upcomingDepartures } from "@/lib/departures";
import {
  BOARDING_MARGIN_MS,
  departureId,
  firstSailing,
  planConnection,
} from "@/lib/trip";
import type { Departure } from "@/types/departures";

const DRIVE_MS = DRIVE_BETWEEN_SAMBAND_MINUTES * 60_000;

interface TripViewProps {
  travelDirection: TravelDirectionConfig;
  now: Date;
  onUpdated?: (panelKey: string, updatedAt: string | null) => void;
}

export function TripView({
  travelDirection,
  now,
  onUpdated,
}: TripViewProps): JSX.Element {
  const [firstRoute, secondRoute] = travelDirection.routes;

  const firstQuery = useDepartures({
    routeKey: firstRoute.routeKey,
    directionKey: firstRoute.directionKey,
    limit: 7,
  });
  // The connection is often 3 hours out, more if a later first ferry is
  // chosen; at daytime 15-minute headways that is well past a dozen sailings.
  const secondQuery = useDepartures({
    routeKey: secondRoute.routeKey,
    directionKey: secondRoute.directionKey,
    limit: 30,
  });

  const firstUpdatedAt = firstQuery.data?.updatedAt ?? null;
  const secondUpdatedAt = secondQuery.data?.updatedAt ?? null;
  useEffect(() => {
    onUpdated?.(`${firstRoute.routeKey}-${firstRoute.directionKey}`, firstUpdatedAt);
  }, [onUpdated, firstRoute, firstUpdatedAt]);
  useEffect(() => {
    onUpdated?.(`${secondRoute.routeKey}-${secondRoute.directionKey}`, secondUpdatedAt);
  }, [onUpdated, secondRoute, secondUpdatedAt]);

  const { chosen, choose } = useChosenFerry(travelDirection.key, now);

  const firstDepartures = upcomingDepartures(firstQuery.data?.departures ?? [], now);
  const secondDepartures = upcomingDepartures(secondQuery.data?.departures ?? [], now);

  // Prefer the live copy of the chosen sailing so a new delay shows up; once it
  // has sailed it drops out of the feed and the stored copy carries the plan.
  const liveChosen = chosen
    ? firstDepartures.find((d) => departureId(d) === departureId(chosen))
    : undefined;
  const chosenStillSails = chosen !== null && !(liveChosen?.cancelled ?? false);
  const first: Departure | undefined = chosenStillSails
    ? (liveChosen ?? chosen)
    : firstSailing(firstDepartures);

  const connection = first ? planConnection(first, secondDepartures, DRIVE_MS) : null;

  const handleSelect = (departure: Departure) => {
    if (chosen && departureId(chosen) === departureId(departure)) {
      choose(null);
      return;
    }
    const plan = planConnection(departure, secondDepartures, DRIVE_MS);
    const expiresAtMs = plan
      ? plan.atSecondQuayMs + BOARDING_MARGIN_MS
      : new Date(departure.arrivalTimeIso).getTime() + DRIVE_MS;
    choose(departure, expiresAtMs);
  };

  return (
    <div className="board">
      <DeparturePanel
        route={firstRoute}
        query={firstQuery}
        departures={firstDepartures}
        now={now}
        target={first}
        chosenId={chosenStillSails && first ? departureId(first) : null}
        onSelect={handleSelect}
        onReset={chosenStillSails ? () => choose(null) : undefined}
      />
      <TripPlan
        route={secondRoute}
        query={secondQuery}
        departures={secondDepartures}
        connection={connection}
        now={now}
      />
    </div>
  );
}
