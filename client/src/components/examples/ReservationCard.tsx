import { ReservationCard } from '../ReservationCard';

export default function ReservationCardExample() {
  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-semibold mb-6">Reservation Cards</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ReservationCard
          id="res-001"
          depart="Casablanca"
          arrivee="Rabat"
          heureDepart={new Date("2025-01-25T08:00:00")}
          nombrePlaces={2}
          numeroSiege="12, 13"
          montantTotal={100}
          statut="paid"
          dateReservation={new Date("2025-01-20T10:30:00")}
          onCancel={() => console.log("Annulation réservation res-001")}
        />
        <ReservationCard
          id="res-002"
          depart="Marrakech"
          arrivee="Agadir"
          heureDepart={new Date("2025-01-26T14:00:00")}
          nombrePlaces={1}
          numeroSiege="8"
          montantTotal={120}
          statut="pending_payment"
          dateReservation={new Date("2025-01-22T15:00:00")}
          onCancel={() => console.log("Annulation réservation res-002")}
        />
        <ReservationCard
          id="res-003"
          depart="Fès"
          arrivee="Tanger"
          heureDepart={new Date("2025-01-20T10:00:00")}
          nombrePlaces={3}
          montantTotal={270}
          statut="termine"
          dateReservation={new Date("2025-01-15T09:00:00")}
        />
      </div>
    </div>
  );
}
