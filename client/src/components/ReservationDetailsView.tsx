import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MapPin, Users, CreditCard, AlertCircle, Briefcase, Download, Phone } from "lucide-react";

interface ReservationDetails {
  id: string;
  pnr: string;
  statut: "confirmed" | "pending" | "completed" | "cancelled";
  
  // Trajet
  depart: string;
  arrivee: string;
  dateDepart: string;
  heureDepart: string;
  heureArrivee: string;
  dureeTrajet: string;
  typeBus: string;
  equipements: string[];
  arrets: Array<{ ville: string; heure: string }>;
  
  // Passagers
  passagers: Array<{
    nom: string;
    age: string;
    siege: string;
  }>;
  
  // Paiement
  montantTotal: number;
  prixBase: number;
  fraisService: number;
    taxes: number;
  methodePaiement: string;
  dateTransaction: string;
  
  // Embarcadère
  nomEmbarcadere: string;
  adresseEmbarcadere: string;
  coordonneesGPS: { lat: number; lng: number };
  instructions: string;
  
  // Politiques
  politiqueAnnulation: string;
  politiqueBagages: string;
  compagnie: string;
  numBus: string;
}

const statusColors = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels = {
  confirmed: "Confirmé",
  pending: "En attente",
  completed: "Voyage complété",
  cancelled: "Annulé",
};

interface ReservationDetailsProps {
  details: ReservationDetails;
}

export function ReservationDetailsView({ details }: ReservationDetailsProps) {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Numéro de réservation</p>
              <p className="text-3xl font-bold">{details.pnr}</p>
            </div>
            <Badge className={statusColors[details.statut]}>
              {statusLabels[details.statut]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Informations du trajet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Informations du Trajet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Itinéraire principal */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Départ</p>
              <p className="text-2xl font-bold">{details.depart}</p>
              <p className="text-sm text-muted-foreground">{details.heureDepart}</p>
            </div>
            <div className="flex-1 border-t-2 border-dashed" />
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Arrivée</p>
              <p className="text-2xl font-bold">{details.arrivee}</p>
              <p className="text-sm text-muted-foreground">{details.heureArrivee}</p>
            </div>
          </div>

          <Separator />

          {/* Détails du trajet */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Durée</p>
              <p className="font-semibold">{details.dureeTrajet}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type de bus</p>
              <p className="font-semibold">{details.typeBus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compagnie</p>
              <p className="font-semibold">{details.compagnie}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Numéro du bus</p>
              <p className="font-semibold">#{details.numBus}</p>
            </div>
          </div>

          {/* Équipements */}
          <div>
            <p className="text-sm font-semibold mb-2">Équipements disponibles</p>
            <div className="flex flex-wrap gap-2">
              {details.equipements.map((equip) => (
                <Badge key={equip} variant="outline">
                  {equip}
                </Badge>
              ))}
            </div>
          </div>

          {/* Arrêts */}
          {details.arrets.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Arrêts intermédiaires</p>
              <div className="space-y-2">
                {details.arrets.map((arret, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-blue-600">{arret.heure}</span>
                    <span>{arret.ville}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations des passagers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informations des Passagers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {details.passagers.map((passager, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">{passager.nom}</p>
                  <p className="text-sm text-muted-foreground">{passager.age}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Siège</p>
                  <p className="text-lg font-bold">{passager.siege}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Détails de paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Détails de Paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix de base</span>
              <span className="font-semibold">{details.prixBase.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de service</span>
              <span className="font-semibold">{details.fraisService.toFixed(2)} DH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes</span>
              <span className="font-semibold">{details.taxes.toFixed(2)} DH</span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Montant total</span>
            <span className="text-blue-600">{details.montantTotal.toFixed(2)} DH</span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Méthode de paiement : <span className="font-semibold">{details.methodePaiement}</span>
            </p>
            <p className="text-muted-foreground">
              Date de transaction : <span className="font-semibold">{details.dateTransaction}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Informations d'embarcadère */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Point d'Embarcadère
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Nom de la gare</p>
            <p className="font-semibold text-lg">{details.nomEmbarcadere}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Adresse</p>
            <p className="font-semibold">{details.adresseEmbarcadere}</p>
          </div>
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Instructions</p>
            <p className="text-sm">{details.instructions}</p>
          </div>
          <Button variant="outline" className="w-full gap-2">
            <MapPin className="h-4 w-4" />
            Voir sur la carte
          </Button>
        </CardContent>
      </Card>

      {/* Politiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Politiques et Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-2">Politique d'annulation</p>
            <p className="text-sm text-muted-foreground">{details.politiqueAnnulation}</p>
          </div>
          <Separator />
          <div>
            <p className="font-semibold mb-2">Politique de bagages</p>
            <p className="text-sm text-muted-foreground">{details.politiqueBagages}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger le Billet (PDF)
        </Button>
        <Button size="lg" variant="outline" className="gap-2">
          <Phone className="h-4 w-4" />
          Contacter le Support
        </Button>
      </div>
    </div>
  );
}
