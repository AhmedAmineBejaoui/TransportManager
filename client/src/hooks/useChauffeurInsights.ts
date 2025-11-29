import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ChauffeurStats = {
  totalTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  distanceKm: number;
};

export type ChauffeurIncident = {
  id: string;
  chauffeur_id: string;
  trip_id?: string | null;
  type: string;
  description: string;
  gravite: string | null;
  statut: string | null;
  created_at: string | null;
};

export function useChauffeurStats() {
  return useQuery<ChauffeurStats>({
    queryKey: ["/api/chauffeur/stats"],
  });
}

export function useChauffeurIncidents() {
  return useQuery<ChauffeurIncident[]>({
    queryKey: ["/api/chauffeur/incidents"],
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; description: string; trip_id?: string; gravite?: string }) => {
      const res = await fetch("/api/chauffeur/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}
