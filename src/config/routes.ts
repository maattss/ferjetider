export const ROUTE_KEYS = ["arsvagen_mortavika", "halhjem_sandvikvag"] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

export const DIRECTION_KEYS = [
  "arsvagen_to_mortavika",
  "mortavika_to_arsvagen",
  "halhjem_to_sandvikvag",
  "sandvikvag_to_halhjem",
] as const;
export type DirectionKey = (typeof DIRECTION_KEYS)[number];

export interface DirectionConfig {
  key: DirectionKey;
  label: string;
  fromLabel: string;
  toLabel: string;
  fromStopPlaceId: string;
  toStopPlaceId: string;
  destinationAliases: string[];
}

export interface RouteConfig {
  key: RouteKey;
  label: string;
  directions: DirectionConfig[];
}

export const ROUTES: RouteConfig[] = [
  {
    key: "arsvagen_mortavika",
    label: "Arsvågen-Mortavika",
    directions: [
      {
        key: "arsvagen_to_mortavika",
        label: "Arsvågen → Mortavika",
        fromLabel: "Arsvågen",
        toLabel: "Mortavika",
        fromStopPlaceId: "NSR:StopPlace:58499",
        toStopPlaceId: "NSR:StopPlace:58653",
        destinationAliases: ["Mortavika"],
      },
      {
        key: "mortavika_to_arsvagen",
        label: "Mortavika → Arsvågen",
        fromLabel: "Mortavika",
        toLabel: "Arsvågen",
        fromStopPlaceId: "NSR:StopPlace:58653",
        toStopPlaceId: "NSR:StopPlace:58499",
        destinationAliases: ["Arsvågen", "Arsvagen"],
      },
    ],
  },
  {
    key: "halhjem_sandvikvag",
    label: "Halhjem-Sandvikvåg",
    directions: [
      {
        key: "halhjem_to_sandvikvag",
        label: "Halhjem → Sandvikvåg",
        fromLabel: "Halhjem",
        toLabel: "Sandvikvåg",
        fromStopPlaceId: "NSR:StopPlace:58463",
        toStopPlaceId: "NSR:StopPlace:58462",
        destinationAliases: ["Sandvikvåg", "Sandvikvag"],
      },
      {
        key: "sandvikvag_to_halhjem",
        label: "Sandvikvåg → Halhjem",
        fromLabel: "Sandvikvåg",
        toLabel: "Halhjem",
        fromStopPlaceId: "NSR:StopPlace:58462",
        toStopPlaceId: "NSR:StopPlace:58463",
        destinationAliases: ["Halhjem"],
      },
    ],
  },
];

export const ROUTE_MAP: Record<RouteKey, RouteConfig> = {
  arsvagen_mortavika: ROUTES[0],
  halhjem_sandvikvag: ROUTES[1],
};

export function isRouteKey(value: string): value is RouteKey {
  return ROUTE_KEYS.includes(value as RouteKey);
}

export function isDirectionKey(value: string): value is DirectionKey {
  return DIRECTION_KEYS.includes(value as DirectionKey);
}

export function getDirectionConfig(
  routeKey: RouteKey,
  directionKey: DirectionKey,
): DirectionConfig | undefined {
  return ROUTE_MAP[routeKey].directions.find((direction) => direction.key === directionKey);
}

// Travel directions group routes by overall travel direction (Bergen ↔ Stavanger)

export const TRAVEL_DIRECTION_KEYS = ["mot_bergen", "mot_stavanger"] as const;
export type TravelDirectionKey = (typeof TRAVEL_DIRECTION_KEYS)[number];

export interface TravelDirectionRoute {
  routeKey: RouteKey;
  directionKey: DirectionKey;
  fromLabel: string;
  toLabel: string;
}

export interface TravelDirectionConfig {
  key: TravelDirectionKey;
  label: string;
  routes: TravelDirectionRoute[];
}

export const TRAVEL_DIRECTIONS: TravelDirectionConfig[] = [
  {
    key: "mot_bergen",
    label: "Mot Bergen",
    routes: [
      {
        routeKey: "arsvagen_mortavika",
        directionKey: "arsvagen_to_mortavika",
        fromLabel: "Arsvågen",
        toLabel: "Mortavika",
      },
      {
        routeKey: "halhjem_sandvikvag",
        directionKey: "sandvikvag_to_halhjem",
        fromLabel: "Sandvikvåg",
        toLabel: "Halhjem",
      },
    ],
  },
  {
    key: "mot_stavanger",
    label: "Mot Stavanger",
    routes: [
      {
        routeKey: "arsvagen_mortavika",
        directionKey: "mortavika_to_arsvagen",
        fromLabel: "Mortavika",
        toLabel: "Arsvågen",
      },
      {
        routeKey: "halhjem_sandvikvag",
        directionKey: "halhjem_to_sandvikvag",
        fromLabel: "Halhjem",
        toLabel: "Sandvikvåg",
      },
    ],
  },
];

export const TRAVEL_DIRECTION_MAP: Record<TravelDirectionKey, TravelDirectionConfig> = {
  mot_bergen: TRAVEL_DIRECTIONS[0],
  mot_stavanger: TRAVEL_DIRECTIONS[1],
};

export function isTravelDirectionKey(value: string): value is TravelDirectionKey {
  return TRAVEL_DIRECTION_KEYS.includes(value as TravelDirectionKey);
}
