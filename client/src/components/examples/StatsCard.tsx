import { StatsCard } from '../StatsCard';
import { Users, Bus, MapPin, Calendar } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-semibold mb-6">Stats Cards</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Utilisateurs"
          value={234}
          icon={Users}
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatsCard
          title="Véhicules"
          value={42}
          icon={Bus}
          trend={{ value: "+2", isPositive: true }}
        />
        <StatsCard
          title="Trajets Actifs"
          value={18}
          icon={MapPin}
        />
        <StatsCard
          title="Réservations"
          value={156}
          icon={Calendar}
          trend={{ value: "-5%", isPositive: false }}
        />
      </div>
    </div>
  );
}
