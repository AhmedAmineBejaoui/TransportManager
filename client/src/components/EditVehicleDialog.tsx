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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateVehicle } from "@/hooks/useVehicles";
import { isAdminRole } from "@shared/roles";
import { Loader2 } from "lucide-react";
import type { Vehicle } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "disponible", label: "Disponible" },
  { value: "en_route", label: "En route" },
  { value: "en_maintenance", label: "Maintenance" },
];

interface EditVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

export function EditVehicleDialog({
  open,
  onOpenChange,
  vehicle,
}: EditVehicleDialogProps) {
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const updateVehicle = useUpdateVehicle();
  const [formData, setFormData] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    capacite: "",
    statut: "",
    chauffeurId: "",
  });
  const isProfileAdmin = isAdminRole(profile?.role);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        immatriculation: vehicle.immatriculation,
        marque: vehicle.marque,
        modele: vehicle.modele,
        capacite: vehicle.capacite.toString(),
        statut: vehicle.statut,
        chauffeurId: vehicle.chauffeur_id ? vehicle.chauffeur_id.toString() : "",
      });
    }
  }, [vehicle]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isProfileAdmin) {
      toast({
        title: "Accès interdit",
        description: "Seuls les administrateurs peuvent modifier des véhicules.",
        variant: "destructive",
      });
      return;
    }

    if (!vehicle) return;

    const immatriculation = formData.immatriculation.trim();
    const marque = formData.marque.trim();
    const modele = formData.modele.trim();
    const capacite = parseInt(formData.capacite, 10);
    const statut = formData.statut;
    const chauffeurId = formData.chauffeurId.trim();

    if (!immatriculation || !marque || !modele) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir l'immatriculation, la marque et le modèle",
        variant: "destructive",
      });
      return;
    }

    if (Number.isNaN(capacite) || capacite <= 0) {
      toast({
        title: "Erreur",
        description: "La capacité doit être un nombre positif",
        variant: "destructive",
      });
      return;
    }

    updateVehicle.mutate(
      {
        id: vehicle.id,
        data: {
          immatriculation,
          marque,
          modele,
          capacite,
          statut,
          chauffeur_id: chauffeurId ? parseInt(chauffeurId) : null,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Succès",
            description: "Véhicule modifié avec succès",
          });
          onOpenChange(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de modifier le véhicule",
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
          <DialogTitle>Modifier le véhicule</DialogTitle>
          <DialogDescription>
            Modifiez les informations du véhicule
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-immatriculation">Immatriculation *</Label>
              <Input
                id="edit-immatriculation"
                placeholder="123-AB-456"
                value={formData.immatriculation}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    immatriculation: event.target.value,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-marque">Marque *</Label>
              <Input
                id="edit-marque"
                placeholder="Mercedes"
                value={formData.marque}
                onChange={(event) =>
                  setFormData({ ...formData, marque: event.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-modele">Modèle *</Label>
              <Input
                id="edit-modele"
                placeholder="Sprinter"
                value={formData.modele}
                onChange={(event) =>
                  setFormData({ ...formData, modele: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacite">Capacité *</Label>
              <Input
                id="edit-capacite"
                type="number"
                min="1"
                placeholder="25"
                value={formData.capacite}
                onChange={(event) =>
                  setFormData({ ...formData, capacite: event.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) =>
                  setFormData({ ...formData, statut: value })
                }
              >
                <SelectTrigger id="edit-statut">
                  <SelectValue placeholder="Disponible" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-chauffeurId">Chauffeur (optionnel)</Label>
              <Input
                id="edit-chauffeurId"
                placeholder="ID du chauffeur"
                value={formData.chauffeurId}
                onChange={(event) =>
                  setFormData({ ...formData, chauffeurId: event.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateVehicle.isPending || !isProfileAdmin}>
              {updateVehicle.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
          {!isProfileAdmin && (
            <p className="text-sm text-destructive pt-2">
              Seuls les administrateurs peuvent modifier des véhicules.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
