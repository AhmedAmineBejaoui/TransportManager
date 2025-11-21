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

interface CreateReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  defaultNombrePlaces?: string;
  autoSubmit?: boolean; // when opened, submit automatically if authenticated
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
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [nombrePlaces, setNombrePlaces] = useState(defaultNombrePlaces ?? "1");

  const prix = trip?.prix ? Number(trip.prix) : 0;
  const montantTotal = prix * (parseInt(nombrePlaces || "1") || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombrePlaces || parseInt(nombrePlaces) < 1) {
      toast({
        title: "Erreur",
        description: "Le nombre de places doit être au moins 1",
        variant: "destructive",
      });
      return;
    }

    createReservation.mutate(
      {
        trip_id: tripId,
        nombre_places: parseInt(nombrePlaces),
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

          // If server returned a qr.text field, generate data URL and open a new window showing QR
          try {
            const qrText = reservation?.qr?.text ?? JSON.stringify({ reservationId: reservation.id });
            const dataUrl = await QRCode.toDataURL(qrText);
            // open in new tab so user can save/scan: render a minimal page with the QR image
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><img src='${dataUrl}' alt='QR code' /><p>Reservation: ${reservation.id}</p></div></body></html>`;
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          } catch (err) {
            // ignore QR generation errors
          }
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de créer la réservation",
            variant: "destructive",
          });
        },
      }
    );
  };

  useEffect(() => {
    // when dialog opens, initialize nombrePlaces
    if (open) {
      setNombrePlaces(defaultNombrePlaces ?? "1");
    }
  }, [open, defaultNombrePlaces]);

  useEffect(() => {
    // if autoSubmit requested and user is authenticated, submit automatically
    if (!open || !autoSubmit) return;
    if (authLoading) return;
    if (!isAuthenticated) return;
    // auto-submit a single-place reservation
    createReservation.mutate(
      {
        trip_id: tripId,
        nombre_places: parseInt(defaultNombrePlaces ?? "1"),
        montant_total: (Number(trip?.prix ?? 0) * (parseInt(defaultNombrePlaces ?? "1") || 1)).toFixed(2),
      },
      {
        onSuccess: async (reservation: any) => {
          toast({ title: "Succès", description: "Réservation créée" });
          setNombrePlaces("1");
          onOpenChange(false);
          try {
            const qrText = reservation?.qr?.text ?? JSON.stringify({ reservationId: reservation.id });
            const dataUrl = await QRCode.toDataURL(qrText);
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket QR</title></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><img src='${dataUrl}' alt='QR code' /><p>Reservation: ${reservation.id}</p></div></body></html>`;
            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          } catch (err) {}
        },
        onError: (error: any) => {
          toast({ title: "Erreur", description: error?.message || "Impossible de créer la réservation", variant: "destructive" });
        },
      }
    );
  }, [autoSubmit, authLoading, isAuthenticated, open]);

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
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                Prix par place:{" "}
                <span className="font-semibold">{trip.prix} DH</span>
              </p>
              <p className="text-sm">
                Montant total:{" "}
                <span className="font-semibold">
                  {montantTotal.toFixed(2)} DH
                </span>
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
