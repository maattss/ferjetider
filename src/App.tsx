import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  TRAVEL_DIRECTIONS,
  TRAVEL_DIRECTION_MAP,
  type TravelDirectionKey,
  isTravelDirectionKey,
} from "@/config/routes";
import { DeparturePanel } from "@/components/DeparturePanel";
import { TrafficAlerts } from "@/components/TrafficAlerts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrafficAlerts } from "@/hooks/useTrafficAlerts";

function FerryIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 64 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Hull */}
      <path d="M6 22 L58 22 L54 30 L10 30 Z" fill="currentColor" opacity="0.9" />
      {/* Car deck */}
      <rect x="10" y="15" width="42" height="8" rx="1" fill="currentColor" opacity="0.8" />
      {/* Superstructure */}
      <rect x="16" y="8" width="26" height="8" rx="1.5" fill="currentColor" opacity="0.7" />
      {/* Wheelhouse */}
      <rect x="22" y="3" width="14" height="6" rx="1.5" fill="currentColor" opacity="0.65" />
      {/* Funnel */}
      <rect x="29" y="0" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
      {/* Car deck windows */}
      <rect x="13" y="17" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="20" y="17" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="40" y="17" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="47" y="17" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      {/* Superstructure windows */}
      <rect x="19" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="25" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="31" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="37" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
      {/* Wheelhouse windows */}
      <rect x="25" y="4.5" width="3" height="2.5" rx="0.5" fill="currentColor" opacity="0.22" />
      <rect x="31" y="4.5" width="3" height="2.5" rx="0.5" fill="currentColor" opacity="0.22" />
      {/* Bow ramp */}
      <path d="M58 22 L62 25 L58 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

const DEFAULT_TRAVEL_DIRECTION = TRAVEL_DIRECTIONS[0].key;
const DEFAULT_SITE_ORIGIN = "https://ferjetider.fyi";

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
  const [travelDirectionKey, setTravelDirectionKey] =
    useState<TravelDirectionKey>(DEFAULT_TRAVEL_DIRECTION);
  const [siteOrigin, setSiteOrigin] = useState(DEFAULT_SITE_ORIGIN);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSiteOrigin(window.location.origin);

    const params = new URLSearchParams(window.location.search);
    const tdParam = params.get("travelDirection");

    if (tdParam && isTravelDirectionKey(tdParam)) {
      setTravelDirectionKey(tdParam);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("travelDirection") === travelDirectionKey) {
      return;
    }

    params.set("travelDirection", travelDirectionKey);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [travelDirectionKey]);

  const currentUrl = useMemo(
    () => `${siteOrigin}/?travelDirection=${travelDirectionKey}`,
    [siteOrigin, travelDirectionKey],
  );

  const travelDirection = TRAVEL_DIRECTION_MAP[travelDirectionKey];

  const seoTitle = useMemo(
    () => `Ferjetider ${travelDirection.label} | Bergen-Stavanger`,
    [travelDirection],
  );

  const seoDescription = useMemo(
    () =>
      `Live ferjetider ${travelDirection.label.toLowerCase()} på E39. Viser neste avganger fra ${travelDirection.routes.map((r) => r.fromLabel).join(" og ")} med sanntidsoppdatering.`,
    [travelDirection],
  );

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
              "Live ferjetider og fergeruter for Arsvågen-Mortavika og Halhjem-Sandvikvåg på E39.",
            keywords:
              "ferjetider, fergetider, ferjeruter, fergeruter, ferje, ferge, Arsvågen, Mortavika, Halhjem, Sandvikvåg, Bergen, Stavanger, E39",
          },
          {
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Hvilke ferjesamband vises på siden?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Siden viser Arsvågen-Mortavika og Halhjem-Sandvikvåg i begge retninger på E39 mellom Bergen og Stavanger.",
                },
              },
              {
                "@type": "Question",
                name: "Når går neste ferje fra Arsvågen til Mortavika?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Se sanntidsavganger for Arsvågen-Mortavika direkte på ferjetider.fyi. Siden oppdateres automatisk hvert minutt med live-data.",
                },
              },
              {
                "@type": "Question",
                name: "Når går neste ferje fra Halhjem til Sandvikvåg?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Se sanntidsavganger for Halhjem-Sandvikvåg direkte på ferjetider.fyi. Siden oppdateres automatisk hvert minutt med live-data.",
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
              {
                "@type": "Question",
                name: "Hva er fergetider for E39?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "E39-sambandene Arsvågen-Mortavika og Halhjem-Sandvikvåg trafikkeres av Fjord1. Avgangene varierer, men ferjer går vanligvis hvert 20.-30. minutt i rushtiden. Se sanntidsavganger på ferjetider.fyi.",
                },
              },
            ],
          },
        ],
      }),
    [siteOrigin],
  );

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

  const { alerts, isLoading: alertsLoading } = useTrafficAlerts();

  return (
    <>
      <main className="h-screen overflow-hidden bg-background p-3 text-foreground flex flex-col gap-3">
        <header className="flex items-center justify-between rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,hsl(215_55%_9%),hsl(210_50%_7%))] px-5 py-3 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-primary/60">
                Ferjetider
              </p>
              <h1 className="text-xl font-bold tracking-tight">Bergen–Stavanger</h1>
            </div>
            <FerryIcon className="h-8 w-12 text-primary/65 animate-bob" />
          </div>
          <p className="text-sm text-muted-foreground">
            Arsvågen ↔ Mortavika · Halhjem ↔ Sandvikvåg
          </p>
        </header>

        <TrafficAlerts alerts={alerts} isLoading={alertsLoading} />

        <Tabs
          value={travelDirectionKey}
          onValueChange={(nextValue) => {
            if (isTravelDirectionKey(nextValue)) {
              setTravelDirectionKey(nextValue);
            }
          }}
          className="flex-1 min-h-0 flex flex-col gap-3"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-secondary p-1.5 shrink-0">
            {TRAVEL_DIRECTIONS.map((td) => (
              <TabsTrigger
                key={td.key}
                value={td.key}
                className="h-auto rounded-xl py-3 text-base font-semibold leading-tight data-[state=active]:bg-card data-[state=active]:shadow-none"
              >
                {td.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TRAVEL_DIRECTIONS.map((td) => (
            <TabsContent
              key={td.key}
              value={td.key}
              className="flex-1 min-h-0 mt-0 grid grid-cols-2 gap-3 data-[state=inactive]:hidden"
              forceMount
            >
              {td.routes.map((route) => (
                <DeparturePanel
                  key={`${route.routeKey}-${route.directionKey}`}
                  routeKey={route.routeKey}
                  directionKey={route.directionKey}
                  fromLabel={route.fromLabel}
                  toLabel={route.toLabel}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Analytics />

      {/* Ocean wave decoration */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 overflow-hidden" aria-hidden="true">
        <div className="animate-wave-scroll flex" style={{ width: "200%" }}>
          <svg viewBox="0 0 1440 64" fill="none" className="h-16 w-1/2 shrink-0">
            <path d="M0 32C240 8 480 56 720 32C960 8 1200 56 1440 32V64H0Z" fill="hsl(200 85% 58% / 0.07)" />
            <path d="M0 44C180 22 360 66 540 44C720 22 900 66 1080 44C1260 22 1440 44 1440 44V64H0Z" fill="hsl(200 85% 58% / 0.04)" />
          </svg>
          <svg viewBox="0 0 1440 64" fill="none" className="h-16 w-1/2 shrink-0">
            <path d="M0 32C240 8 480 56 720 32C960 8 1200 56 1440 32V64H0Z" fill="hsl(200 85% 58% / 0.07)" />
            <path d="M0 44C180 22 360 66 540 44C720 22 900 66 1080 44C1260 22 1440 44 1440 44V64H0Z" fill="hsl(200 85% 58% / 0.04)" />
          </svg>
        </div>
      </div>
    </>
  );
}
