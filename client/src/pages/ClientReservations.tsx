import { useMemo } from "react";
import { ReservationCard } from "@/components/ReservationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useReservations, useCancelReservation, usePayReservation } from "@/hooks/useReservations";
import { useTrips } from "@/hooks/useTrips";
import { buildReservationCardModel, normalizeReservationStatus } from "@/lib/formatters";

export default function ClientReservations() {
  const { data: reservations = [], isLoading } = useReservations();
  const { data: trips = [] } = useTrips();
  const cancelReservation = useCancelReservation();
  const payReservation = usePayReservation();
  const { toast } = useToast();

  const tripById = useMemo(() => {
    return new Map(trips.map((trip) => [trip.id, trip]));
  }, [trips]);

  const handleCancel = (id: string) => {
    cancelReservation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Réservation annulée",
          description: "Votre réservation a été annulée avec succès",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible d'annuler la réservation",
          variant: "destructive",
        });
      },
    });
  };

  const handlePay = (id: string) => {
    payReservation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Paiement enregistré",
          description: "Votre réservation est maintenant marquée comme payée.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible d'enregistrer le paiement",
          variant: "destructive",
        });
      },
    });
  };

  const activeReservations = reservations.filter((reservation) => {
    const status = normalizeReservationStatus(reservation.statut);
    return status === "pending_payment" || status === "paid";
  });
  const completedReservations = reservations.filter(
    (reservation) => normalizeReservationStatus(reservation.statut) === "termine"
  );
  const cancelledReservations = reservations.filter(
    (reservation) => normalizeReservationStatus(reservation.statut) === "annule"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Mes Réservations</h1>
        <p className="text-muted-foreground mt-1">
          Gérez vos réservations de trajets
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-reservations">
            Actives ({activeReservations.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-reservations">
            Terminées ({completedReservations.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled-reservations">
            Annulées ({cancelledReservations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : activeReservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune réservation active</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeReservations.map((reservation) => {
                const trip = tripById.get(reservation.trip_id);
                const card = buildReservationCardModel(reservation, trip);
                if (!card) return null;
                return (
                  <ReservationCard
                    key={reservation.id}
                    {...card}
                    onCancel={() => handleCancel(reservation.id)}
                    onPay={() => handlePay(reservation.id)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : completedReservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune réservation terminée</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedReservations.map((reservation) => {
                const trip = tripById.get(reservation.trip_id);
                const card = buildReservationCardModel(reservation, trip);
                if (!card) return null;
                return <ReservationCard key={reservation.id} {...card} />;
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : cancelledReservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune réservation annulée</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cancelledReservations.map((reservation) => {
                const trip = tripById.get(reservation.trip_id);
                const card = buildReservationCardModel(reservation, trip);
                if (!card) return null;
                return <ReservationCard key={reservation.id} {...card} />;
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
