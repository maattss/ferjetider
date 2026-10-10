import type { ReactNode } from "react";
import type { TravelDirectionRoute } from "@/config/routes";
import type { UseDeparturesResult } from "@/hooks/useDepartures";

/** Live data is the normal case, so only say something when it is not. */
function DataStatus({ query }: { query: UseDeparturesResult }): JSX.Element | null {
  if (query.isFallback) {
    return <span className="data-status warn">Lagrede data</span>;
  }
  if (query.error !== null && query.data === null && !query.isLoading) {
    return <span className="data-status err">Ingen kontakt</span>;
  }
  return null;
}

export function CardHead({
  route,
  query,
  action,
}: {
  route: TravelDirectionRoute;
  query: UseDeparturesResult;
  action?: ReactNode;
}): JSX.Element {
  return (
    <header className="card-head">
      <h2 className="card-route">
        {route.fromLabel}
        <span className="route-arrow" aria-hidden="true">
          →
        </span>
        <span className="sr-only">til</span>
        {route.toLabel}
      </h2>
      <DataStatus query={query} />
      {action}
    </header>
  );
}

export function Alerts({ alerts }: { alerts: string[] }): JSX.Element | null {
  if (alerts.length === 0) {
    return null;
  }
  return (
    <ul className="alerts" aria-label="Driftsmeldinger">
      {alerts.map((alert) => (
        <li key={alert}>{alert}</li>
      ))}
    </ul>
  );
}

export function LoadError({ query }: { query: UseDeparturesResult }): JSX.Element {
  return (
    <div className="load-error">
      <p>{query.error}</p>
      <button
        type="button"
        className="pill-button"
        onClick={() => void query.refetch()}
        disabled={query.isFetching}
      >
        {query.isFetching ? "Prøver…" : "Prøv igjen"}
      </button>
    </div>
  );
}
