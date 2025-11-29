import { useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAdminTrips, useAdminDeleteTrip } from "@/hooks/useTrips";
import { useUsers } from "@/hooks/useUsers";
import { CreateTripDialog } from "@/components/CreateTripDialog";
import type { Trip } from "@shared/schema";
import { formatTripLabel, normalizeTripStatus } from "@/lib/formatters";

export default function AdminTrips() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [chauffeurFilter, setChauffeurFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const { data: trips = [], isLoading } = useAdminTrips({
    chauffeurId: chauffeurFilter === "all" ? undefined : chauffeurFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    date: dateFilter ? new Date(dateFilter) : undefined,
  });

  const deleteTrip = useAdminDeleteTrip();
  const { data: users = [] } = useUsers();
  const { toast } = useToast();

  const chauffeurs = useMemo(
    () => users.filter((u) => u.role === "CHAUFFEUR"),
    [users],
  );

  const chauffeurNameById = useMemo(
    () =>
      chauffeurs.reduce<Record<string, string>>((acc, user) => {
        acc[user.id] = `${user.prenom} ${user.nom}`;
        return acc;
      }, {}),
    [chauffeurs],
  );

  const statusConfig = {
    planifie: {
      label: "Planifié",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    },
    en_cours: {
      label: "En cours",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    termine: {
      label: "Terminé",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    },
    annule: {
      label: "Annulé",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    },
  } as const;

  const columns = [
    {
      key: "trajet",
      header: "Trajet",
      render: (trip: Trip) => (
        <div className="font-medium">{formatTripLabel(trip)}</div>
      ),
    },
    {
      key: "heureDepart",
      header: "Départ",
      render: (trip: Trip) =>
        format(new Date(trip.heure_depart_prevue), "dd MMM yyyy, HH:mm", {
          locale: fr,
        }),
    },
    {
      key: "prix",
      header: "Prix",
      render: (trip: Trip) => `${trip.prix} DT`,
    },
    {
      key: "places",
      header: "Places restantes",
      render: (trip: Trip) => `${trip.places_disponibles}`,
    },
    {
      key: "chauffeur",
      header: "Chauffeur",
      render: (trip: Trip) =>
        trip.chauffeur_id
          ? chauffeurNameById[trip.chauffeur_id] ??
            `#${trip.chauffeur_id.slice(0, 8)}`
          : "Non assigné",
    },
    {
      key: "vehicule",
      header: "Véhicule",
      render: (trip: Trip) =>
        trip.vehicle_id ? `#${trip.vehicle_id.slice(0, 8)}` : "Non assigné",
    },
    {
      key: "statut",
      header: "Statut",
      render: (trip: Trip) => {
        const status = normalizeTripStatus(trip.statut);
        const config = statusConfig[status];
        return <Badge className={config.className}>{config.label}</Badge>;
      },
    },
  ];

  const handleCreateTrip = () => {
    setSelectedTrip(null);
    setDialogMode("create");
    setCreateDialogOpen(true);
  };

  const handleViewTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setDialogMode("view");
    setCreateDialogOpen(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setDialogMode("edit");
    setCreateDialogOpen(true);
  };

  const handleDeleteTrip = (trip: Trip) => {
    deleteTrip.mutate(trip.id, {
      onSuccess: () => {
        toast({
          title: "Trajet supprimé",
          description: "Le trajet a été supprimé avec succès.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description:
            error?.message || "Impossible de supprimer le trajet.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Gestion des trajets chauffeur
          </h1>
          <p className="text-muted-foreground mt-1">
            Tous les trajets visibles dans le calendrier chauffeur sont créés
            et gérés ici par l&apos;administrateur.
          </p>
        </div>
        <Button onClick={handleCreateTrip} data-testid="button-create-trip">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau trajet
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Chauffeur</label>
          <Select
            value={chauffeurFilter}
            onValueChange={(value) => setChauffeurFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les chauffeurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les chauffeurs</SelectItem>
              {chauffeurs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Statut</label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="waiting_chauffeur_confirmation">
                En attente chauffeur
              </SelectItem>
              <SelectItem value="confirmed">Confirmé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Date</label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <DataTable
          data={trips}
          columns={columns}
          onView={handleViewTrip}
          onEdit={handleEditTrip}
          onDelete={handleDeleteTrip}
        />
      )}

      <CreateTripDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setSelectedTrip(null);
            setDialogMode("create");
          }
        }}
        mode={dialogMode}
        trip={selectedTrip}
      />
    </div>
  );
}
