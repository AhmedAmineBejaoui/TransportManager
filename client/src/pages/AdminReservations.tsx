import { useMemo } from "react";
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
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminReservations() {
  const { data, isLoading } = useAdminDashboard();

  const todaySummary = useMemo(() => {
    if (!data) {
      return { confirmed: 0, pending: 0, cancelled: 0 };
    }
    const today = new Date().toISOString().slice(0, 10);
    const todayTrend = data.trends.find((t) => t.day === today);

    const confirmed = data.snapshot.reservationsToday;
    const pending = Math.max(0, (todayTrend?.reservations ?? 0) - confirmed);
    const cancelled = 0;

    return { confirmed, pending, cancelled };
  }, [data]);

  const statusOverview = [
    {
      label: "Confirmées",
      value: String(todaySummary.confirmed),
      detail: "Réservations enregistrées aujourd'hui",
      color: "bg-emerald-500/10",
    },
    {
      label: "En attente",
      value: String(todaySummary.pending),
      detail: "Dossiers à confirmer ou affecter",
      color: "bg-amber-500/10",
    },
    {
      label: "Annulées",
      value: String(todaySummary.cancelled),
      detail: "Annulations ou no‑show",
      color: "bg-red-500/10",
    },
  ];

  const lastDays = useMemo(() => {
    if (!data) return [];
    return [...data.trends]
      .slice(-3)
      .reverse()
      .map((t) => ({
        day: t.day,
        reservations: t.reservations,
        revenue: Number(t.revenue),
      }));
  }, [data]);

  const todayLabel = useMemo(
    () => format(new Date(), "EEEE dd MMMM", { locale: fr }),
    [],
  );

  const handleExportReport = () => {
    if (!data) return;

    const rows = [
      ["Jour", "Réservations", "Revenu (DT)"],
      ...data.trends.map((t) => [t.day, String(t.reservations), String(t.revenue)]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Réservations</h1>
          <p className="text-muted-foreground">
            Suivez les flux, anticipez la demande et inspectez les dossiers ouverts.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExportReport}
          disabled={!data}
        >
          <ListChecks className="h-4 w-4" />
          Générer un rapport
        </Button>
      </header>

      <Card className="bg-gradient-to-r from-indigo-700/80 to-slate-900/60 text-white">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/80">
                Tendance hebdo
              </p>
              <h3 className="text-3xl font-semibold">
                {data
                  ? `${data.trends.length} jour(s) de réservations suivies`
                  : "Chargement des tendances..."}
              </h3>
            </div>
            <Badge variant="default" className="bg-white/20">
              Automatique
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <CalendarCheck className="h-5 w-5" />
            <span>
              {`Aujourd'hui : ${todayLabel} • ${todaySummary.confirmed} réservation(s) confirmée(s)`}
            </span>
            <div className="ml-auto flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
              <Clock3 className="h-4 w-4" />
              {data ? "Données temps réel" : "Chargement..."}
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
            <CardTitle>Événements récents</CardTitle>
            <CardDescription>
              Derniers jours avec trafic de réservations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Chargement des données…
              </p>
            ) : lastDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune réservation enregistrée récemment.
              </p>
            ) : (
              lastDays.map((item) => (
                <div
                  key={item.day}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {format(new Date(item.day), "EEEE dd MMM", { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.reservations} réservation(s) •{" "}
                      {item.revenue.toFixed(2)} DT
                    </p>
                  </div>
                  <Badge variant="outline">
                    {item.reservations > 0 ? "Trafic" : "Calme"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Préférences de dossiers</CardTitle>
            <CardDescription>
              Filtrez automatiquement par secteur et coefficient.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Réservations VIP</p>
                <p className="text-xs text-muted-foreground">
                  Priorité haute sur les routes côtières
                </p>
              </div>
              <Badge
                variant="default"
                className="bg-emerald-500/10 text-green-300"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Blocage routier</p>
                <p className="text-xs text-muted-foreground">
                  Routes en maintenance
                </p>
              </div>
              <Badge
                variant="destructive"
                className="bg-red-500/10 text-red-300"
              >
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
