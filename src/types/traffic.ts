export type AlertType = "closure" | "accident" | "roadworks" | "other";

export interface TrafficAlert {
  id: string;
  type: AlertType;
  description: string;
  validFrom?: string;
  validTo?: string;
}

export interface TrafficResponse {
  alerts: TrafficAlert[];
  fetchedAt: string;
}
