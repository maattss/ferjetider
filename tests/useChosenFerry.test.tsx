import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChosenFerry } from "../src/hooks/useChosenFerry";
import { MIN, NOW, freezeClock, sailing } from "./helpers";

const KEY = "ferjetider:chosen:mot_bergen";

describe("useChosenFerry", () => {
  beforeEach(() => {
    window.localStorage.clear();
    freezeClock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores the choice so a reload keeps it", () => {
    const ferry = sailing(10);
    const first = renderHook(() => useChosenFerry("mot_bergen", NOW));
    act(() => first.result.current.choose(ferry, NOW.getTime() + 60 * MIN));
    expect(first.result.current.chosen).toEqual(ferry);

    const reloaded = renderHook(() => useChosenFerry("mot_bergen", NOW));
    expect(reloaded.result.current.chosen).toEqual(ferry);
  });

  it("keeps each travel direction's choice apart", () => {
    const { result } = renderHook(() => useChosenFerry("mot_bergen", NOW));
    act(() => result.current.choose(sailing(10), NOW.getTime() + 60 * MIN));

    const other = renderHook(() => useChosenFerry("mot_stavanger", NOW));
    expect(other.result.current.chosen).toBeNull();
  });

  it("drops the choice once it expires, and forgets it in storage", () => {
    const expiresAtMs = NOW.getTime() + 30 * MIN;
    const { result, rerender } = renderHook(({ now }) => useChosenFerry("mot_bergen", now), {
      initialProps: { now: NOW },
    });
    act(() => result.current.choose(sailing(10), expiresAtMs));

    rerender({ now: new Date(expiresAtMs - 1) });
    expect(result.current.chosen).not.toBeNull();

    rerender({ now: new Date(expiresAtMs) });
    expect(result.current.chosen).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores an expired or broken stored choice", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ departure: sailing(10), expiresAtMs: NOW.getTime() - 1 }),
    );
    expect(renderHook(() => useChosenFerry("mot_bergen", NOW)).result.current.chosen).toBeNull();

    window.localStorage.setItem(KEY, "{not json");
    expect(renderHook(() => useChosenFerry("mot_bergen", NOW)).result.current.chosen).toBeNull();
  });

  it("clears the choice", () => {
    const { result } = renderHook(() => useChosenFerry("mot_bergen", NOW));
    act(() => result.current.choose(sailing(10), NOW.getTime() + 60 * MIN));
    act(() => result.current.choose(null));
    expect(result.current.chosen).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});
