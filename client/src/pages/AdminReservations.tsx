import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock3, ListChecks } from "lucide-react";

const statusOverview = [
  { label: "Confirmées", value: "48", detail: "Lampes de bord disposées", color: "bg-emerald-500/20" },
  { label: "En attente", value: "16", detail: "Besoin d'affectation véhicule", color: "bg-amber-500/20" },
  { label: "Annulées", value: "4", detail: "Alertes et remboursements", color: "bg-red-500/20" },
];

const timeline = [
  { time: "08:00", label: "Accueil client Bardo", status: "Confirmée" },
  { time: "09:30", label: "Navette Tunis-Marsa", status: "En attente chauffeur" },
  { time: "12:20", label: "Circuit port", status: "Confirmée" },
];

export default function AdminReservations() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Réservations</h1>
          <p className="text-muted-foreground">
            Suivez les flux, anticipez la demande et inspectez les dossiers ouverts.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ListChecks className="h-4 w-4" />
          Générer un rapport
        </Button>
      </header>

      <Card className="bg-gradient-to-r from-indigo-700/80 to-slate-900/60 text-white">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/80">Tendance hebdo</p>
              <h3 className="text-3xl font-semibold">+24% de réservations en 7 jours</h3>
            </div>
            <Badge variant="default" className="bg-white/20">
              Automatique
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <CalendarCheck className="h-5 w-5" />
            <span>Prochain créneau: 14h15 - Tunis Sud → Hammamet</span>
            <div className="ml-auto flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
              <Clock3 className="h-4 w-4" />
              Mise à jour : il y a 2 min
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {statusOverview.map((status) => (
          <Card
            key={status.label}
            className={`${status.color} border border-white/10 bg-white/5`}
          >
            <CardHeader className="space-y-1">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {status.label}
              </p>
              <p className="text-3xl font-semibold">{status.value}</p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {status.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Événements planifiés</CardTitle>
            <CardContent className="text-sm text-muted-foreground">
              Suivi en temps réel des trajets critiques.
            </CardContent>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {timeline.map((item) => (
              <div key={item.time} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.status}</p>
                </div>
                <Badge variant="outline">{item.time}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Préférences de dossiers</CardTitle>
            <CardDescription>Filtrez automatiquement par secteur et coefficient.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Réservations VIP</p>
                <p className="text-xs text-muted-foreground">Priorité haute sur les routes côtières</p>
              </div>
              <Badge variant="default" className="bg-emerald-500/10 text-green-300">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Blocage routier</p>
                <p className="text-xs text-muted-foreground">Routes en maintenance</p>
              </div>
              <Badge variant="destructive" className="bg-red-500/10 text-red-300">
                Alerte
              </Badge>
            </div>
            <Button variant="outline">Paramétrer les alertes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
