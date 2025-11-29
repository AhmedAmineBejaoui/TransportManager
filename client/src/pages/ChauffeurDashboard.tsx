import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Clock,
  Users,
  CheckCircle,
  FileText,
  MessageCircle,
  AlertTriangle,
  Navigation2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useChauffeurTrips, useUpdateTrip } from "@/hooks/useTrips";
import { normalizeTripStatus } from "@/lib/formatters";
import { useChauffeurStats, useChauffeurIncidents, useCreateIncident } from "@/hooks/useChauffeurInsights";
import { SupportChatDrawer } from "@/components/SupportChatDrawer";

const incidentOptions = [
  { value: "trafic", label: "Trafic dense" },
  { value: "panne", label: "Panne / maintenance" },
  { value: "accident", label: "Accident" },
  { value: "urgence", label: "Urgence passager" },
  { value: "autre", label: "Autre" },
];

export default function ChauffeurDashboard() {
  const { data: trips = [], isLoading } = useChauffeurTrips();
  const { data: stats } = useChauffeurStats();
  const { data: incidents = [] } = useChauffeurIncidents();
  const updateTrip = useUpdateTrip();
  const createIncident = useCreateIncident();
  const { toast } = useToast();
  const [incidentType, setIncidentType] = useState("trafic");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const statusConfig = {
    planifie: { label: "Planifié", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    en_cours: { label: "En cours", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    termine: { label: "Terminé", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
    annule: { label: "Annulé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  } as const;

  const handleStartTrip = (tripId: string) => {
    updateTrip.mutate(
      { id: tripId, data: { statut: "en_cours" } },
      {
        onSuccess: () => toast({ title: "Trajet démarré", description: "Le dispatch est informé." }),
        onError: (error: any) =>
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de démarrer le trajet",
            variant: "destructive",
          }),
      }
    );
  };

  const handleCompleteTrip = (tripId: string) => {
    updateTrip.mutate(
      { id: tripId, data: { statut: "termine" } },
      {
        onSuccess: () => toast({ title: "Trajet terminé", description: "Merci pour votre ponctualité." }),
        onError: (error: any) =>
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de terminer le trajet",
            variant: "destructive",
          }),
      }
    );
  };

  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDescription.trim()) {
      return toast({ title: "Ajoutez une description", variant: "destructive" });
    }
    createIncident.mutate(
      { type: incidentType, description: incidentDescription },
      {
        onSuccess: () => {
          setIncidentDescription("");
          toast({ title: "Incident transmis", description: "Le centre est alerté." });
        },
        onError: () => toast({ title: "Impossible d'envoyer", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Centre Chauffeur</h1>
        <p className="text-muted-foreground mt-1">Gérez votre planning, vos incidents et vos documents.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Trajets totaux" value={stats?.totalTrips ?? "—"} icon={MapPin} />
        <StatsCard title="À venir" value={stats?.upcomingTrips ?? "—"} icon={Clock} />
        <StatsCard title="Terminés" value={stats?.completedTrips ?? "—"} icon={CheckCircle} />
        <StatsCard title="Kilomètres" value={`${stats?.distanceKm ?? "—"} km`} icon={Navigation2} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Documents & disponibilité</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DocumentItem label="Permis poids lourd" value="Valide" />
            <DocumentItem label="Assurance véhicule" value="À renouveler (12/2025)" />
            <DocumentItem label="Disponibilité" value="Lun - Sam / 06h-22h" />
            <DocumentItem label="Préférences" value="Notifications push + SMS" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Support dispatch</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Hotline : +216 71 000 000</p>
            <p>Radio : Canal 12 “TransportPro”</p>
            <Button className="w-full" variant="outline" onClick={() => setChatOpen(true)}>
              Ouvrir le chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Planning des trajets</h2>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun trajet assigné</div>
        ) : (
          trips.map((trip) => {
            const statusKey = normalizeTripStatus(trip.statut);
            const status = statusConfig[statusKey];
            return (
              <Card key={trip.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{trip.point_depart}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <div className="h-4 w-px bg-border" />
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-destructive" />
                        <span className="font-semibold">{trip.point_arrivee}</span>
                      </div>
                    </div>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoRow
                      icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                      label={`${format(new Date(trip.heure_depart_prevue), "dd MMM HH:mm", { locale: fr })} → ${format(
                        new Date(trip.heure_arrivee_prevue),
                        "HH:mm",
                        { locale: fr }
                      )}`}
                    />
                    <InfoRow
                      icon={<Users className="h-4 w-4 text-muted-foreground" />}
                      label={`${trip.places_disponibles} places restantes`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Véhicule : {trip.vehicle_id ?? "Non assigné"}</p>
                  <div className="flex gap-2">
                    {statusKey === "planifie" && (
                      <Button className="flex-1" onClick={() => handleStartTrip(trip.id)} disabled={updateTrip.isPending}>
                        Démarrer
                      </Button>
                    )}
                    {statusKey === "en_cours" && (
                      <Button
                        className="flex-1"
                        variant="default"
                        onClick={() => handleCompleteTrip(trip.id)}
                        disabled={updateTrip.isPending}
                      >
                        Terminer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Incidents déclarés</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun incident signalé cette semaine.</p>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold capitalize">{incident.type}</span>
                    <Badge variant="outline">{incident.statut || "ouvert"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{incident.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {incident.created_at
                      ? format(new Date(incident.created_at), "dd MMM yyyy HH:mm", { locale: fr })
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signaler un incident</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleIncidentSubmit}>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-transparent mt-1"
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                >
                  {incidentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Décrivez le problème rencontré..."
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createIncident.isPending}>
                Envoyer à l'opérateur
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <SupportChatDrawer open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
};

function StatsCard({ title, value, icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DocumentItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
  );
}
