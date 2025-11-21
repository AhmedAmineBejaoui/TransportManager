import { useQuery } from "@tanstack/react-query";

export type PredictiveInsights = {
  generatedAt: string;
  horizonDays: number;
  demandForecast: Array<{
    date: string;
    demand: number;
    confidence: number;
    drivers: { weather: number; events: number; search: number; seasonality: number };
  }>;
  pricingInsights: Array<{
    route: string;
    action: "augmenter" | "baisser" | "stabiliser";
    delta: number;
    occupancy: number;
    recommendedPrice: number;
    rationale: string;
    confidence: number;
  }>;
  maintenance: {
    fleetRiskIndex: number;
    vehicles: Array<{
      vehicleId: string;
      immatriculation: string;
      statut: string | null;
      incidents: number;
      riskScore: number;
      risk: string;
      avgOccupancy: number;
      nextCheck: string;
      recommendation: string;
    }>;
  };
  impactSimulations: Array<{
    id: string;
    title: string;
    expectedGain: string;
    cost: string;
    confidence: number;
    summary: string;
  }>;
  predictiveDashboard: {
    stressIndex: number;
    alerts: Array<{ id: string; severity: "low" | "medium" | "high"; message: string }>;
    opportunityWindows: Array<{ route: string; window: string; action: string; gainPotential: string }>;
  };
};

export function usePredictiveInsights() {
  return useQuery<PredictiveInsights>({
    queryKey: ["/api/ai/predictive-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/predictive-insights", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Impossible de charger les analyses pr\u00e9dictives");
      }
      return (await res.json()) as PredictiveInsights;
    },
    staleTime: 2 * 60 * 1000,
  });
}
