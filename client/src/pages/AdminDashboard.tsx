import { useMemo, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Bus,
  MapPin,
  Activity,
  Bell,
  AlertTriangle,
  TrendingUp,
  AlertOctagon,
  Gauge,
  ShieldAlert,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { usePredictiveInsights } from "@/hooks/usePredictiveInsights";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line, LineChart } from "recharts";

const defaultWidgets = ["users", "vehicles", "trips", "active"];

export default function AdminDashboard() {
  const [selectedEntity, setSelectedEntity] = useState("national");
  const [activeWidgets, setActiveWidgets] = useState<string[]>(defaultWidgets);
  const { data, isLoading } = useAdminDashboard(selectedEntity);
  const snapshot = data?.snapshot;
  const alerts = data?.alerts ?? [];
  const incidents = data?.incidents ?? [];
  const anomalyAlerts = data?.anomalyAlerts ?? [];
  const multiEntities = data?.multiEntities ?? [];
  const {
    data: predictive,
    isLoading: predictiveLoading,
    error: predictiveError,
  } = usePredictiveInsights();
  const predictiveAlerts = predictive?.predictiveDashboard?.alerts ?? [];
  const opportunityWindows = predictive?.predictiveDashboard?.opportunityWindows ?? [];
  const pricingInsights = predictive?.pricingInsights ?? [];
  const maintenanceVehicles = predictive?.maintenance?.vehicles ?? [];
  const impactSimulations = predictive?.impactSimulations ?? [];
  const topForecast = predictive?.demandForecast?.[0];

  const widgetConfig = useMemo(
    () => [
      { id: "users", title: "Utilisateurs", value: snapshot?.totals.users ?? "—", icon: Users },
      { id: "vehicles", title: "Véhicules", value: snapshot?.totals.vehicles ?? "—", icon: Bus },
      { id: "trips", title: "Trajets planifiés", value: snapshot?.totals.trips ?? "—", icon: MapPin },
      { id: "active", title: "Trajets actifs", value: snapshot?.activeTrips ?? "—", icon: Activity },
    ],
    [snapshot]
  );

  const predictionSeries = data?.predictions ?? [];
  const baseSeries = predictionSeries.length ? predictionSeries : data?.trends ?? [];
  const chartData = baseSeries.map((point: any) => ({
    day: point.day,
    reservations: Number(point.reservations),
    forecast: point.forecast ?? Math.round(Number(point.reservations) * 1.05),
  }));

  const visibleWidgets = widgetConfig.filter((widget) => activeWidgets.includes(widget.id));

  const handleToggleWidget = (id: string) => {
    setActiveWidgets((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Pilotage multi-entités</h1>
          <p className="text-muted-foreground mt-1">
            Analysez les tendances, simulez les décisions et passez en mode crise en un clic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm">
            Zone
            <select
              className="ml-2 border rounded-md bg-background px-2 py-1"
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
            >
              {(multiEntities.length ? multiEntities : [{ id: "national", name: "Réseau national" }]).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            Widgets :
            {widgetConfig.map((widget) => (
              <label key={widget.id} className="ml-2 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={activeWidgets.includes(widget.id)}
                  onChange={() => handleToggleWidget(widget.id)}
                />
                {widget.title}
              </label>
            ))}
          </div>
        </div>
      </section>

      {data?.mode === "crisis" && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-500/10">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-200">
              <AlertOctagon className="h-5 w-5" />
              Mode crise activé
            </CardTitle>
            <Badge variant="destructive">Urgent</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Cellule d'urgence en cours. Actions recommandées :</p>
            <ul className="list-disc pl-5">
              {data?.crisisActions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? widgetConfig.map((_, idx) => <Skeleton key={idx} className="h-32" />)
          : visibleWidgets.map((card) => <StatsCard key={card.id} {...card} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Assistant IA · Stress r\u00e9seau
            </CardTitle>
            <Badge variant="outline">
              {predictive?.predictiveDashboard?.stressIndex
                ? `Indice ${predictive.predictiveDashboard.stressIndex}`
                : "IA en cours"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictiveLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : predictiveError ? (
              <p className="text-sm text-muted-foreground">
                Impossible de charger les r\u00e9sultats pr\u00e9dictifs. R\u00e9essayez plus tard.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm text-muted-foreground">Stress global</p>
                    <p className="text-4xl font-semibold">
                      {predictive?.predictiveDashboard?.stressIndex ?? "--"}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, predictive?.predictiveDashboard?.stressIndex ?? 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  {topForecast && (
                    <div className="rounded-lg border px-4 py-3 text-sm shadow-sm">
                      <p className="font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        {topForecast.date}
                      </p>
                      <p className="text-muted-foreground">
                        {topForecast.demand} demandes pr\u00e9vues • confiance{" "}
                        {(topForecast.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
                {predictiveAlerts.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-2">Alertes IA</p>
                    <div className="space-y-2">
                      {predictiveAlerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="rounded border p-2 text-sm">
                          <p className="font-medium capitalize">{alert.severity}</p>
                          <p className="text-muted-foreground">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {opportunityWindows.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-2">Fen\u00eatres d'opportunit\u00e9</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunityWindows.slice(0, 3).map((window) => (
                        <Badge key={`${window.route}-${window.window}`} variant="outline" className="gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {window.route} · {window.window}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Tarification dynamique & maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictiveLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : predictiveError ? (
              <p className="text-sm text-muted-foreground">Analyses indisponibles.</p>
            ) : (
              <>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Recommandations tarifaires</p>
                  <div className="mt-2 space-y-2">
                    {pricingInsights.slice(0, 2).map((insight) => (
                      <div key={insight.route} className="rounded border p-2 text-sm">
                        <p className="font-semibold">{insight.route}</p>
                        <p className="text-muted-foreground">{insight.rationale}</p>
                        <Badge variant="outline" className="mt-1">
                          {insight.action === "augmenter" ? "+ " : ""}
                          {insight.delta}% · Occup. {insight.occupancy}%
                        </Badge>
                      </div>
                    ))}
                    {pricingInsights.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun ajustement prioritaire.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground">Surveillance maintenance</p>
                  <div className="mt-2 space-y-2">
                    {maintenanceVehicles.slice(0, 2).map((vehicle) => (
                      <div key={vehicle.vehicleId} className="rounded border p-2 text-sm">
                        <p className="font-semibold">{vehicle.immatriculation}</p>
                        <p className="text-muted-foreground">{vehicle.recommendation}</p>
                        <Badge variant="outline" className="mt-1">
                          Risque {vehicle.riskScore} · {vehicle.incidents} incidents
                        </Badge>
                      </div>
                    ))}
                    {maintenanceVehicles.length === 0 && (
                      <p className="text-sm text-muted-foreground">Flotte stable, aucune alerte.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Sc\u00e9narios simul\u00e9s par l'IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {predictiveLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : predictiveError ? (
            <p className="text-sm text-muted-foreground">Sc\u00e9narios indisponibles.</p>
          ) : impactSimulations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune simulation disponible pour l'instant.</p>
          ) : (
            impactSimulations.slice(0, 3).map((scenario) => (
              <div key={scenario.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{scenario.title}</p>
                  <Badge variant="outline">{(scenario.confidence * 100).toFixed(0)}% confiance</Badge>
                </div>
                <p className="text-muted-foreground">{scenario.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Gain {scenario.expectedGain} · Co\u00fbt {scenario.cost}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendance & prévisions
            </CardTitle>
            <Badge>{snapshot?.reservationsToday ?? 0} rés. aujourd'hui</Badge>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée de réservation.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="reservations" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="forecast" stroke="#f97316" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Alertes système</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte critique.</p>
            ) : (
              alerts.map((alert, idx) => (
                <div key={idx} className="border rounded-md p-3 text-sm">
                  <p className="font-semibold capitalize">{alert.type}</p>
                  <p className="text-muted-foreground">{alert.message}</p>
                  <Badge
                    variant="outline"
                    className={
                      alert.severity === "high"
                        ? "border-red-500 text-red-500"
                        : alert.severity === "medium"
                          ? "border-yellow-500 text-yellow-500"
                          : ""
                    }
                  >
                    Priorité {alert.severity}
                  </Badge>
                </div>
              ))
            )}
            {anomalyAlerts.length > 0 && (
              <div className="border rounded-md p-3 bg-amber-50 text-sm">
                <p className="font-semibold">Anomalies détectées</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {anomalyAlerts.map((alert) => (
                    <li key={alert.date}>{alert.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des entités</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {multiEntities.map((entity) => (
              <div
                key={entity.id}
                className={`border rounded-lg p-3 cursor-pointer ${
                  entity.id === selectedEntity ? "border-primary" : "border-muted"
                }`}
                onClick={() => setSelectedEntity(entity.id)}
              >
                <p className="font-semibold">{entity.name}</p>
                <p className="text-sm text-muted-foreground">
                  {entity.reservationsToday} rés. aujourd'hui
                </p>
                <p className="text-xs text-muted-foreground">{entity.incidents} incidents</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents chauffeurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun incident ouvert.</p>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">{incident.type}</span>
                    <Badge variant="outline">{incident.statut || "ouvert"}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{incident.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
