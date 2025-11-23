import { useState } from "react";
import { SearchTripForm } from "@/components/SearchTripForm";
import { CreateReservationDialog } from "@/components/CreateReservationDialog";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { SocialShareEditor } from "@/components/SocialShareEditor";
import { NotificationCenterDrawer } from "@/components/NotificationCenterDrawer";
import { LoyaltySummaryCard } from "@/components/LoyaltySummaryCard";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { useTrips } from "@/hooks/useTrips";
import { TripCard } from "@/components/TripCard";
import { DashboardMap } from "@/components/DashboardMap";

export default function ClientDashboard() {
  // search params are handled by the search form; we show toast on search
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  // selectedTripId will be passed to reservation dialog when created
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);



  const { toast } = useToast();

  const handleSearch = (data: { depart: string; arrivee: string; date?: Date }) => {
    toast({
      title: "Recherche effectuée",
      description: "Chargement des trajets...",
    });
  };

  const { data: trips = [] } = useTrips();

  // Reservation handled by trip list or other views; keep state for dialog
  
  console.log("🎯 ClientDashboard rendering");

  const handleOpenReservation = (tripId: string) => {
    setSelectedTripId(tripId);
    setReservationDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête principal (titre de page) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Rechercher un trajet</h1>
          <p className="text-muted-foreground mt-1">Trouvez le trajet parfait pour votre voyage</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-notifications"
          onClick={() => setNotificationsOpen(true)}
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* Formulaire de recherche + carte fidélité */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <SearchTripForm onSearch={handleSearch} />
        <div className="space-y-4">
          <LoyaltySummaryCard />
        </div>
      </div>

      {/* Carte de géolocalisation */}
      <DashboardMap height="h-[500px]" />

      {/* Flux en temps réel - affichage de cartes de trajets */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Flux en temps réel</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.slice(0, 6).map((t: any) => (
            <TripCard
              key={t.id}
              id={t.id}
              depart={t.depart}
              arrivee={t.arrivee}
              heureDepart={new Date(t.date_depart)}
              heureArrivee={new Date(t.date_arrivee)}
              prix={t.prix ?? 0}
              placesDisponibles={t.places_disponibles ?? 0}
              capaciteTotal={t.capacite_total}
              statut={t.statut ?? "planifie"}
              chauffeur={t.chauffeur}
              vehicule={t.vehicule}
              onReserver={() => handleOpenReservation(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Partage et feedback */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <SocialShareEditor />
        <FeedbackDialog />
      </div>

      <NotificationCenterDrawer open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <CreateReservationDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        tripId={selectedTripId ?? ""}
      />
    </div>
  );
}

