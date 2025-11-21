import { VehicleCard } from '../VehicleCard';

export default function VehicleCardExample() {
  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-semibold mb-6">Vehicle Cards</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <VehicleCard
          id="1"
          immatriculation="12345-A-67"
          marque="Mercedes"
          modele="Sprinter"
          capacite={40}
          statut="disponible"
          chauffeur="Ahmed Benali"
          onEdit={() => console.log("Edit vehicle 1")}
        />
        <VehicleCard
          id="2"
          immatriculation="98765-B-43"
          marque="Volvo"
          modele="9700"
          capacite={35}
          statut="en_route"
          chauffeur="Fatima Zahra"
          onEdit={() => console.log("Edit vehicle 2")}
        />
        <VehicleCard
          id="3"
          immatriculation="54321-C-89"
          marque="Scania"
          modele="Touring"
          capacite={50}
          statut="en_maintenance"
          onEdit={() => console.log("Edit vehicle 3")}
        />
      </div>
    </div>
  );
}
