import { CreateVehicleDialog } from "@/components/CreateVehicleDialog";
import { VehicleCard } from "@/components/VehicleCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVehicles } from "@/hooks/useVehicles";
import { buildVehicleCardModel } from "@/lib/formatters";
import { useState } from "react";

export default function AdminVehicles() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateVehicle = () => {
    setDialogOpen(true);
  };

  const handleEditVehicle = (id: string) => {
    toast({
      title: "Modifier vǸhicule",
      description: "Ouverture du formulaire de modification",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des VǸhicules</h1>
          <p className="text-muted-foreground mt-1">
            GǸrez la flotte de vǸhicules
          </p>
        </div>
        <Button onClick={handleCreateVehicle} data-testid="button-create-vehicle">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau vǸhicule
        </Button>
      </div>

      <CreateVehicleDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            const card = buildVehicleCardModel(vehicle);
            return (
              <VehicleCard
                key={vehicle.id}
                {...card}
                onEdit={() => handleEditVehicle(vehicle.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
