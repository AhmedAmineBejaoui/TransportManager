import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bus, Users, User, Wrench } from "lucide-react";

export type VehicleCardProps = {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  capacite: number;
  statut: "disponible" | "en_route" | "en_maintenance";
  chauffeur?: string;
  onEdit?: () => void;
};

const statusConfig = {
  disponible: { label: "Disponible", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  en_route: { label: "En route", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  en_maintenance: { label: "Maintenance", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
};

export function VehicleCard({
  id,
  immatriculation,
  marque,
  modele,
  capacite,
  statut,
  chauffeur,
  onEdit,
}: VehicleCardProps) {
  const status = statusConfig[statut];

  return (
    <Card className="hover-elevate" data-testid={`card-vehicle-${id}`}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Bus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{marque} {modele}</CardTitle>
            <p className="text-sm text-muted-foreground font-mono">{immatriculation}</p>
          </div>
        </div>
        <Badge className={status.className} data-testid={`badge-vehicle-status-${id}`}>
          {status.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{capacite} places</span>
          </div>
        </div>

        {chauffeur ? (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{chauffeur}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Aucun chauffeur assigné</span>
          </div>
        )}

        {statut === "en_maintenance" && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Wrench className="h-4 w-4" />
            <span>En maintenance</span>
          </div>
        )}

        {onEdit && (
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={onEdit}
            data-testid={`button-edit-vehicle-${id}`}
          >
            Modifier
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
