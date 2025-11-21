import { useMutation, useQuery } from "@tanstack/react-query";

export type OptimizationHeatmapEntry = {
  routeLabel: string;
  depart: string;
  arrivee: string;
  occupancy: number;
  avgPrice: number;
  demand: number;
  demandConfidence: number;
  capacity: number;
  reserved: number;
  geoZone: string;
  vehicleCount: number;
};

export type OptimizationKPIs = {
  averageOccupancy: number;
  unmetDemand: number;
  balanceScore: number;
};

export type OptimizationSuggestion = {
  routeFrom: string;
  routeTo: string;
  recommendedStart: string;
  narrative: string;
  reason: string;
  priority: number;
  confidence: number;
  ruleId?: string;
  autoApply?: boolean;
  metadata?: Record<string, unknown>;
};

export type OptimizationRuleDto = {
  id: string;
  name: string;
  enabled: boolean;
  route_pattern: string | null;
  threshold: string | number | null;
  auto_apply: boolean;
  min_rest_hours: number | null;
  service_window: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type OptimizationRuleDraft = {
  id?: string;
  name: string;
  route_pattern: string;
  threshold?: number;
  auto_apply?: boolean;
  enabled: boolean;
  min_rest_hours?: number;
  service_window?: string;
  metadata?: Record<string, unknown>;
};

export type OptimizationDashboardResponse = {
  horizonDays: number;
  heatmap: OptimizationHeatmapEntry[];
  kpis: OptimizationKPIs;
  demandForecast: Array<Record<string, unknown>>;
  loadFactors: Array<Record<string, unknown>>;
  rules: OptimizationRuleDto[];
  suggestions: OptimizationSuggestion[];
  storedRecommendations: Array<Record<string, unknown>>;
};

export type OptimizationSimulationPayload = {
  horizonDays?: number;
  overrides?: OptimizationRuleDraft[];
};

export type OptimizationSimulationResponse = Omit<OptimizationDashboardResponse, "storedRecommendations">;

export type OptimizationOrchestrationResponse = {
  rules: OptimizationRuleDto[];
};

const OPTIMIZATION_ENDPOINT = "/api/optimization/recommendations";

export function useOptimizationDashboard(horizonDays?: number) {
  return useQuery<OptimizationDashboardResponse>({
    queryKey: [OPTIMIZATION_ENDPOINT, horizonDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (horizonDays) {
        params.set("horizonDays", horizonDays.toString());
      }
      const query = params.toString();
      const url = query ? `${OPTIMIZATION_ENDPOINT}?${query}` : OPTIMIZATION_ENDPOINT;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Impossible de charger les données d'optimisation");
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useOptimizationSimulation() {
  return useMutation<OptimizationSimulationResponse, Error, OptimizationSimulationPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/optimization/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Impossible de simuler la configuration");
      }
      return res.json();
    },
  });
}

export function useOptimizationOrchestration() {
  return useMutation<OptimizationOrchestrationResponse, Error, OptimizationRuleDraft[]>({
    mutationFn: async (rules) => {
      const res = await fetch("/api/optimization/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) {
        throw new Error("Impossible d'enregistrer les règles d'orchestration");
      }
      return res.json();
    },
  });
}
