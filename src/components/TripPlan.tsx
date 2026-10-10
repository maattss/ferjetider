import { Alerts, CardHead, LoadError } from "@/components/CardParts";
import { DepartureList } from "@/components/DepartureList";
import type { TravelDirectionRoute } from "@/config/routes";
import type { UseDeparturesResult } from "@/hooks/useDepartures";
import { TIGHT_MARGIN_MS, type TripConnection } from "@/lib/trip";
import { formatOsloTime } from "@/lib/time";
import type { Departure } from "@/types/departures";

interface TripPlanProps {
  route: TravelDirectionRoute;
  query: UseDeparturesResult;
  departures: Departure[];
  connection: TripConnection | null;
  now: Date;
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
}): JSX.Element {
  return (
    <div className="row fact">
      <span className="fact-label">{label}</span>
      <span className={`fact-value tabular ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

/** The second leg, answered as "which ferry do I make?" rather than a timetable. */
export function TripPlan({
  route,
  query,
  departures,
  connection,
  now,
}: TripPlanProps): JSX.Element {
  const head = (
    <>
      <CardHead route={route} query={query} />
      <Alerts alerts={query.data?.alerts ?? []} />
    </>
  );

  // No first ferry to plan from yet: show the plain timetable instead.
  if (!connection) {
    return (
      <section className="card">
        {head}
        {query.error !== null && query.data === null && !query.isLoading ? (
          <LoadError query={query} />
        ) : (
          <DepartureList departures={departures.slice(0, 4)} isLoading={query.isLoading} now={now} />
        )}
      </section>
    );
  }

  const { second, atSecondQuayMs, marginMs } = connection;
  const quayTime = formatOsloTime(atSecondQuayMs);

  if (!second) {
    return (
      <section className="card">
        {head}
        {query.error !== null && query.data === null && !query.isLoading ? (
          <LoadError query={query} />
        ) : (
          <div className="hero">
            <div className="hero-sub">
              {query.isLoading
                ? "Henter avganger…"
                : `Ingen kjente avganger etter ${quayTime}`}
            </div>
          </div>
        )}
        <div className="rows">
          <Fact label="På kaia ca." value={quayTime} />
        </div>
      </section>
    );
  }

  const isTight = marginMs !== null && marginMs < TIGHT_MARGIN_MS;
  const marginMin = marginMs === null ? 0 : Math.round(marginMs / 60_000);
  const secondMs = new Date(second.departureTimeIso).getTime();
  const nextAfter = departures.find(
    (d) => !d.cancelled && new Date(d.departureTimeIso).getTime() > secondMs,
  );

  return (
    <section className="card">
      {head}
      <div className={`hero ${isTight ? "tight" : "catch"}`}>
        <div className="hero-figure">
          <span className="hero-num tabular">{second.displayTime}</span>
          <span className="hero-unit">{isTight ? "knapt" : "du rekker"}</span>
        </div>
        <div className="hero-sub">
          {second.realtime ? "sanntid" : "rutetid"} · beregnet fra ferja du tar
        </div>
      </div>
      <div className="rows">
        <Fact label="På kaia ca." value={quayTime} />
        <Fact label="Margin" value={`${marginMin} min`} tone={isTight ? "warn" : "ok"} />
        <Fact label={`Fremme ${route.toLabel}`} value={`~${formatOsloTime(second.arrivalTimeIso)}`} />
        {nextAfter && <Fact label="Neste etter" value={nextAfter.displayTime} tone="muted" />}
      </div>
    </section>
  );
}
