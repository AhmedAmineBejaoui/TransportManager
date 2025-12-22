import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ChauffeurEvent,
  ChauffeurLeave,
  ChauffeurUnavailability,
  InsertChauffeurEvent,
  InsertChauffeurLeave,
  InsertChauffeurUnavailability,
} from "@shared/schema";

// ==================== EVENTS ====================
export function useChauffeurEvents() {
  return useQuery<ChauffeurEvent[]>({
    queryKey: ["/api/chauffeur/events"],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/events", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des événements");
      return res.json();
    },
  });
}

export function useCreateChauffeurEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertChauffeurEvent, "chauffeur_id">) => {
      const res = await fetch("/api/chauffeur/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors de la création de l'événement");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/events"] });
    },
  });
}

export function useUpdateChauffeurEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ChauffeurEvent> }) => {
      const res = await fetch(`/api/chauffeur/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors de la mise à jour");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/events"] });
    },
  });
}

export function useDeleteChauffeurEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chauffeur/events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/events"] });
    },
  });
}

// ==================== LEAVES (CONGÉS) ====================
export function useChauffeurLeaves() {
  return useQuery<ChauffeurLeave[]>({
    queryKey: ["/api/chauffeur/leaves"],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/leaves", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des congés");
      return res.json();
    },
  });
}

export function useCreateChauffeurLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertChauffeurLeave, "chauffeur_id">) => {
      const res = await fetch("/api/chauffeur/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors de la demande de congé");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/leaves"] });
    },
  });
}

export function useCancelChauffeurLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chauffeur/leaves/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de l'annulation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/leaves"] });
    },
  });
}

// ==================== UNAVAILABILITIES ====================
export function useChauffeurUnavailabilities() {
  return useQuery<ChauffeurUnavailability[]>({
    queryKey: ["/api/chauffeur/unavailabilities"],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/unavailabilities", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des indisponibilités");
      return res.json();
    },
  });
}

export function useCreateChauffeurUnavailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertChauffeurUnavailability, "chauffeur_id">) => {
      const res = await fetch("/api/chauffeur/unavailabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors du signalement d'indisponibilité");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/unavailabilities"] });
    },
  });
}

export function useDeleteChauffeurUnavailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chauffeur/unavailabilities/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/unavailabilities"] });
    },
  });
}

// ==================== COMBINED CALENDAR DATA ====================
export function useChauffeurCalendarData() {
  const eventsQuery = useChauffeurEvents();
  const leavesQuery = useChauffeurLeaves();
  const unavailabilitiesQuery = useChauffeurUnavailabilities();

  return {
    events: eventsQuery.data ?? [],
    leaves: leavesQuery.data ?? [],
    unavailabilities: unavailabilitiesQuery.data ?? [],
    isLoading: eventsQuery.isLoading || leavesQuery.isLoading || unavailabilitiesQuery.isLoading,
    isError: eventsQuery.isError || leavesQuery.isError || unavailabilitiesQuery.isError,
    refetch: () => {
      eventsQuery.refetch();
      leavesQuery.refetch();
      unavailabilitiesQuery.refetch();
    },
  };
}
