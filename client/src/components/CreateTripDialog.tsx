import { useState, useEffect } from "react";
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
import { useAdminCreateTrip, useAdminUpdateTrip } from "@/hooks/useTrips";
import { useUsers } from "@/hooks/useUsers";
import { useVehicles } from "@/hooks/useVehicles";
import { Loader2 } from "lucide-react";
import type { Trip } from "@shared/schema";

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit" | "view";
  trip?: Trip | null;
}

const CATEGORIES = [
  { value: "scolaire", label: "Scolaire" },
  { value: "medical", label: "Médical" },
  { value: "prive", label: "Privé" },
  { value: "livraison", label: "Livraison" },
  { value: "autre", label: "Autre" },
] as const;

// Workflow d'affectation chauffeur (aligné avec tripStatusSchema côté serveur)
const STATUSES = [
  { value: "waiting_chauffeur_confirmation", label: "En attente chauffeur" },
  { value: "confirmed", label: "Confirmé" },
  { value: "completed", label: "Terminé" },
] as const;

type FormState = {
  date: string;
  startTime: string;
  endTime: string;
  startLocation: string;
  endLocation: string;
  category: (typeof CATEGORIES)[number]["value"];
  status: (typeof STATUSES)[number]["value"];
  prix: string;
  places: string;
  vehicleId: string;
  chauffeurId: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  date: "",
  startTime: "",
  endTime: "",
  startLocation: "",
  endLocation: "",
  category: "scolaire",
  status: "waiting_chauffeur_confirmation",
  prix: "",
  places: "",
  vehicleId: "",
  chauffeurId: "",
  notes: "",
};

export function CreateTripDialog({
  open,
  onOpenChange,
  mode = "create",
  trip,
}: CreateTripDialogProps) {
  const { toast } = useToast();
  const createTrip = useAdminCreateTrip();
  const updateTrip = useAdminUpdateTrip();
  const { data: users = [] } = useUsers();
  const { data: vehicles = [] } = useVehicles();

  const chauffeurs = users.filter((u) => u.role === "CHAUFFEUR");

  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";
  const isReadOnly = isView;

  // Remplit le formulaire lorsque l'on ouvre en mode édition / vue
  useEffect(() => {
    if (!open) return;

    if (trip && (mode === "edit" || mode === "view")) {
      const departDate = trip.heure_depart_prevue
        ? new Date(trip.heure_depart_prevue as any)
        : null;
      const arriveeDate = trip.heure_arrivee_prevue
        ? new Date(trip.heure_arrivee_prevue as any)
        : null;

      const date =
        (trip as any).trip_date ||
        (departDate ? departDate.toISOString().slice(0, 10) : "");

      const startTime =
        (trip as any).start_time ||
        (departDate ? departDate.toISOString().slice(11, 16) : "");

      const endTime =
        (trip as any).end_time ||
        (arriveeDate ? arriveeDate.toISOString().slice(11, 16) : "");

      setFormData({
        date,
        startTime,
        endTime,
        startLocation:
          (trip as any).start_location || trip.point_depart || "",
        endLocation: (trip as any).end_location || trip.point_arrivee || "",
        category: ((trip as any).category || "scolaire") as FormState["category"],
        status: ((trip as any).status ||
          "waiting_chauffeur_confirmation") as FormState["status"],
        prix: trip.prix ? String(trip.prix) : "",
        places:
          trip.places_disponibles != null
            ? String(trip.places_disponibles)
            : "",
        vehicleId: trip.vehicle_id || "",
        chauffeurId: trip.chauffeur_id || "",
        notes: (trip as any).notes || "",
      });
    } else if (mode === "create") {
      setFormData(EMPTY_FORM);
    }
  }, [open, trip, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isView) {
      onOpenChange(false);
      return;
    }

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
      vehicle_id:
        formData.vehicleId && formData.vehicleId !== "none"
          ? formData.vehicleId
          : undefined,
      date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      start_location: formData.startLocation,
      end_location: formData.endLocation,
      category: formData.category,
      status: formData.status,
      notes: formData.notes || undefined,
      prix: formData.prix,
      places_disponibles: parseInt(formData.places, 10),
    };

    if (isCreate) {
      createTrip.mutate(payload, {
        onSuccess: () => {
          toast({
            title: "Trajet créé",
            description: "Le trajet a été créé avec succès.",
          });
          setFormData(EMPTY_FORM);
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
    } else if (isEdit && trip) {
      updateTrip.mutate(
        { id: trip.id, data: payload },
        {
          onSuccess: () => {
            toast({
              title: "Trajet mis à jour",
              description: "Le trajet a été mis à jour avec succès.",
            });
            onOpenChange(false);
          },
          onError: (error: any) => {
            toast({
              title: "Erreur",
              description:
                error?.message || "Impossible de mettre à jour le trajet.",
              variant: "destructive",
            });
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isCreate && "Créer un nouveau trajet"}
            {isEdit && "Modifier le trajet"}
            {isView && "Détails du trajet"}
          </DialogTitle>
          <DialogDescription>
            {isCreate &&
              "L'administrateur configure ici un trajet réel pour un chauffeur."}
            {isEdit &&
              "Mettez à jour les informations de ce trajet chauffeur."}
            {isView &&
              "Consultez les informations détaillées de ce trajet chauffeur."}
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
                  setFormData((prev) => ({
                    ...prev,
                    startLocation: e.target.value,
                  }))
                }
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endLocation">Ville d&apos;arrivée *</Label>
              <Input
                id="endLocation"
                placeholder="Ex: Sousse"
                value={formData.endLocation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endLocation: e.target.value,
                  }))
                }
                required
                disabled={isReadOnly}
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
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                required
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
                required
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: value as typeof prev.category,
                  }))
                }
                disabled={isReadOnly}
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
                  setFormData((prev) => ({
                    ...prev,
                    status: value as typeof prev.status,
                  }))
                }
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                value={formData.vehicleId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    vehicleId: value === "none" ? "" : value,
                  }))
                }
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun véhicule assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun véhicule</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.immatriculation} • {vehicle.marque}{" "}
                      {vehicle.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes (ordre de mission, consignes...)
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Passage par l'école primaire, vérifier les documents du passager..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isView ? "Fermer" : "Annuler"}
            </Button>
            {!isView && (
              <Button
                type="submit"
                disabled={isCreate ? createTrip.isPending : updateTrip.isPending}
              >
                {(isCreate ? createTrip.isPending : updateTrip.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isCreate ? "Créer" : "Enregistrer"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
