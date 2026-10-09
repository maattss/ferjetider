import type { TravelDirectionRoute } from "@/config/routes";
import { TIGHT_MARGIN_MS, type TripConnection } from "@/lib/trip";
import { formatOsloTime } from "@/lib/time";

interface TripPlanProps {
  firstRoute: TravelDirectionRoute;
  secondRoute: TravelDirectionRoute;
  connection: TripConnection | null;
  isChosen: boolean;
  /** Without second-leg data, a missing connection means "unknown", not "none". */
  secondStatus: "ready" | "loading" | "unavailable";
  driveMinutes: number;
  now: Date;
}

export function TripPlan({
  firstRoute,
  secondRoute,
  connection,
  isChosen,
  secondStatus,
  driveMinutes,
  now,
}: TripPlanProps): JSX.Element | null {
  if (!connection) {
    return null;
  }

  const { first, second, firstArrivalMs, atSecondQuayMs, marginMs } = connection;
  const firstSailed = new Date(first.departureTimeIso).getTime() < now.getTime();
  const marginMin = marginMs === null ? null : Math.round(marginMs / 60_000);
  const isTight = marginMs !== null && marginMs < TIGHT_MARGIN_MS;

  return (
    <section className="trip-plan" aria-label="Reiseplan">
      <div className="trip-head">
        <span className="trip-label">Reiseplan</span>
        <span className="trip-hint">
          {isChosen
            ? "Din valgte ferje · trykk den igjen for å nullstille"
            : "Tar du en senere ferje? Trykk på den i listen"}
        </span>
      </div>
      <ol className="trip-steps">
        <li className="trip-step">
          <span className="ts-time tabular">{first.displayTime}</span>
          <span className="ts-place">{firstRoute.fromLabel}</span>
          <span className="ts-note">{firstSailed ? "ferjen har gått" : "ferje"}</span>
        </li>
        <li className="trip-step">
          <span className="ts-time tabular">~{formatOsloTime(firstArrivalMs)}</span>
          <span className="ts-place">{firstRoute.toLabel}</span>
          <span className="ts-note">kjør ca. {driveMinutes} min</span>
        </li>
        <li className="trip-step">
          <span className="ts-time tabular">~{formatOsloTime(atSecondQuayMs)}</span>
          <span className="ts-place">{secondRoute.fromLabel}</span>
          <span className="ts-note">på kaia</span>
        </li>
        {second ? (
          <>
            <li className={`trip-step catch ${isTight ? "tight" : ""}`}>
              <span className="ts-time tabular">{second.displayTime}</span>
              <span className="ts-place">Du rekker</span>
              <span className="ts-note">
                {isTight ? `knapt · ${marginMin} min margin` : `${marginMin} min margin`}
              </span>
            </li>
            <li className="trip-step">
              <span className="ts-time tabular">~{formatOsloTime(second.arrivalTimeIso)}</span>
              <span className="ts-place">{secondRoute.toLabel}</span>
              <span className="ts-note">fremme</span>
            </li>
          </>
        ) : (
          <li className={`trip-step ${secondStatus === "loading" ? "" : "missing"}`}>
            <span className="ts-place">
              {secondStatus === "loading"
                ? "Henter avganger…"
                : secondStatus === "unavailable"
                  ? "Mangler data"
                  : "Ingen kjente avganger"}
            </span>
            <span className="ts-note">
              fra {secondRoute.fromLabel} etter {formatOsloTime(atSecondQuayMs)}
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}
