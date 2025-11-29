import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, LineChart, TrendingUp } from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "@/lib/chartjs";
import { useAdminStats } from "@/hooks/useAdminStats";

function formatDayLabel(isoDay: string) {
  try {
    const date = new Date(isoDay);
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  } catch {
    return isoDay;
  }
}

const KPI_VARIANTS: Record<string, string> = {
  fillRate: "bg-emerald-500/10",
  punctuality: "bg-sky-500/10",
  criticalAlerts: "bg-red-500/10",
};

export default function AdminStats() {
  const { data, isLoading, error } = useAdminStats();

  const kpiCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "fillRate",
        label: "Taux de remplissage",
        value: `${data.kpis.fillRate.value.toFixed(1)}%`,
        trend: `${data.kpis.fillRate.trend >= 0 ? "+" : ""}${data.kpis.fillRate.trend.toFixed(1)} pts vs cible`,
      },
      {
        id: "punctuality",
        label: "Ponctualité",
        value: `${data.kpis.punctuality.value.toFixed(1)}%`,
        trend: `${data.kpis.punctuality.trend >= 0 ? "+" : ""}${data.kpis.punctuality.trend.toFixed(1)} pts vs cible`,
      },
      {
        id: "criticalAlerts",
        label: "Alertes critiques",
        value: String(data.kpis.criticalAlerts.value),
        trend: `${data.kpis.criticalAlerts.trend >= 0 ? "+" : ""}${data.kpis.criticalAlerts.trend} vs seuil`,
      },
    ];
  }, [data]);

  const activityChart = useMemo(() => {
    if (!data) return null;
    const labels = data.activity.map((entry) => formatDayLabel(entry.day));
    return {
      data: {
        labels,
        datasets: [
          {
            label: "Réservations",
            data: data.activity.map((entry) => entry.reservations),
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79,70,229,0.15)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            grid: { color: "rgba(148,163,184,0.2)" },
            ticks: { stepSize: 1, precision: 0 },
          },
        },
      },
    };
  }, [data]);

  const occupancyChart = useMemo(() => {
    if (!data) return null;
    return {
      data: {
        labels: data.occupancyBuckets.map((b) => b.label),
        datasets: [
          {
            label: "Trajets",
            data: data.occupancyBuckets.map((b) => b.count),
            backgroundColor: ["#93c5fd", "#60a5fa", "#2563eb"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: "rgba(148,163,184,0.2)" },
            ticks: { precision: 0, stepSize: 1 },
          },
        },
      },
    };
  }, [data]);

  const vehicleDoughnut = useMemo(() => {
    if (!data) return null;
    const labels = data.vehicleStatusCounts.map((v) => v.status || "Inconnu");
    return {
      data: {
        labels,
        datasets: [
          {
            data: data.vehicleStatusCounts.map((v) => v.count),
            backgroundColor: ["#22c55e", "#eab308", "#ef4444", "#6b7280"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom" as const,
          },
        },
      },
    };
  }, [data]);

  const systemAlerts = data?.systemAlerts ?? [];

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
          <div className="flex flex-wrap items-center gap-3">
            <LineChart className="h-6 w-6" />
            {isLoading ? (
              <Skeleton className="h-4 w-64 bg-white/20" />
            ) : error ? (
              <p className="text-sm text-red-200">Impossible de charger la tendance.</p>
            ) : (
              <p className="text-sm text-white/80">
                Tendance{" "}
                {data!.trend.direction === "up"
                  ? "ascendante"
                  : data!.trend.direction === "down"
                    ? "baissière"
                    : "stable"}{" "}
                sur la dernière semaine,{" "}
                {data!.trend.deltaPercent >= 0 ? "+" : ""}
                {data!.trend.deltaPercent.toFixed(1)}% vs la moyenne.
              </p>
            )}
            <TrendingUp className="h-5 w-5 text-emerald-300" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading && (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        )}
        {!isLoading &&
          !error &&
          kpiCards.map((entry) => (
            <Card
              key={entry.id}
              className={`${KPI_VARIANTS[entry.id] ?? "bg-slate-500/10"} border border-white/10 bg-white/5`}
            >
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

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <p className="text-sm text-muted-foreground">
              Réservations confirmées par jour sur la dernière semaine.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading || !activityChart ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Line data={activityChart.data} options={activityChart.options as any} />
            )}
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
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : systemAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte critique en cours.</p>
            ) : (
              systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border px-4 py-3 text-sm flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{alert.message}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      alert.severity === "critical"
                        ? "border-red-500 text-red-600"
                        : alert.severity === "warning"
                          ? "border-amber-500 text-amber-600"
                          : "border-emerald-500 text-emerald-600"
                    }
                  >
                    {alert.severity === "critical"
                      ? "Critique"
                      : alert.severity === "warning"
                        ? "Alerte"
                        : "Info"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Remplissage des trajets</CardTitle>
            <p className="text-sm text-muted-foreground">
              Répartition des trajets par taux de remplissage sur l&apos;horizon de 7 jours.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading || !occupancyChart ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Bar data={occupancyChart.data} options={occupancyChart.options as any} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>État de la flotte</CardTitle>
            <p className="text-sm text-muted-foreground">
              Répartition des véhicules par statut opérationnel.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading || !vehicleDoughnut ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Doughnut data={vehicleDoughnut.data} options={vehicleDoughnut.options as any} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

