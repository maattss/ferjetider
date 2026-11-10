import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDepartures } from "../src/hooks/useDepartures";
import { buildCacheKey, saveDeparturesToCache } from "../src/lib/storage";
import { errorResponse, okResponse, payload, sailing } from "./helpers";

const ROUTE = "arsvagen_mortavika" as const;
const DIRECTION = "arsvagen_to_mortavika" as const;
const live = payload(ROUTE, DIRECTION, [sailing(10)]);

function renderDepartures(props: Partial<Parameters<typeof useDepartures>[0]> = {}) {
  return renderHook((p: Parameters<typeof useDepartures>[0]) => useDepartures(p), {
    initialProps: { routeKey: ROUTE, directionKey: DIRECTION, ...props },
  });
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
}

describe("useDepartures", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads live data, asks for the right sailings and caches them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(live));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderDepartures({ limit: 20, back: 180 });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.departures).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(false);

    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://x");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("back")).toBe("180");
    expect(window.localStorage.getItem(buildCacheKey(ROUTE, DIRECTION))).toContain("T10");
  });

  it("falls back to the cached copy when the API fails", async () => {
    saveDeparturesToCache(buildCacheKey(ROUTE, DIRECTION), live);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(502, { error: "nede" })));

    const { result } = renderDepartures();

    // The cached copy shows at once, before the request settles.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFallback).toBe(true);
    await waitFor(() => expect(result.current.error).toContain("sist lagrede"));
    expect(result.current.data?.departures).toHaveLength(1);
  });

  it("shows the API's own message when there is nothing cached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(502, { error: "Kunne ikke hente live-data" })),
    );

    const { result } = renderDepartures();

    await waitFor(() => expect(result.current.error).toBe("Kunne ikke hente live-data"));
    expect(result.current.data).toBeNull();
  });

  it("keeps developer-facing network errors off the page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { result } = renderDepartures();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).not.toContain("Failed to fetch");
  });

  it("aborts the old request when the direction changes", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        signals.push(init.signal as AbortSignal);
        return new Promise(() => {});
      }),
    );

    const { rerender } = renderDepartures();
    rerender({ routeKey: ROUTE, directionKey: "mortavika_to_arsvagen" });

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("does not poll while the tab is hidden, and fetches when it is shown", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(okResponse(live));
    vi.stubGlobal("fetch", fetchMock);

    renderDepartures();
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    setVisibility("hidden");
    await act(async () => vi.advanceTimersByTimeAsync(180_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
