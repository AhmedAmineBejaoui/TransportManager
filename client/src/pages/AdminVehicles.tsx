import { CreateVehicleDialog } from "@/components/CreateVehicleDialog";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { VehicleCard } from "@/components/VehicleCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVehicles } from "@/hooks/useVehicles";
import { buildVehicleCardModel } from "@/lib/formatters";
import { useState } from "react";
import type { Vehicle } from "@shared/schema";

export default function AdminVehicles() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  const handleCreateVehicle = () => {
    setCreateDialogOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des Véhicules</h1>
          <p className="text-muted-foreground mt-1">
            Gérez la flotte de véhicules
          </p>
        </div>
        <Button onClick={handleCreateVehicle} data-testid="button-create-vehicle">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau véhicule
        </Button>
      </div>

      <CreateVehicleDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <EditVehicleDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        vehicle={vehicleToEdit} 
      />

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
                onEdit={() => handleEditVehicle(vehicle)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
