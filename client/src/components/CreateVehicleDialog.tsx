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
import { useProfile } from "@/hooks/useProfile";
import { useCreateVehicle } from "@/hooks/useVehicles";
import { isAdminRole } from "@shared/roles";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "disponible", label: "Disponible" },
  { value: "en_route", label: "En route" },
  { value: "en_maintenance", label: "Maintenance" },
];

interface CreateVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_FORM = {
  immatriculation: "",
  marque: "",
  modele: "",
  capacite: "",
  statut: STATUS_OPTIONS[0].value,
  chauffeurId: "",
};

export function CreateVehicleDialog({
  open,
  onOpenChange,
}: CreateVehicleDialogProps) {
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const createVehicle = useCreateVehicle();
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM }));
  const isProfileAdmin = isAdminRole(profile?.role);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isProfileAdmin) {
      toast({
        title: "Accès interdit",
        description: "Seuls les administrateurs peuvent ajouter des véhicules.",
        variant: "destructive",
      });
      return;
    }
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

    createVehicle.mutate(
      {
        immatriculation,
        marque,
        modele,
        capacite,
        statut,
        chauffeur_id: chauffeurId || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Succès",
            description: "Véhicule ajouté avec succès",
          });
          setFormData({ ...DEFAULT_FORM });
          onOpenChange(false);
        },
        onError: (error: any) => {
          toast({
            title: "Erreur",
            description: error?.message || "Impossible d'ajouter le véhicule",
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
          <DialogTitle>Nouveau véhicule</DialogTitle>
          <DialogDescription>
            Renseignez les informations pour enregistrer un nouveau véhicule
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="immatriculation">Immatriculation *</Label>
              <Input
                id="immatriculation"
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
              <Label htmlFor="marque">Marque *</Label>
              <Input
                id="marque"
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
              <Label htmlFor="modele">Modèle *</Label>
              <Input
                id="modele"
                placeholder="Sprinter"
                value={formData.modele}
                onChange={(event) =>
                  setFormData({ ...formData, modele: event.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacite">Capacité *</Label>
              <Input
                id="capacite"
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
              <Label htmlFor="statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) =>
                  setFormData({ ...formData, statut: value })
                }
              >
                <SelectTrigger id="statut">
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
              <Label htmlFor="chauffeurId">Chauffeur (optionnel)</Label>
              <Input
                id="chauffeurId"
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
            <Button type="submit" disabled={createVehicle.isPending || !isProfileAdmin}>
              {createVehicle.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
          {!isProfileAdmin && (
            <p className="text-sm text-destructive pt-2">
              Seuls les administrateurs peuvent ajouter des véhicules.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
