import { useState } from "react";
import { DashboardSummary } from "@/components/DashboardSummary";
import { MyReservations } from "@/components/MyReservations";
import { SearchTripForm } from "@/components/SearchTripForm";
import { CreateReservationDialog } from "@/components/CreateReservationDialog";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TunisiaRouteMap } from "@/components/TunisiaRouteMap";
import { ClientProfilePanel } from "@/components/ClientProfilePanel";
import { SocialShareEditor } from "@/components/SocialShareEditor";
import { NotificationCenterDrawer } from "@/components/NotificationCenterDrawer";
import { LoyaltySummaryCard } from "@/components/LoyaltySummaryCard";
import { FeedbackDialog } from "@/components/FeedbackDialog";

export default function ClientDashboard() {
  // search params are handled by the search form; we show toast on search
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  // selectedTripId will be passed to reservation dialog when created
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const handleOpenReservation = (tripId: string) => {
    setSelectedTripId(tripId);
    setReservationDialogOpen(true);
  };

  const { toast } = useToast();

  const handleSearch = (data: { depart: string; arrivee: string; date?: Date }) => {
    toast({
      title: "Recherche effectuée",
      description: "Chargement des trajets...",
    });
  };

  // Reservation handled by trip list or other views; keep state for dialog

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Tableau de Bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue sur votre espace personnel de gestion des trajets
          </p>
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

      {/* Résumé et statistiques */}
      <DashboardSummary />

      {/* Mes réservations */}
      <MyReservations />

      {/* Flux en temps réel avec géolocalisation */}
      <TunisiaRouteMap />

      {/* Section recherche rapide et réservation */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <SearchTripForm onSearch={handleSearch} />
        <div className="space-y-4">
          <LoyaltySummaryCard />
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

