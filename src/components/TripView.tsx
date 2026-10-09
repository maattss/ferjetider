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
  // The connection can be two hours out, past the first handful of sailings.
  const secondQuery = useDepartures({
    routeKey: secondRoute.routeKey,
    directionKey: secondRoute.directionKey,
    limit: 12,
  });

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
    <>
      <TripPlan
        firstRoute={firstRoute}
        secondRoute={secondRoute}
        connection={connection}
        isChosen={chosenStillSails}
        driveMinutes={DRIVE_BETWEEN_SAMBAND_MINUTES}
        now={now}
      />
      <div className="cards">
        <DeparturePanel
          route={firstRoute}
          query={firstQuery}
          now={now}
          chosenId={chosenStillSails && first ? departureId(first) : null}
          onSelect={handleSelect}
          onUpdated={onUpdated}
        />
        <DeparturePanel
          route={secondRoute}
          query={secondQuery}
          now={now}
          catchId={connection?.second ? departureId(connection.second) : null}
          onUpdated={onUpdated}
        />
      </div>
    </>
  );
}
