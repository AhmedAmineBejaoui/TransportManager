import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateReservation } from "@/hooks/useReservations";
import { useTrip } from "@/hooks/useTrips";
import { Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultNombrePlaces?: string;
  autoSubmit?: boolean;
}

export function CreateReservationDialog({
  open,
  onOpenChange,
  tripId,
  defaultNombrePlaces,
  autoSubmit,
}: CreateReservationDialogProps) {
  const { toast } = useToast();
  const createReservation = useCreateReservation();
  const { data: trip } = useTrip(tripId);
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [nombrePlaces, setNombrePlaces] = useState(defaultNombrePlaces ?? "1");

  const prix = trip?.prix ? Number(trip.prix) : 0;
  const montantTotal = prix * (parseInt(nombrePlaces || "1") || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requestedPlaces = parseInt(nombrePlaces || "0");

    if (!nombrePlaces || requestedPlaces < 1) {
      toast({
        title: "Erreur",
        description: "Le nombre de places doit être au moins 1",
        variant: "destructive",
      });
      return;
    }

    if (trip && typeof trip.places_disponibles === "number" && requestedPlaces > trip.places_disponibles) {
      toast({
        title: "Places insuffisantes",
        description: `Il reste seulement ${trip.places_disponibles} place(s) sur ce trajet.`,
        variant: "destructive",
      });
      return;
    }

    createReservation.mutate(
      {
        trip_id: tripId,
        nombre_places: requestedPlaces,
        montant_total: montantTotal.toFixed(2),
      },
      {
        onSuccess: async (reservation: any) => {
          toast({
            title: "Succès",
            description: "Réservation créée avec succès",
          });
          setNombrePlaces("1");
          onOpenChange(false);

          try {
            const qrText = reservation?.qr?.text ?? JSON.stringify({ reservationId: reservation.id });
            const dataUrl = await QRCode.toDataURL(qrText);
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><img src='${dataUrl}' alt='QR code' /><p>Réservation: ${reservation.id}</p></div></body></html>`;
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          } catch {
            // ignore QR errors
          }
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de créer la réservation",
            variant: "destructive",
          });
        },
      },
    );
  };

  useEffect(() => {
    if (open) {
      setNombrePlaces(defaultNombrePlaces ?? "1");
    }
  }, [open, defaultNombrePlaces]);

  useEffect(() => {
    if (!open || !autoSubmit) return;
    if (authLoading) return;
    if (!isAuthenticated) return;

    const requestedPlaces = parseInt(defaultNombrePlaces ?? "1");

    createReservation.mutate(
      {
        trip_id: tripId,
        nombre_places: requestedPlaces,
        montant_total: (Number(trip?.prix ?? 0) * (requestedPlaces || 1)).toFixed(2),
      },
      {
        onSuccess: async (reservation: any) => {
          toast({ title: "Succès", description: "Réservation créée" });
          setNombrePlaces("1");
          onOpenChange(false);
          try {
            const qrText = reservation?.qr?.text ?? JSON.stringify({ reservationId: reservation.id });
            const dataUrl = await QRCode.toDataURL(qrText);
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><img src='${dataUrl}' alt='QR code' /><p>Réservation: ${reservation.id}</p></div></body></html>`;
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          } catch {
            // ignore QR errors
          }
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de créer la réservation",
            variant: "destructive",
          });
        },
      },
    );
  }, [autoSubmit, authLoading, isAuthenticated, open, defaultNombrePlaces, trip, tripId, createReservation, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Créer une réservation</DialogTitle>
          <DialogDescription>
            Indiquez le nombre de places que vous souhaitez réserver
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombrePlaces">Nombre de places *</Label>
            <Input
              id="nombrePlaces"
              type="number"
              placeholder="1"
              min="1"
              value={nombrePlaces}
              onChange={(e) => setNombrePlaces(e.target.value)}
              required
            />
          </div>

          {trip && (
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <p>
                Trajet :{" "}
                <span className="font-semibold">
                  {trip.point_depart} → {trip.point_arrivee}
                </span>
              </p>
              <p>
                Date :{" "}
                <span className="font-semibold">
                  {trip.heure_depart_prevue
                    ? format(new Date(trip.heure_depart_prevue), "dd MMM yyyy HH:mm", { locale: fr })
                    : "—"}
                </span>
              </p>
              <p>
                Places restantes :{" "}
                <span className="font-semibold">
                  {typeof trip.places_disponibles === "number" ? trip.places_disponibles : "—"}
                </span>
              </p>
              <p>
                Prix par place :{" "}
                <span className="font-semibold">{prix.toFixed(2)} DH</span>
              </p>
              <p>
                Montant total :{" "}
                <span className="font-semibold">{montantTotal.toFixed(2)} DH</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createReservation.isPending}>
              {createReservation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Réserver
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
