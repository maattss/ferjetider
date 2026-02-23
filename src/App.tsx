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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";

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

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(204_50%_96%),_hsl(0_0%_99%))] px-3 py-4 text-foreground">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Ferjetider</h1>
            <p className="text-sm text-muted-foreground">Bergen-Stavanger</p>
          </header>

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
            <TabsList className="grid w-full grid-cols-2">
              {ROUTES.map((route) => (
                <TabsTrigger key={route.key} value={route.key} className="text-xs sm:text-sm">
                  {route.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={routeKey}>
              <div className="rounded-lg border border-border/70 bg-card/80 p-3 shadow-sm">
                <ToggleGroup
                  type="single"
                  value={directionKey}
                  onValueChange={(nextValue) => {
                    if (nextValue) {
                      setDirectionKey(nextValue as DirectionKey);
                    }
                  }}
                  className="grid w-full grid-cols-2 gap-2"
                >
                  {routeConfig.directions.map((direction) => (
                    <ToggleGroupItem
                      key={direction.key}
                      value={direction.key}
                      className="h-auto whitespace-normal px-2 py-2 text-xs"
                      aria-label={direction.label}
                    >
                      {direction.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>

                <div className="mt-3 text-xs text-muted-foreground">
                  {selectedDirection ? (
                    <span>
                      Fra {selectedDirection.fromLabel} til {selectedDirection.toLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <StatusBar
                    updatedAt={data?.updatedAt}
                    error={error}
                    isFallback={isFallback}
                    isFetching={isFetching}
                    onRefresh={refetch}
                  />
                </div>

                <Separator className="my-3" />

                <DepartureList departures={data?.departures ?? []} isLoading={isLoading} />
              </div>
            </TabsContent>
          </Tabs>

          <section
            aria-labelledby="ferjeinfo"
            className="rounded-lg border border-border/70 bg-card/70 p-3 text-sm leading-relaxed text-foreground"
          >
            <h2 id="ferjeinfo" className="text-base font-semibold">
              Ferjetider for Arsvågen, Mortavika, Halhjem og Sandvikvåg
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Denne siden samler de viktigste ferjesambandene mellom Bergen og
              Stavanger i én enkel visning. Du kan bytte samband og retning,
              og se de neste avgangene med sanntidsdata.
            </p>
            <h3 className="mt-3 text-sm font-semibold">Vanlige spørsmål</h3>
            <dl className="mt-1 space-y-2 text-xs text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Hvor ofte oppdateres tidene?</dt>
                <dd>Hvert 60. sekund, samt når du åpner fanen igjen.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Vises begge retninger?</dt>
                <dd>Ja, både Arsvågen↔Mortavika og Halhjem↔Sandvikvåg.</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
      <Analytics />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
    </>
  );
}
