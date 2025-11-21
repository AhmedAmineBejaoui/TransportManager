import { TripCard } from '../TripCard';

export default function TripCardExample() {
  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-semibold mb-6">Trip Cards</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TripCard
          id="1"
          depart="Casablanca"
          arrivee="Rabat"
          heureDepart={new Date("2025-01-25T08:00:00")}
          heureArrivee={new Date("2025-01-25T09:30:00")}
          prix={50}
          placesDisponibles={12}
          capaciteTotal={40}
          statut="planifie"
          chauffeur="Ahmed Benali"
          vehicule="Mercedes Sprinter"
          onReserver={() => console.log("Réservation trajet 1")}
        />
        <TripCard
          id="2"
          depart="Marrakech"
          arrivee="Agadir"
          heureDepart={new Date("2025-01-25T14:00:00")}
          heureArrivee={new Date("2025-01-25T17:00:00")}
          prix={120}
          placesDisponibles={0}
          capaciteTotal={35}
          statut="planifie"
          chauffeur="Fatima Zahra"
          vehicule="Volvo Bus"
          onReserver={() => console.log("Réservation trajet 2")}
        />
        <TripCard
          id="3"
          depart="Fès"
          arrivee="Tanger"
          heureDepart={new Date("2025-01-25T10:00:00")}
          heureArrivee={new Date("2025-01-25T14:00:00")}
          prix={90}
          placesDisponibles={8}
          capaciteTotal={40}
          statut="en_cours"
          chauffeur="Mohammed Alami"
          vehicule="Scania Coach"
        />
      </div>
    </div>
  );
}
