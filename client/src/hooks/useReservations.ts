import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Reservation } from "@shared/schema";

export function useReservations() {
  return useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
  });
}

export function useCreateReservation() {
  return useMutation({
    mutationFn: async (data: { 
      trip_id: string; 
      nombre_places: number;
      numero_siege?: string;
      montant_total?: string;
    }) => {
      const res = await apiRequest("POST", "/api/reservations", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });
}

export function useCancelReservation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/reservations/${id}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });
}
