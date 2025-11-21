import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Edit, MessageSquare, Share2, Eye } from "lucide-react";

interface ReservationCardProps {
  id: string;
  pnr: string;
  depart: string;
  arrivee: string;
  dateDepart: string;
  heureDepart: string;
  compagnie: string;
  numBus: string;
  statut: "confirmed" | "pending" | "completed" | "cancelled";
  sieges: string[];
  codeQR: string;
  onViewDetails?: (id: string) => void;
  onDownload?: (id: string) => void;
  onCancel?: (id: string) => void;
  onModify?: (id: string) => void;
  onContact?: (id: string) => void;
  onShare?: (id: string) => void;
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

function ReservationCard({
  id,
  pnr,
  depart,
  arrivee,
  dateDepart,
  heureDepart,
  compagnie,
  numBus,
  statut,
  sieges,
  onViewDetails,
  onDownload,
  onCancel,
  onModify,
  onContact,
  onShare,
}: ReservationCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 border-b">
          {/* Itinéraire principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-2xl font-bold">{depart}</p>
              <span className="text-muted-foreground">→</span>
              <p className="text-2xl font-bold">{arrivee}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {dateDepart} • {heureDepart}
            </p>
          </div>

          {/* Statut */}
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusColors[statut]}>
              {statusLabels[statut]}
            </Badge>
            <p className="text-xs text-muted-foreground">PNR: {pnr}</p>
          </div>
        </div>

        {/* Détails secondaires */}
        <div className="grid gap-3 sm:grid-cols-4 p-4 bg-muted/30 text-sm border-b">
          <div>
            <p className="text-muted-foreground">Compagnie</p>
            <p className="font-semibold">{compagnie}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bus</p>
            <p className="font-semibold">#{numBus}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Siège(s)</p>
            <p className="font-semibold">{sieges.join(", ")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Code QR</p>
            <p className="font-mono text-xs font-semibold truncate">{pnr}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 p-4">
          <Button
            size="sm"
            variant="default"
            className="gap-2"
            onClick={() => onViewDetails?.(id)}
          >
            <Eye className="h-4 w-4" />
            Voir Détails
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => onDownload?.(id)}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          {statut === "confirmed" || statut === "pending" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => onModify?.(id)}
              >
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => onCancel?.(id)}
              >
                <Trash2 className="h-4 w-4" />
                Annuler
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => onContact?.(id)}
          >
            <MessageSquare className="h-4 w-4" />
            Support
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => onShare?.(id)}
          >
            <Share2 className="h-4 w-4" />
            Partager
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyReservations() {
  const { data: reservations = [] } = useReservations();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Filtrage
  const filteredReservations = Array.isArray(reservations)
    ? reservations.filter((r: any) => {
        const matchesSearch =
          r.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.depart?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.arrivee?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || r.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
    : [];

  const handleViewDetails = (id: string) => {
    console.log("View details:", id);
    // TODO: Navigate to reservation details page or open modal
  };

  const handleDownload = (id: string) => {
    console.log("Download PDF:", id);
    // TODO: Generate and download PDF
  };

  const handleCancel = (id: string) => {
    console.log("Cancel reservation:", id);
    // TODO: Open cancel confirmation dialog
  };

  const handleModify = (id: string) => {
    console.log("Modify reservation:", id);
    // TODO: Open modify dialog
  };

  const handleContact = (id: string) => {
    console.log("Contact support:", id);
    // TODO: Open support chat for this reservation
  };

  const handleShare = (id: string) => {
    console.log("Share reservation:", id);
    // TODO: Generate shareable link or show QR code
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes Réservations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contrôles de filtre et recherche */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Recherche</label>
            <Input
              placeholder="Rechercher par PNR, destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium mb-2">Statut</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="confirmed">Confirmés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="completed">Complétés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "card" ? "default" : "ghost"}
              onClick={() => setViewMode("card")}
            >
              Cartes
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
            >
              Liste
            </Button>
          </div>
        </div>

        {/* Résultats */}
        {filteredReservations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className={viewMode === "card" ? "space-y-4" : ""}>
            {filteredReservations.map((reservation: any) => (
              <ReservationCard
                key={reservation.id}
                id={reservation.id}
                pnr={reservation.pnr}
                depart={reservation.depart}
                arrivee={reservation.arrivee}
                dateDepart={new Date(reservation.dateDepart).toLocaleDateString("fr-FR")}
                heureDepart={reservation.heureDepart}
                compagnie={reservation.compagnie}
                numBus={reservation.numBus}
                statut={reservation.status}
                sieges={reservation.sieges || []}
                codeQR={reservation.pnr}
                onViewDetails={handleViewDetails}
                onDownload={handleDownload}
                onCancel={handleCancel}
                onModify={handleModify}
                onContact={handleContact}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
