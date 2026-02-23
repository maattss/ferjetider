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
import { StatusBar } from "@/components/StatusBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { formatMinutesLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

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

function setJsonLd(content: string): void {
  const script = document.getElementById("schema-jsonld");
  if (script) {
    script.textContent = content;
  } else if (import.meta.env.DEV) {
    console.warn("setJsonLd: <script id='schema-jsonld'> not found in document head.");
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
    setJsonLd(faqSchema);
  }, [currentUrl, faqSchema, seoDescription, seoTitle]);

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
      <main className="min-h-screen bg-background px-3 py-5 text-foreground sm:py-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <header className="rounded-2xl border border-border/90 bg-white/85 px-4 py-4 shadow-[0_10px_30px_-22px_rgba(15,95,143,0.75)] backdrop-blur">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Sanntidsferjer
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Ferjetider Bergen-Stavanger
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Arsvågen ↔ Mortavika og Halhjem ↔ Sandvikvåg
            </p>
          </header>

          <section className="rounded-2xl border border-border/90 bg-white/85 p-3 shadow-[0_14px_36px_-28px_rgba(15,95,143,0.65)] backdrop-blur">
            <Tabs
              value={routeKey}
              onValueChange={(nextValue) => {
                if (!isRouteKey(nextValue)) {
                  return;
                }

                setRouteKey(nextValue);
                setDirectionKey(defaultDirection(nextValue));
              }}
            >
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-secondary p-1">
                {ROUTES.map((route) => (
                  <TabsTrigger
                    key={route.key}
                    value={route.key}
                    className="h-auto rounded-lg px-2 py-2 text-xs font-semibold leading-tight data-[state=active]:bg-white data-[state=active]:shadow-none"
                  >
                    {route.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={routeKey}>
                <ToggleGroup
                  type="single"
                  value={directionKey}
                  onValueChange={(nextValue) => {
                    if (nextValue) {
                      setDirectionKey(nextValue as DirectionKey);
                    }
                  }}
                  className="mt-3 grid w-full grid-cols-2 gap-2"
                >
                  {routeConfig.directions.map((direction) => (
                    <ToggleGroupItem
                      key={direction.key}
                      value={direction.key}
                      className="h-auto rounded-xl border-border bg-white/70 px-2 py-2 text-[0.72rem] font-medium leading-tight data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      aria-label={direction.label}
                    >
                      {direction.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>

                {selectedDirection ? (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">
                    Fra {selectedDirection.fromLabel} til {selectedDirection.toLabel}
                  </p>
                ) : null}

                <div className="mt-3">
                  <StatusBar
                    updatedAt={data?.updatedAt}
                    error={error}
                    isFallback={isFallback}
                    isFetching={isFetching}
                    onRefresh={refetch}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(15,95,143,0.16),rgba(44,155,200,0.16))] p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary/90">
                    Neste avgang
                  </p>

                  {nextDeparture ? (
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-5xl font-semibold tabular-nums leading-none text-foreground">
                          {nextDeparture.displayTime}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          Til {nextDeparture.destination}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Kai: {nextDeparture.quay || "Ukjent"}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full border border-primary/30 bg-white/90 px-3 py-1 text-sm font-semibold text-primary">
                          {formatMinutesLabel(nextDeparture.minutesUntil)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
                            nextDeparture.realtime
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-white text-muted-foreground",
                          )}
                        >
                          {nextDeparture.realtime ? "Live" : "Planlagt"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isLoading
                        ? "Henter neste avganger..."
                        : "Ingen avganger funnet akkurat nå."}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Neste avganger</span>
                  <Separator className="flex-1" />
                </div>

                <div className="mt-2">
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
              </TabsContent>
            </Tabs>
          </section>

          <section className="rounded-2xl border border-border/90 bg-white/75 p-3 text-xs text-muted-foreground">
            <h2 className="text-sm font-semibold text-foreground">Om siden</h2>
            <p className="mt-1">
              Enkel visning inspirert av nesteferje.no, optimalisert for rask sjekk
              rett før avgang.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-foreground">
                Vanlige spørsmål
              </summary>
              <dl className="mt-2 space-y-1">
                <div>
                  <dt className="font-medium text-foreground">Hvor ofte oppdateres tidene?</dt>
                  <dd>Hvert 60. sekund og når fanen blir aktiv igjen.</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Vises begge retninger?</dt>
                  <dd>Ja, for begge sambandene.</dd>
                </div>
              </dl>
            </details>
          </section>
        </div>
      </main>

      <Analytics />
    </>
  );
}
