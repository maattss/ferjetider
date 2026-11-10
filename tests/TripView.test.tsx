import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TripView } from "../src/components/TripView";
import { TRAVEL_DIRECTION_MAP } from "../src/config/routes";
import type { Departure } from "../src/types/departures";
import { MIN, NOW, freezeClock, okResponse, payload, sailing } from "./helpers";

const MOT_BERGEN = TRAVEL_DIRECTION_MAP.mot_bergen;
const CHOSEN_KEY = "ferjetider:chosen:mot_bergen";

/** First leg Mortavika→Arsvågen (28 min), then 100 min drive, then Sandvikvåg→Halhjem. */
function serve(first: Departure[], second: Departure[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const direction = new URL(url, "http://x").searchParams.get("direction");
      return direction === "mortavika_to_arsvagen"
        ? okResponse(payload("arsvagen_mortavika", "mortavika_to_arsvagen", first))
        : okResponse(payload("halhjem_sandvikvag", "sandvikvag_to_halhjem", second));
    }),
  );
}

function renderTrip(now: Date = NOW) {
  return render(<TripView travelDirection={MOT_BERGEN} now={now} />);
}

describe("TripView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    freezeClock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("plans from the next ferry to the first second ferry with boarding margin", async () => {
    // Lands at 38, reaches Sandvikvåg at 138. 140 leaves too little margin.
    serve(
      [sailing(10, { label: "10:10" }), sailing(25, { label: "10:25" })],
      [
        sailing(140, { crossing: 45, label: "12:20" }),
        sailing(150, { crossing: 45, label: "12:30" }),
        sailing(180, { crossing: 45, label: "13:00" }),
      ],
    );

    renderTrip();

    expect(await screen.findByText("du rekker")).toBeInTheDocument();
    expect(screen.getByText("12:30", { selector: ".hero-num" })).toBeInTheDocument();
    expect(screen.getByText("12 min")).toBeInTheDocument();
  });

  it("re-plans from a tapped later ferry and can reset", async () => {
    serve(
      [sailing(10, { label: "10:10" }), sailing(40, { label: "10:40" })],
      [
        sailing(150, { crossing: 45, label: "12:30" }),
        sailing(200, { crossing: 45, label: "13:20" }),
      ],
    );

    renderTrip();
    fireEvent.click(await screen.findByRole("button", { name: /10:40/ }));

    // Lands at 68, at the quay at 168: the 12:30 is gone, the 13:20 is next.
    expect(await screen.findByText("13:20", { selector: ".hero-num" })).toBeInTheDocument();
    expect(window.localStorage.getItem(CHOSEN_KEY)).toContain(sailing(40).aimedDepartureTimeIso);

    fireEvent.click(screen.getByRole("button", { name: "Nullstill" }));
    expect(await screen.findByText("12:30", { selector: ".hero-num" })).toBeInTheDocument();
  });

  it("drops a chosen ferry that has since been cancelled", async () => {
    const chosen = sailing(40, { label: "10:40" });
    window.localStorage.setItem(
      CHOSEN_KEY,
      JSON.stringify({ departure: chosen, expiresAtMs: NOW.getTime() + 300 * MIN }),
    );
    serve(
      [sailing(10, { label: "10:10" }), { ...chosen, cancelled: true }],
      [sailing(150, { crossing: 45, label: "12:30" }), sailing(200, { crossing: 45, label: "13:20" })],
    );

    renderTrip();

    expect(await screen.findByText("12:30", { selector: ".hero-num" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nullstill" })).not.toBeInTheDocument();
  });

  it("keeps planning from a chosen ferry that has left the feed", async () => {
    // Sailed 20 minutes ago and is still crossing; the feed no longer lists it.
    const chosen = sailing(-20, { label: "09:40" });
    window.localStorage.setItem(
      CHOSEN_KEY,
      JSON.stringify({ departure: chosen, expiresAtMs: NOW.getTime() + 300 * MIN }),
    );
    serve(
      [sailing(10, { label: "10:10" })],
      // Lands at 8, at the quay at 108.
      [sailing(120, { crossing: 45, label: "12:00" }), sailing(150, { crossing: 45, label: "12:30" })],
    );

    renderTrip();

    expect(await screen.findByText("Underveis")).toBeInTheDocument();
    expect(screen.getByText("12:00", { selector: ".hero-num" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nullstill" })).toBeInTheDocument();
  });

  it("says so when no known second ferry leaves late enough", async () => {
    serve([sailing(10, { label: "10:10" })], [sailing(60, { crossing: 45, label: "11:00" })]);

    renderTrip();

    await waitFor(() =>
      expect(screen.getByText(/Ingen kjente avganger etter/)).toBeInTheDocument(),
    );
  });
});
