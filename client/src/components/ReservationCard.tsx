import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Hash } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type ReservationCardProps = {
  id: string;
  depart: string;
  arrivee: string;
  heureDepart: Date;
  nombrePlaces: number;
  numeroSiege?: string;
  montantTotal: number;
  statut: "en_attente" | "confirme" | "annule" | "termine";
  dateReservation: Date;
  onCancel?: () => void;
  qrText?: string;
};

const statusConfig = {
  en_attente: { label: "En attente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  confirme: { label: "Confirmé", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  termine: { label: "Terminé", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

export function ReservationCard({
  id,
  depart,
  arrivee,
  heureDepart,
  nombrePlaces,
  numeroSiege,
  montantTotal,
  statut,
  dateReservation,
  onCancel,
  qrText,
}: ReservationCardProps) {
  const status = statusConfig[statut];
  const canCancel = statut === "en_attente" || statut === "confirme";

  return (
    <Card data-testid={`card-reservation-${id}`}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">
          Réservation #{id.slice(0, 8)}
        </CardTitle>
        <Badge className={status.className} data-testid={`badge-reservation-status-${id}`}>
          {status.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">{depart}</span>
          </div>
          <div className="flex items-center gap-2 text-sm pl-6">
            <div className="h-4 w-px bg-border" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-destructive" />
            <span className="font-medium">{arrivee}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(heureDepart, "dd MMM yyyy, HH:mm", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{nombrePlaces} place{nombrePlaces > 1 ? "s" : ""}</span>
          </div>
        </div>

        {numeroSiege && (
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span>Siège: {numeroSiege}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Réservé le {format(dateReservation, "dd MMM yyyy", { locale: fr })}
          </span>
          <span className="text-lg font-bold text-primary" data-testid={`text-reservation-amount-${id}`}>
            {montantTotal} DH
          </span>
        </div>

        {onCancel && canCancel && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={onCancel}
            data-testid={`button-cancel-reservation-${id}`}
          >
            Annuler la réservation
          </Button>
        )}
        {qrText && (
          <Button className="w-full mt-2" onClick={() => window.dispatchEvent(new CustomEvent('open-ticket-modal', { detail: { qrText, reservationId: id } }))}>
            Voir le billet (QR)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
