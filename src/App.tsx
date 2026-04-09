import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  TRAVEL_DIRECTIONS,
  TRAVEL_DIRECTION_MAP,
  type TravelDirectionKey,
  isTravelDirectionKey,
} from "@/config/routes";
import { DeparturePanel } from "@/components/DeparturePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  return (
    <>
      <main className="h-screen overflow-hidden bg-background p-3 text-foreground flex flex-col gap-3">
        <header className="flex items-center justify-between rounded-2xl border border-border/50 bg-card px-5 py-3 shrink-0">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-primary/60">
              Ferjetider
            </p>
            <h1 className="text-xl font-bold tracking-tight">Bergen–Stavanger</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Arsvågen ↔ Mortavika · Halhjem ↔ Sandvikvåg
          </p>
        </header>

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
    </>
  );
}
