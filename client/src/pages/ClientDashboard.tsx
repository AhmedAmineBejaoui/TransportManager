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
import { buildTripCardModel } from "@/lib/formatters";

export default function ClientDashboard() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [routeQuery, setRouteQuery] = useState<{ depart: string; arrivee: string } | null>(null);

  const { toast } = useToast();

  const handleSearch = (data: { depart: string; arrivee: string; date?: Date }) => {
    setRouteQuery({ depart: data.depart, arrivee: data.arrivee });
    toast({
      title: "Recherche effectuee",
      description: "Calcul de l'itineraire et des distances...",
    });
  };

  const { data: trips = [] } = useTrips();

  // Ne montrer que les trajets a venir et non annules/termines, mais si aucun, afficher quand m��me les derniers trajets
  const upcomingTrips = trips.filter((t: any) => {
    const statut = (t.statut as string | null) ?? "planifie";
    if (statut === "annule" || statut === "termine") return false;
    if (!t.heure_depart_prevue) return true;
    const dep = new Date(t.heure_depart_prevue);
    return Number.isFinite(dep.getTime()) && dep.getTime() >= Date.now();
  });
  const visibleTrips = (upcomingTrips.length ? upcomingTrips : trips).slice(0, 6);

  const handleOpenReservation = (tripId: string) => {
    setSelectedTripId(tripId);
    setReservationDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Rechercher un trajet</h1>
          <p className="text-muted-foreground mt-1">
            Trouvez le trajet parfait pour votre voyage
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

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <SearchTripForm onSearch={handleSearch} />
        <div className="space-y-4">
          <LoyaltySummaryCard />
        </div>
      </div>

      <DashboardMap
        height="h-[500px]"
        origin={routeQuery?.depart}
        destination={routeQuery?.arrivee}
      />

      <div>
        <h2 className="text-lg font-semibold mb-3">Flux en temps reel</h2>
        {visibleTrips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun trajet disponible pour le moment.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTrips.map((trip: any) => {
              const model = buildTripCardModel(trip);
              return (
                <TripCard
                  key={model.id}
                  {...model}
                  onReserver={() => handleOpenReservation(model.id)}
                />
              );
            })}
          </div>
        )}
      </div>

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
