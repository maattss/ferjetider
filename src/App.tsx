import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  TRAVEL_DIRECTIONS,
  TRAVEL_DIRECTION_MAP,
  type TravelDirectionKey,
  isTravelDirectionKey,
} from "@/config/routes";
import { DeparturePanel } from "@/components/DeparturePanel";
import { SeaScene } from "@/components/SeaScene";
import { useNow } from "@/hooks/useNow";
import { formatOsloTime } from "@/lib/time";

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
  const [reducedMotion, setReducedMotion] = useState(false);
  const now = useNow();

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

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
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
      <div className="page">
        <header className="hero">
          <SeaScene reducedMotion={reducedMotion} />
          <div className="hero-overlay">
            <div className="hero-inner">
              <div className="topbar">
                <div className="brand">
                  <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
                    <path d="M 2 14 L 4 17 L 18 17 L 20 14 Z" fill="currentColor" />
                    <rect x="5" y="9" width="12" height="5" fill="currentColor" />
                    <rect
                      x="9"
                      y="5"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.6"
                    />
                  </svg>
                  <span>Ferjetider</span>
                </div>
                <div className="topbar-meta">
                  <span className="sambandlist">
                    Mortavika ↔ Arsvågen · Sandvikvåg ↔ Halhjem
                  </span>
                  <span className="clock tabular">{formatOsloTime(now)}</span>
                </div>
              </div>
              <h1 className="hero-title">
                Ferjeavganger på <em>E39</em>
                <br />
                mellom Stavanger &amp; Bergen
              </h1>
            </div>
          </div>
        </header>

        <div className="direction-bar">
          <div className="direction-inner">
            <div className="dir-label">Jeg skal</div>
            <div className="dir-switch" role="tablist" aria-label="Reiseretning">
              {TRAVEL_DIRECTIONS.map((td) => {
                const isActive = travelDirectionKey === td.key;
                const arrow = td.key === "mot_bergen" ? "↑" : "↓";
                return (
                  <button
                    key={td.key}
                    role="tab"
                    aria-selected={isActive}
                    className={isActive ? "active" : ""}
                    onClick={() => setTravelDirectionKey(td.key)}
                  >
                    <span className="dir-arrow">{arrow}</span>
                    {td.label}
                  </button>
                );
              })}
            </div>
            <div className="dir-meta">
              <span className="status-line">
                <span className="dot ok"></span>Sanntidsdata fra Entur
              </span>
            </div>
          </div>
        </div>

        <main className="main">
          <div className="cards">
            {travelDirection.routes.map((route) => (
              <DeparturePanel
                key={`${route.routeKey}-${route.directionKey}`}
                routeKey={route.routeKey}
                directionKey={route.directionKey}
                fromLabel={route.fromLabel}
                toLabel={route.toLabel}
                sambandName={route.sambandName}
                fromRegion={route.fromRegion}
                now={now}
              />
            ))}
          </div>

          <section className="legend">
            <div>
              <div className="legend-title">Om ferjetider</div>
              <p>
                Sanntids avgangstider for de to ferjesambandene som knytter E39
                mellom Stavanger og Bergen. Reisetid Mortavika–Arsvågen er
                omtrent 25 minutter, Sandvikvåg–Halhjem omtrent 40.
              </p>
            </div>
          </section>

          <footer className="foot">
            <div>Ferjetider · E39 Boknafjorden &amp; Langenuen</div>
            <div className="tabular">oppdatert {formatOsloTime(now)}</div>
          </footer>
        </main>
      </div>

      <Analytics />
    </>
  );
}
