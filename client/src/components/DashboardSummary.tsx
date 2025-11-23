import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Calendar, Zap, Wallet, Clock } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";

interface UpcomingTrip {
  id: string;
  depart: string;
  arrivee: string;
  dateDepart: Date;
  heureDepart: string;
  numBus: string;
  compagnie: string;
}

export function DashboardSummary() {
  const { data: reservations = [], isLoading, error } = useReservations();
  
  console.log("📊 DashboardSummary - reservations:", reservations, "isLoading:", isLoading, "error:", error);

  // Calcul des statistiques
  const totalTrips = Array.isArray(reservations) ? reservations.length : 0;
  
  const upcomingTrips = Array.isArray(reservations)
    ? reservations.filter((r: any) => r.statut === "confirmé" || r.statut === "en attente")
    : [];
  
  const nextTrip = upcomingTrips.length > 0 ? upcomingTrips[0] : null;

  const loyaltyPoints = 1250;
  const walletBalance = 500.00;

  return (
    <div className="space-y-4">
      {/* Résumés statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total de voyages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voyages Totaux</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingTrips.length} à venir
            </p>
          </CardContent>
        </Card>

        {/* Prochain voyage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochain Voyage</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextTrip ? (
              <>
                <div className="text-2xl font-bold">
                  Prochainement
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Réservation en cours
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Aucun voyage prévu</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Points de fidélité */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Fidélité</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyaltyPoints}</div>
            <p className="text-xs text-muted-foreground">
              {Math.floor(loyaltyPoints / 100)} tickets offerts
            </p>
          </CardContent>
        </Card>

        {/* Portefeuille */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portefeuille</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{walletBalance.toFixed(2)} DH</div>
            <p className="text-xs text-muted-foreground">Solde disponible</p>
          </CardContent>
        </Card>
      </div>

      {/* Prochaine réservation en détail */}
      {nextTrip && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Clock className="h-5 w-5" />
              Votre Prochain Voyage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="text-lg font-semibold">Réservation confirmée</p>
              </div>
              <Badge variant="outline">À venir</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Référence</p>
                <p className="font-semibold">{nextTrip.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Passagers</p>
                <p className="font-semibold">{nextTrip.nombre_places}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jours restants</p>
                <p className="font-semibold text-blue-600">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons d'action rapide */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Button size="lg" className="gap-2">
          <Ticket className="h-4 w-4" />
          Réserver un Nouveau Voyage
        </Button>
        <Button size="lg" variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Voir toutes les Réservations
        </Button>
        <Button size="lg" variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" />
          Recharger le Portefeuille
        </Button>
      </div>
    </div>
  );
}
