import { useCallback, useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  DRIVE_BETWEEN_SAMBAND_MINUTES,
  TRAVEL_DIRECTIONS,
  TRAVEL_DIRECTION_MAP,
  type TravelDirectionKey,
  isTravelDirectionKey,
} from "@/config/routes";
import { FerryMark } from "@/components/Ferry";
import { SeoContent } from "@/components/SeoContent";
import { TripView } from "@/components/TripView";
import { useNow } from "@/hooks/useNow";
import { readStorage, writeStorage } from "@/lib/storage";
import { formatOsloTime } from "@/lib/time";
import {
  SEO_PAGE_MAP,
  buildJsonLd,
  directionPage,
  findSeoPage,
  pageUrl,
  type SeoPage,
} from "@/lib/seo";

const DEFAULT_TRAVEL_DIRECTION = TRAVEL_DIRECTIONS[0].key;
const DIRECTION_STORAGE_KEY = "ferjetider:travelDirection";

function initialPage(): SeoPage {
  if (typeof window === "undefined") {
    return SEO_PAGE_MAP.home;
  }
  return findSeoPage(window.location.pathname) ?? SEO_PAGE_MAP.home;
}

/**
 * A direction page's own direction wins, then an old shared
 * `?travelDirection=` link, then the direction last driven.
 */
function initialTravelDirection(page: SeoPage): TravelDirectionKey {
  if (page.travelDirection && page.key !== "home") {
    return page.travelDirection;
  }
  if (typeof window === "undefined") {
    return page.travelDirection ?? DEFAULT_TRAVEL_DIRECTION;
  }
  const fromUrl = new URLSearchParams(window.location.search).get("travelDirection");
  if (fromUrl && isTravelDirectionKey(fromUrl)) {
    return fromUrl;
  }
  const stored = readStorage(DIRECTION_STORAGE_KEY);
  return stored && isTravelDirectionKey(stored) ? stored : DEFAULT_TRAVEL_DIRECTION;
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
  const [landingPage] = useState(initialPage);
  const [travelDirectionKey, setTravelDirectionKey] = useState<TravelDirectionKey>(() =>
    initialTravelDirection(landingPage),
  );
  const [updatedAtByPanel, setUpdatedAtByPanel] = useState<
    Record<string, string>
  >({});
  const now = useNow();

  const handlePanelUpdated = useCallback(
    (panelKey: string, updatedAt: string | null) => {
      setUpdatedAtByPanel((previous) => {
        if (updatedAt === null) {
          if (!(panelKey in previous)) {
            return previous;
          }
          const next = { ...previous };
          delete next[panelKey];
          return next;
        }

        if (previous[panelKey] === updatedAt) {
          return previous;
        }

        return { ...previous, [panelKey]: updatedAt };
      });
    },
    [],
  );

  // Samband pages keep their URL whichever way you drive; the direction pages
  // swap between "/" and "/mot-stavanger".
  const page = landingPage.travelDirection
    ? directionPage(travelDirectionKey)
    : landingPage;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeStorage(DIRECTION_STORAGE_KEY, travelDirectionKey);

    // Old links carried the direction as a query parameter; the path says it now.
    const params = new URLSearchParams(window.location.search);
    params.delete("travelDirection");
    const query = params.toString();
    const nextUrl = query ? `${page.path}?${query}` : page.path;

    if (nextUrl === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    window.history.replaceState(null, "", nextUrl);
  }, [page, travelDirectionKey]);

  const travelDirection = TRAVEL_DIRECTION_MAP[travelDirectionKey];

  /**
   * The page is only as fresh as its stalest card, so report the oldest of the
   * two. Reads only the currently visible routes, so stamps left behind by the
   * other direction cannot make this look newer than it is.
   */
  const lastUpdated = useMemo(() => {
    const stamps = travelDirection.routes
      .map((route) => updatedAtByPanel[`${route.routeKey}-${route.directionKey}`])
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((time) => !Number.isNaN(time));

    return stamps.length > 0 ? new Date(Math.min(...stamps)) : null;
  }, [travelDirection, updatedAtByPanel]);

  useEffect(() => {
    const url = pageUrl(page);
    document.title = page.title;
    setMetaContent("meta[name='description']", page.description);
    setMetaContent("meta[property='og:title']", page.title);
    setMetaContent("meta[property='og:description']", page.description);
    setMetaContent("meta[property='og:url']", url);
    setMetaContent("meta[name='twitter:title']", page.title);
    setMetaContent("meta[name='twitter:description']", page.description);
    setCanonicalUrl(url);
    setJsonLd(buildJsonLd(page));
  }, [page]);

  return (
    <>
      <div className="page">
        <header className="topbar">
          <div className="brand">
            <FerryMark />
            <span className="brand-name">Ferjetider</span>
          </div>
          <div className="segment" role="group" aria-label="Reiseretning">
            {TRAVEL_DIRECTIONS.map((td) => {
              const isActive = travelDirectionKey === td.key;
              return (
                <button
                  key={td.key}
                  type="button"
                  aria-pressed={isActive}
                  className={isActive ? "active" : ""}
                  onClick={() => setTravelDirectionKey(td.key)}
                >
                  {td.label}
                </button>
              );
            })}
          </div>
          <span className="clock tabular">{formatOsloTime(now)}</span>
          <h1 className="sr-only">{page.heading}</h1>
        </header>

        <main className="main">
          <TripView
            key={travelDirectionKey}
            travelDirection={travelDirection}
            now={now}
            onUpdated={handlePanelUpdated}
          />

          <footer className="foot">
            <p>
              Sanntid fra Entur. Overfart ca. 28 min (Mortavika–Arsvågen) og 45 min
              (Sandvikvåg–Halhjem), med ca. {DRIVE_BETWEEN_SAMBAND_MINUTES} min kjøring
              imellom. Trykk på en avgang for å planlegge ut fra den.
            </p>
            <p className="tabular">
              {lastUpdated ? `Oppdatert ${formatOsloTime(lastUpdated)}` : "Henter data…"}
            </p>
          </footer>

          <SeoContent page={page} />
        </main>
      </div>

      <Analytics />
    </>
  );
}
