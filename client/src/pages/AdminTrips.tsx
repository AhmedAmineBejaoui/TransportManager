import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useTrips, useDeleteTrip } from "@/hooks/useTrips";
import { CreateTripDialog } from "@/components/CreateTripDialog";
import type { Trip } from "@shared/schema";
import { formatTripLabel, normalizeTripStatus } from "@/lib/formatters";

export default function AdminTrips() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: trips = [], isLoading } = useTrips();
  const deleteTrip = useDeleteTrip();
  const { toast } = useToast();

  const statusConfig = {
    planifie: { label: "Planifié", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    en_cours: { label: "En cours", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    termine: { label: "Terminé", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
    annule: { label: "Annulé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  };

  const columns = [
    { 
      key: "trajet", 
      header: "Trajet",
      render: (trip: Trip) => (
        <div className="font-medium">
          {formatTripLabel(trip)}
        </div>
      )
    },
    { 
      key: "heureDepart", 
      header: "Départ",
      render: (trip: Trip) => format(new Date(trip.heure_depart_prevue), "dd MMM yyyy, HH:mm", { locale: fr })
    },
    { 
      key: "prix", 
      header: "Prix",
      render: (trip: Trip) => `${trip.prix} DH`
    },
    { 
      key: "places",
      header: "Places restantes",
      render: (trip: Trip) => `${trip.places_disponibles}`
    },
    { 
      key: "chauffeur", 
      header: "Chauffeur",
      render: (trip: Trip) => trip.chauffeur_id ? `#${trip.chauffeur_id.slice(0, 8)}` : "Non assigné"
    },
    { 
      key: "vehicule", 
      header: "Véhicule",
      render: (trip: Trip) => trip.vehicle_id ? `#${trip.vehicle_id.slice(0, 8)}` : "Non assigné"
    },
    { 
      key: "statut", 
      header: "Statut",
      render: (trip: Trip) => {
        const status = normalizeTripStatus(trip.statut);
        const config = statusConfig[status];
        return <Badge className={config.className}>{config.label}</Badge>;
      }
    },
  ];

  const handleCreateTrip = () => {
    setCreateDialogOpen(true);
  };

  const handleDeleteTrip = (trip: Trip) => {
    deleteTrip.mutate(trip.id, {
      onSuccess: () => {
        toast({
          title: "Trajet supprimé",
          description: "Le trajet a été supprimé avec succès",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de supprimer le trajet",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des Trajets</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les trajets du système
          </p>
        </div>
        <Button onClick={handleCreateTrip} data-testid="button-create-trip">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau trajet
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <DataTable
          data={trips}
          columns={columns}
          onView={(trip) => console.log("View trip:", trip)}
          onEdit={(trip) => console.log("Edit trip:", trip)}
          onDelete={handleDeleteTrip}
        />
      )}

      <CreateTripDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
