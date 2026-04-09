import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  type DirectionKey,
  type RouteKey,
  ROUTES,
  ROUTE_MAP,
  getDirectionConfig,
  isRouteKey,
} from "@/config/routes";
import { useDepartures } from "@/hooks/useDepartures";
import { DepartureList } from "@/components/DepartureList";
import { formatMinutesLabel, formatOsloTime } from "@/lib/time";

const DEFAULT_ROUTE = ROUTES[0].key;
const DEFAULT_SITE_ORIGIN = "https://ferjetider.vercel.app";

function defaultDirection(routeKey: RouteKey): DirectionKey {
  return ROUTE_MAP[routeKey].directions[0].key;
}

function isDirectionForRoute(routeKey: RouteKey, candidate: string): candidate is DirectionKey {
  return ROUTE_MAP[routeKey].directions.some((direction) => direction.key === candidate);
}

function setMetaContent(selector: string, value: string): void {
  const meta = document.querySelector(selector);
  if (meta instanceof HTMLMetaElement) {
    meta.content = value;
  }
}

function setCanonicalUrl(url: string): void {
  const canonical = document.querySelector("link[rel='canonical']");
  if (canonical instanceof HTMLLinkElement) {
    canonical.href = url;
  }
}

export default function App(): JSX.Element {
  const [routeKey, setRouteKey] = useState<RouteKey>(DEFAULT_ROUTE);
  const [directionKey, setDirectionKey] = useState<DirectionKey>(
    defaultDirection(DEFAULT_ROUTE),
  );
  const [siteOrigin, setSiteOrigin] = useState(DEFAULT_SITE_ORIGIN);

  const routeConfig = ROUTE_MAP[routeKey];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSiteOrigin(window.location.origin);

    const params = new URLSearchParams(window.location.search);
    const routeParam = params.get("route");
    const directionParam = params.get("direction");

    if (!routeParam || !isRouteKey(routeParam)) {
      return;
    }

    const nextRouteKey = routeParam;
    const nextDirection =
      directionParam && isDirectionForRoute(nextRouteKey, directionParam)
        ? directionParam
        : defaultDirection(nextRouteKey);

    setRouteKey(nextRouteKey);
    setDirectionKey(nextDirection);
  }, []);

  useEffect(() => {
    if (!isDirectionForRoute(routeKey, directionKey)) {
      setDirectionKey(defaultDirection(routeKey));
    }
  }, [directionKey, routeKey]);

  const selectedDirection = useMemo(
    () => getDirectionConfig(routeKey, directionKey),
    [directionKey, routeKey],
  );

  const currentUrl = useMemo(
    () => `${siteOrigin}/?route=${routeKey}&direction=${directionKey}`,
    [directionKey, routeKey, siteOrigin],
  );

  const seoTitle = useMemo(() => {
    if (!selectedDirection) {
      return "Ferjetider Arsvågen-Mortavika og Halhjem-Sandvikvåg";
    }
    return `Ferjetider ${selectedDirection.label} | Bergen-Stavanger`;
  }, [selectedDirection]);

  const seoDescription = useMemo(() => {
    if (!selectedDirection) {
      return "Live ferjetider for Arsvågen-Mortavika og Halhjem-Sandvikvåg med sanntidsoppdateringer.";
    }
    return `Sjekk neste ferje fra ${selectedDirection.fromLabel} til ${selectedDirection.toLabel}. Viser de 6 neste avgangene med live oppdatering.`;
  }, [selectedDirection]);

  const faqSchema = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "Ferjetider Bergen-Stavanger",
            url: siteOrigin,
            inLanguage: "nb-NO",
            description:
              "Live ferjetider for Arsvågen-Mortavika og Halhjem-Sandvikvåg.",
          },
          {
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Hvilke samband vises på siden?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Siden viser Arsvågen-Mortavika og Halhjem-Sandvikvåg i begge retninger.",
                },
              },
              {
                "@type": "Question",
                name: "Hvor ofte oppdateres ferjetidene?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Ferjetidene oppdateres automatisk hvert minutt, og du kan også oppdatere manuelt.",
                },
              },
              {
                "@type": "Question",
                name: "Hva skjer hvis live-data ikke er tilgjengelig?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Siden viser sist lagrede avganger og markerer tydelig at data kan være utdaterte.",
                },
              },
            ],
          },
        ],
      }),
    [siteOrigin],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const routeInUrl = params.get("route");
    const directionInUrl = params.get("direction");

    if (routeInUrl === routeKey && directionInUrl === directionKey) {
      return;
    }

    params.set("route", routeKey);
    params.set("direction", directionKey);

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [directionKey, routeKey]);

  useEffect(() => {
    document.title = seoTitle;
    setMetaContent("meta[name='description']", seoDescription);
    setMetaContent("meta[property='og:title']", seoTitle);
    setMetaContent("meta[property='og:description']", seoDescription);
    setMetaContent("meta[property='og:url']", currentUrl);
    setMetaContent("meta[name='twitter:title']", seoTitle);
    setMetaContent("meta[name='twitter:description']", seoDescription);
    setCanonicalUrl(currentUrl);
  }, [currentUrl, seoDescription, seoTitle]);

  const { data, error, isFetching, isFallback, isLoading, refetch } = useDepartures({
    routeKey,
    directionKey,
    limit: 6,
  });

  const departures = data?.departures ?? [];
  const nextDeparture = departures[0];
  const laterDepartures = nextDeparture ? departures.slice(1) : departures;

  return (
    <>
      <main className="h-screen overflow-hidden bg-background text-foreground p-3 flex flex-col gap-3">
        {/* Header */}
        <header className="flex items-center justify-between rounded-2xl border border-border/50 bg-card px-5 py-3 shrink-0">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-primary/60">
              Sanntidsferjer
            </p>
            <h1 className="text-xl font-bold tracking-tight">
              Ferjetider Bergen–Stavanger
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {data?.updatedAt ? (
              <span className="text-xs text-muted-foreground">
                Oppdatert {formatOsloTime(data.updatedAt)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => { void refetch(); }}
              disabled={isFetching}
              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {isFetching ? "Oppdaterer..." : "Oppdater"}
            </button>
          </div>
        </header>

        {/* Route + Direction selectors */}
        <div className="flex gap-3 shrink-0">
          {/* Route toggle */}
          <div className="flex rounded-2xl bg-secondary p-1.5 gap-1.5">
            {ROUTES.map((route) => (
              <button
                key={route.key}
                type="button"
                onClick={() => {
                  setRouteKey(route.key);
                  setDirectionKey(defaultDirection(route.key));
                }}
                className={`rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                  routeKey === route.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {route.label}
              </button>
            ))}
          </div>

          {/* Direction toggle */}
          <div className="flex flex-1 rounded-2xl bg-secondary p-1.5 gap-1.5">
            {routeConfig.directions.map((direction) => (
              <button
                key={direction.key}
                type="button"
                onClick={() => setDirectionKey(direction.key)}
                className={`flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                  directionKey === direction.key
                    ? "bg-card text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {direction.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts (only when needed) */}
        {isFallback ? (
          <div className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300">
            Live-data utilgjengelig — viser sist lagrede avganger.
          </div>
        ) : null}
        {error && !isFallback ? (
          <div className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {/* Main content: 2-column */}
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px] gap-3">
          {/* Next departure — dominant left panel */}
          <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(202_50%_16%),hsl(218_35%_12%))] p-7 flex flex-col justify-between">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-primary/60">
              Neste avgang
            </p>

            {nextDeparture ? (
              <>
                <div>
                  <div
                    className="font-bold tabular-nums leading-none text-foreground"
                    style={{ fontSize: "clamp(5rem, 11vw, 9.5rem)" }}
                  >
                    {nextDeparture.displayTime}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-foreground/90">
                    Til {nextDeparture.destination}
                  </div>
                  <div className="mt-1 text-base text-muted-foreground">
                    Kai: {nextDeparture.quay || "Ukjent"}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className="font-bold tabular-nums text-primary"
                    style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
                  >
                    {formatMinutesLabel(nextDeparture.minutesUntil)}
                  </span>
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                      nextDeparture.realtime
                        ? "border border-primary/30 bg-primary/15 text-primary"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {nextDeparture.realtime ? "Live" : "Planlagt"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xl text-muted-foreground">
                {isLoading ? "Henter avganger..." : "Ingen avganger funnet."}
              </p>
            )}
          </div>

          {/* Later departures — right panel */}
          <div className="flex flex-col gap-2 min-h-0">
            <p className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground px-1">
              Neste avganger
            </p>
            <div className="flex-1 overflow-y-auto">
              <DepartureList
                departures={laterDepartures}
                isLoading={isLoading}
                emptyMessage={
                  nextDeparture
                    ? "Ingen flere avganger akkurat nå."
                    : "Ingen avganger funnet akkurat nå."
                }
              />
            </div>
          </div>
        </div>
      </main>

      <Analytics />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
    </>
  );
}
