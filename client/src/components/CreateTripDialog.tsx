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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdminCreateTrip } from "@/hooks/useTrips";
import { useUsers } from "@/hooks/useUsers";
import { useVehicles } from "@/hooks/useVehicles";
import { Loader2 } from "lucide-react";

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: "scolaire", label: "Scolaire" },
  { value: "medical", label: "Médical" },
  { value: "prive", label: "Privé" },
  { value: "livraison", label: "Livraison" },
  { value: "autre", label: "Autre" },
] as const;

const STATUSES = [
  { value: "coming", label: "À venir" },
  { value: "pending_confirmation", label: "En attente de confirmation" },
  { value: "completed", label: "Terminé" },
] as const;

export function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
  const { toast } = useToast();
  const createTrip = useAdminCreateTrip();
  const { data: users = [] } = useUsers();
  const { data: vehicles = [] } = useVehicles();

  const chauffeurs = users.filter((u) => u.role === "CHAUFFEUR");

  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    startLocation: "",
    endLocation: "",
    category: "scolaire",
    status: "coming",
    prix: "",
    places: "",
    vehicleId: "",
    chauffeurId: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.startLocation ||
      !formData.endLocation ||
      !formData.date ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.prix ||
      !formData.places ||
      !formData.chauffeurId
    ) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      chauffeur_id: formData.chauffeurId,
      vehicle_id: formData.vehicleId || undefined,
      date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      start_location: formData.startLocation,
      end_location: formData.endLocation,
      category: formData.category as (typeof CATEGORIES)[number]["value"],
      status: formData.status as (typeof STATUSES)[number]["value"],
      notes: formData.notes || undefined,
      prix: formData.prix,
      places_disponibles: parseInt(formData.places, 10),
    };

    createTrip.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Trajet créé",
          description: "Le trajet a été créé avec succès.",
        });
        setFormData({
          date: "",
          startTime: "",
          endTime: "",
          startLocation: "",
          endLocation: "",
          category: "scolaire",
          status: "coming",
          prix: "",
          places: "",
          vehicleId: "",
          chauffeurId: "",
          notes: "",
        });
        onOpenChange(false);
      },
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de créer le trajet.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau trajet</DialogTitle>
          <DialogDescription>
            L&apos;administrateur configure ici un trajet réel pour un chauffeur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startLocation">Ville de départ *</Label>
              <Input
                id="startLocation"
                placeholder="Ex: Tunis"
                value={formData.startLocation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startLocation: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endLocation">Ville d&apos;arrivée *</Label>
              <Input
                id="endLocation"
                placeholder="Ex: Sousse"
                value={formData.endLocation}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endLocation: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prix">Prix (DT) *</Label>
              <Input
                id="prix"
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex: 50"
                value={formData.prix}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prix: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="places">Places disponibles *</Label>
              <Input
                id="places"
                type="number"
                min={1}
                placeholder="Ex: 4"
                value={formData.places}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, places: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statut *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut du trajet" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chauffeur assigné *</Label>
              <Select
                value={formData.chauffeurId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, chauffeurId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  {chauffeurs.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.prenom} {user.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Véhicule (optionnel)</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, vehicleId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun véhicule assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun véhicule</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.immatriculation} • {vehicle.marque} {vehicle.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (ordre de mission, consignes...)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Passage par l'école primaire, vérifier les documents du passager..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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

