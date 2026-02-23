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
const DEFAULT_SITE_ORIGIN = "https://ferjetider.vercel.app";

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
      <main className="min-h-screen bg-background px-3 py-5 text-foreground sm:py-8">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <header className="px-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Sanntidsferjer E39
            </p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">
              Bergen–Stavanger
            </h1>
          </header>

          <section className="rounded-2xl border border-border/90 bg-white/85 p-3 shadow-[0_14px_36px_-28px_rgba(15,95,143,0.65)] backdrop-blur">
            <Tabs
              value={travelDirectionKey}
              onValueChange={(nextValue) => {
                if (isTravelDirectionKey(nextValue)) {
                  setTravelDirectionKey(nextValue);
                }
              }}
            >
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-secondary p-1">
                {TRAVEL_DIRECTIONS.map((td) => (
                  <TabsTrigger
                    key={td.key}
                    value={td.key}
                    className="h-auto rounded-lg px-2 py-2 text-xs font-semibold leading-tight data-[state=active]:bg-white data-[state=active]:shadow-none"
                  >
                    {td.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {TRAVEL_DIRECTIONS.map((td) => (
                <TabsContent key={td.key} value={td.key} className="mt-4 space-y-6">
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
