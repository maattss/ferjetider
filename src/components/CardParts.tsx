import type { JSX } from "react";
import { useRef, type ReactNode } from "react";
import type { TravelDirectionRoute } from "@/config/routes";
import type { UseDeparturesResult } from "@/hooks/useDepartures";
import type { ServiceAlert } from "@/types/departures";
import { AlertIcon, ArrowRightIcon } from "@/components/Icons";

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
  step,
  query,
  action,
}: {
  route: TravelDirectionRoute;
  /** Where this leg sits in the trip, e.g. "Første ferje". */
  step: string;
  query: UseDeparturesResult;
  action?: ReactNode;
}): JSX.Element {
  const alerts = query.data?.alerts ?? [];
  return (
    <header className="card-head">
      <div className="card-title">
        <p className="card-step">{step}</p>
        <h2 className="card-route">
          {/* Real spaces, so a narrow head can wrap after the arrow. */}
          {route.fromLabel}{" "}
          <span className="route-arrow">
            <ArrowRightIcon size={20} />
          </span>
          <span className="sr-only">til</span> {route.toLabel}
        </h2>
      </div>
      <div className="card-actions">
        <DataStatus query={query} />
        <AlertInfo alerts={alerts} />
        {action}
      </div>
    </header>
  );
}

/**
 * A small pill in the card head rather than a banner, so an alert never
 * pushes the departures down; the message opens in a dialog on tap.
 */
function AlertInfo({ alerts }: { alerts: ReadonlyArray<ServiceAlert | string> }): JSX.Element | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (alerts.length === 0) {
    return null;
  }
  const items = alerts.map((raw) =>
    typeof raw === "string" ? { summary: raw, description: null } : raw,
  );

  return (
    <>
      <button
        type="button"
        className="pill-button info-pill"
        onClick={() => dialogRef.current?.showModal()}
      >
        <AlertIcon size={20} />
        <span className="info-label">
          Trafikkinfo{items.length > 1 ? ` (${items.length})` : ""}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className="info-dialog"
        aria-label="Trafikkinfo"
        // A tap on the backdrop lands on the dialog element itself.
        onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      >
        <ul>
          {items.map((alert) => (
            <li key={`${alert.summary}-${alert.description ?? ""}`}>
              <strong>{alert.summary}</strong>
              {alert.description && <p>{alert.description}</p>}
            </li>
          ))}
        </ul>
        <form method="dialog">
          <button type="submit" className="pill-button">
            Lukk
          </button>
        </form>
      </dialog>
    </>
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
