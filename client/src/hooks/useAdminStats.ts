import { useQuery } from "@tanstack/react-query";

export type AdminStatsKpi = {
  value: number;
  trend: number;
};

export type AdminStatsResponse = {
  totalUsers: number;
  totalVehicles: number;
  activeTrips: number;
  totalTrips: number;
  snapshot: {
    totals: { users: number; vehicles: number; trips: number };
    activeTrips: number;
    reservationsToday: number;
    revenueToday: number;
    revenueMonth: number;
    incidentsOpen: number;
  };
  kpis: {
    fillRate: AdminStatsKpi;
    punctuality: AdminStatsKpi;
    criticalAlerts: AdminStatsKpi;
  };
  activity: Array<{ day: string; reservations: number }>;
  revenueSeries: Array<{ day: string; revenue: number }>;
  occupancyBuckets: Array<{ id: string; label: string; count: number }>;
  vehicleStatusCounts: Array<{ status: string; count: number }>;
  incidentTypeCounts: Array<{ type: string; count: number }>;
  trend: {
    deltaPercent: number;
    direction: "up" | "down" | "flat";
  };
  systemAlerts: Array<{
    id: string;
    message: string;
    severity: "info" | "warning" | "critical";
  }>;
};

export function useAdminStats() {
  return useQuery<AdminStatsResponse>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Impossible de charger les statistiques");
      }
      return res.json();
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
