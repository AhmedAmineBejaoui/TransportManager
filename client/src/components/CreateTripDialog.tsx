import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateTrip } from "@/hooks/useTrips";
import { Loader2 } from "lucide-react";

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
  const { toast } = useToast();
  const createTrip = useCreateTrip();
  const [formData, setFormData] = useState({
    depart: "",
    arrivee: "",
    heureDepart: "",
    prix: "",
    places: "",
    vehicleId: "",
    chauffeurId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.depart ||
      !formData.arrivee ||
      !formData.heureDepart ||
      !formData.prix ||
      !formData.places
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Convert dates to ISO strings for JSON serialization
    const departDate = new Date(formData.heureDepart);
    const arriveeDate = new Date(departDate.getTime() + 2 * 60 * 60 * 1000);
    
    createTrip.mutate(
      {
        point_depart: formData.depart,
        point_arrivee: formData.arrivee,
        heure_depart_prevue: departDate.toISOString(),
        heure_arrivee_prevue: arriveeDate.toISOString(),
        prix: formData.prix,
        places_disponibles: parseInt(formData.places),
        vehicle_id: formData.vehicleId || undefined,
        chauffeur_id: formData.chauffeurId || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Succès",
            description: "Trajet créé avec succès",
          });
          setFormData({
            depart: "",
            arrivee: "",
            heureDepart: "",
            prix: "",
            places: "",
            vehicleId: "",
            chauffeurId: "",
          });
          onOpenChange(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de créer le trajet",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau trajet</DialogTitle>
          <DialogDescription>
            Remplissez les informations du trajet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depart">Départ *</Label>
              <Input
                id="depart"
                placeholder="Tunis"
                value={formData.depart}
                onChange={(e) =>
                  setFormData({ ...formData, depart: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivee">Arrivée *</Label>
              <Input
                id="arrivee"
                placeholder="Sousse"
                value={formData.arrivee}
                onChange={(e) =>
                  setFormData({ ...formData, arrivee: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heureDepart">Date & Heure de départ *</Label>
            <Input
              id="heureDepart"
              type="datetime-local"
              value={formData.heureDepart}
              onChange={(e) =>
                setFormData({ ...formData, heureDepart: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prix">Prix (DH) *</Label>
              <Input
                id="prix"
                type="number"
                placeholder="50"
                step="0.01"
                value={formData.prix}
                onChange={(e) =>
                  setFormData({ ...formData, prix: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="places">Places disponibles *</Label>
              <Input
                id="places"
                type="number"
                placeholder="4"
                value={formData.places}
                onChange={(e) =>
                  setFormData({ ...formData, places: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleId">Véhicule (optionnel)</Label>
            <Input
              id="vehicleId"
              placeholder="ID du véhicule"
              value={formData.vehicleId}
              onChange={(e) =>
                setFormData({ ...formData, vehicleId: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chauffeurId">Chauffeur (optionnel)</Label>
            <Input
              id="chauffeurId"
              placeholder="ID du chauffeur"
              value={formData.chauffeurId}
              onChange={(e) =>
                setFormData({ ...formData, chauffeurId: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createTrip.isPending}>
              {createTrip.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
