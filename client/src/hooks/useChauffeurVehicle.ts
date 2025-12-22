import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Vehicle,
  VehicleDetails,
  VehicleMaintenance,
  VehicleDocument,
  VehicleIncident,
  VehicleChecklist,
  InsertVehicleMaintenance,
  InsertVehicleIncident,
  InsertVehicleChecklist,
} from "@shared/schema";

// Type combiné pour le véhicule avec détails
export type VehicleWithDetails = Vehicle & {
  details?: VehicleDetails | null;
};

// ==================== ASSIGNED VEHICLE ====================
export function useChauffeurVehicle() {
  return useQuery<VehicleWithDetails | null>({
    queryKey: ["/api/chauffeur/vehicle"],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/vehicle", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Erreur lors du chargement du véhicule");
      }
      return res.json();
    },
  });
}

// ==================== VEHICLE MAINTENANCES ====================
export function useVehicleMaintenances(vehicleId?: string) {
  return useQuery<VehicleMaintenance[]>({
    queryKey: ["/api/chauffeur/vehicle/maintenances", vehicleId],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/vehicle/maintenances", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des entretiens");
      return res.json();
    },
    enabled: !!vehicleId,
  });
}

export function useCreateVehicleMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertVehicleMaintenance, "vehicle_id">) => {
      const res = await fetch("/api/chauffeur/vehicle/maintenances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors de la création de l'entretien");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/vehicle/maintenances"] });
    },
  });
}

// ==================== VEHICLE DOCUMENTS ====================
export function useVehicleDocuments(vehicleId?: string) {
  return useQuery<VehicleDocument[]>({
    queryKey: ["/api/chauffeur/vehicle/documents", vehicleId],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/vehicle/documents", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des documents");
      return res.json();
    },
    enabled: !!vehicleId,
  });
}

// ==================== VEHICLE INCIDENTS ====================
export function useVehicleIncidents(vehicleId?: string) {
  return useQuery<VehicleIncident[]>({
    queryKey: ["/api/chauffeur/vehicle/incidents", vehicleId],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/vehicle/incidents", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des incidents");
      return res.json();
    },
    enabled: !!vehicleId,
  });
}

export function useCreateVehicleIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertVehicleIncident, "vehicle_id" | "chauffeur_id">) => {
      const res = await fetch("/api/chauffeur/vehicle/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors du signalement de l'incident");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/vehicle/incidents"] });
    },
  });
}

// ==================== VEHICLE CHECKLISTS ====================
export function useVehicleChecklists(vehicleId?: string) {
  return useQuery<VehicleChecklist[]>({
    queryKey: ["/api/chauffeur/vehicle/checklists", vehicleId],
    queryFn: async () => {
      const res = await fetch("/api/chauffeur/vehicle/checklists", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des checklists");
      return res.json();
    },
    enabled: !!vehicleId,
  });
}

export function useCreateVehicleChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertVehicleChecklist, "vehicle_id" | "chauffeur_id">) => {
      const res = await fetch("/api/chauffeur/vehicle/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erreur lors de la création de la checklist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/vehicle/checklists"] });
    },
  });
}

// ==================== UPDATE VEHICLE LEVELS ====================
export function useUpdateVehicleLevels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { niveau_carburant?: number; niveau_batterie?: number; kilometrage?: number }) => {
      const res = await fetch("/api/chauffeur/vehicle/levels", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/chauffeur/vehicle"] });
    },
  });
}

// ==================== COMBINED VEHICLE DATA ====================
export function useChauffeurVehicleData() {
  const vehicleQuery = useChauffeurVehicle();
  const vehicleId = vehicleQuery.data?.id;
  
  const maintenancesQuery = useVehicleMaintenances(vehicleId);
  const documentsQuery = useVehicleDocuments(vehicleId);
  const incidentsQuery = useVehicleIncidents(vehicleId);
  const checklistsQuery = useVehicleChecklists(vehicleId);

  return {
    vehicle: vehicleQuery.data,
    maintenances: maintenancesQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    incidents: incidentsQuery.data ?? [],
    checklists: checklistsQuery.data ?? [],
    isLoading: vehicleQuery.isLoading,
    isLoadingDetails:
      maintenancesQuery.isLoading ||
      documentsQuery.isLoading ||
      incidentsQuery.isLoading ||
      checklistsQuery.isLoading,
    isError: vehicleQuery.isError,
    refetch: () => {
      vehicleQuery.refetch();
      maintenancesQuery.refetch();
      documentsQuery.refetch();
      incidentsQuery.refetch();
      checklistsQuery.refetch();
    },
  };
}
