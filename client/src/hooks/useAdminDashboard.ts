import { useQuery } from "@tanstack/react-query";

type AdminDashboardResponse = {
  entity: { id: string; name: string };
  snapshot: {
    totals: { users: number; vehicles: number; trips: number };
    activeTrips: number;
    reservationsToday: number;
    revenueToday: number;
    revenueMonth: number;
    incidentsOpen: number;
  };
  trends: Array<{ day: string; reservations: number; revenue: number }>;
  predictions: Array<{ day: string; reservations: number; revenue: number; forecast: number }>;
  anomalyAlerts: Array<{ date: string; message: string }>;
  multiEntities: Array<{ id: string; name: string; reservationsToday: number; incidents: number }>;
  mode: "normal" | "crisis";
  crisisActions: string[];
  alerts: Array<{ type: string; message: string; severity: string }>;
  incidents: Array<{
    id: string;
    type: string;
    description: string;
    created_at: string | null;
    statut: string | null;
  }>;
};

export function useAdminDashboard(entity = "national") {
  return useQuery<AdminDashboardResponse>({
    queryKey: ["/api/admin/dashboard", entity],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard?entity=${entity}`);
      if (!res.ok) {
        throw new Error("Impossible de charger le tableau de bord");
      }
      return res.json();
    },
  });
}
