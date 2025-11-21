import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Trip } from "@shared/schema";

async function fetchTrips(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const message = (await res.text()) || "Impossible de charger les trajets";
    throw new Error(message);
  }
  return res.json();
}

export function useTrips(params?: { depart?: string; arrivee?: string; date?: Date }) {
  const queryParams = new URLSearchParams();
  if (params?.depart) queryParams.append("depart", params.depart);
  if (params?.arrivee) queryParams.append("arrivee", params.arrivee);
  if (params?.date) queryParams.append("date", params.date.toISOString());

  const queryString = queryParams.toString();
  const url = queryString ? `/api/trips?${queryString}` : "/api/trips";

  return useQuery<Trip[]>({
    queryKey: ["/api/trips", params],
    queryFn: () => fetchTrips(url),
  });
}

export function useTrip(id: string) {
  return useQuery<Trip>({
    queryKey: ["/api/trips", id],
  });
}

export function useChauffeurTrips() {
  return useQuery<Trip[]>({
    queryKey: ["/api/chauffeur/trips"],
  });
}

export function useUpdateTrip() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trip> }) => {
      const res = await apiRequest("PATCH", `/api/trips/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/trips"] });
    },
  });
}

export function useCreateTrip() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/trips", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });
}

export function useDeleteTrip() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/trips/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });
}
