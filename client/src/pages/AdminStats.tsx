import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart, TrendingUp } from "lucide-react";

const kpiData = [
  { label: "Taux de remplissage", value: "87%", trend: "+3.5%", variant: "bg-emerald-500/10" },
  { label: "Ponctualité", value: "94%", trend: "+1.2%", variant: "bg-sky-500/10" },
  { label: "Alertes critiques", value: "2", trend: "-1", variant: "bg-red-500/10" },
];

const activityBars = [
  { day: "Lun", height: 36 },
  { day: "Mar", height: 48 },
  { day: "Mer", height: 28 },
  { day: "Jeu", height: 60 },
  { day: "Ven", height: 52 },
  { day: "Sam", height: 40 },
];

export default function AdminStats() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Statistiques</h1>
          <p className="text-muted-foreground">
            Données consolidées pour piloter la performance de la flotte.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Exporter
        </Button>
      </header>

      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">Visibilité instantanée</CardTitle>
              <p className="text-sm text-white/70">
                Réservations, incidents et maintenance en une vue.
              </p>
            </div>
            <Badge className="bg-white/20 text-white">Live</Badge>
          </div>
          <div className="flex items-center gap-3">
            <LineChart className="h-6 w-6" />
            <p className="text-sm text-white/80">
              Tendance ascendante sur la dernière semaine, + 11% vs la moyenne.
            </p>
            <TrendingUp className="h-5 w-5 text-emerald-300" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {kpiData.map((entry) => (
          <Card key={entry.label} className={`${entry.variant} border border-white/10 bg-white/5`}>
            <CardHeader>
              <CardTitle className="text-lg">{entry.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold">{entry.value}</p>
                <p className="text-xs text-muted-foreground">{entry.trend}</p>
              </div>
              <Badge variant="outline">Comparaison</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Activité horaire</CardTitle>
            <p className="text-sm text-muted-foreground">Réservations confirmées par jour</p>
          </CardHeader>
          <CardContent className="flex items-end justify-around gap-4">
            {activityBars.map((bar) => (
              <div key={bar.day} className="flex flex-col items-center gap-2">
                <div
                  className="w-8 rounded-full bg-gradient-to-b from-indigo-500/80 to-slate-900"
                  style={{ height: `${bar.height}px` }}
                />
                <p className="text-xs">{bar.day}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Alertes système</CardTitle>
            <p className="text-sm text-muted-foreground">
              Les incidents, maintenances ou anomalies détectées.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Aucun incident critique enregistré aujourd'hui.",
              "Maintenance programmée : Route A1 (11h-13h).",
              "Risque météo : humidité élevée dans le nord.",
            ].map((note) => (
              <div key={note} className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">{note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
