import { useMemo, useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart3, LineChart, TrendingUp, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "@/lib/chartjs";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useToast } from "@/hooks/use-toast";

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

// Fonction utilitaire pour télécharger un fichier
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fonction pour échapper les valeurs CSV
function escapeCSV(value: any): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AdminStats() {
  const { data, isLoading, error } = useAdminStats();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

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

  // Export CSV
  const exportToCSV = useCallback(() => {
    if (!data) return;
    setExporting(true);
    
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR");
      const lines: string[] = [];
      
      // En-tête
      lines.push("RAPPORT STATISTIQUES - TRANSPORTMANAGER");
      lines.push(`Date d'export: ${dateStr}`);
      lines.push("");
      
      // KPIs
      lines.push("=== INDICATEURS CLÉS (KPIs) ===");
      lines.push("Indicateur,Valeur,Tendance");
      lines.push(`Taux de remplissage,${data.kpis.fillRate.value.toFixed(1)}%,${data.kpis.fillRate.trend >= 0 ? "+" : ""}${data.kpis.fillRate.trend.toFixed(1)} pts vs cible`);
      lines.push(`Ponctualité,${data.kpis.punctuality.value.toFixed(1)}%,${data.kpis.punctuality.trend >= 0 ? "+" : ""}${data.kpis.punctuality.trend.toFixed(1)} pts vs cible`);
      lines.push(`Alertes critiques,${data.kpis.criticalAlerts.value},${data.kpis.criticalAlerts.trend >= 0 ? "+" : ""}${data.kpis.criticalAlerts.trend} vs seuil`);
      lines.push("");
      
      // Tendance générale
      lines.push("=== TENDANCE GÉNÉRALE ===");
      lines.push(`Direction,${data.trend.direction === "up" ? "Ascendante" : data.trend.direction === "down" ? "Baissière" : "Stable"}`);
      lines.push(`Variation,${data.trend.deltaPercent >= 0 ? "+" : ""}${data.trend.deltaPercent.toFixed(1)}%`);
      lines.push("");
      
      // Activité par jour
      lines.push("=== ACTIVITÉ RÉCENTE (7 derniers jours) ===");
      lines.push("Date,Réservations");
      data.activity.forEach(entry => {
        lines.push(`${entry.day},${entry.reservations}`);
      });
      lines.push("");
      
      // Taux de remplissage
      lines.push("=== REMPLISSAGE DES TRAJETS ===");
      lines.push("Catégorie,Nombre de trajets");
      data.occupancyBuckets.forEach(bucket => {
        lines.push(`${escapeCSV(bucket.label)},${bucket.count}`);
      });
      lines.push("");
      
      // État de la flotte
      lines.push("=== ÉTAT DE LA FLOTTE ===");
      lines.push("Statut,Nombre de véhicules");
      data.vehicleStatusCounts.forEach(v => {
        lines.push(`${escapeCSV(v.status || "Inconnu")},${v.count}`);
      });
      lines.push("");
      
      // Alertes système
      if (data.systemAlerts.length > 0) {
        lines.push("=== ALERTES SYSTÈME ===");
        lines.push("ID,Message,Sévérité");
        data.systemAlerts.forEach(alert => {
          lines.push(`${escapeCSV(alert.id)},${escapeCSV(alert.message)},${escapeCSV(alert.severity)}`);
        });
      }
      
      const csvContent = lines.join("\n");
      const filename = `statistiques_${now.toISOString().split("T")[0]}.csv`;
      downloadFile(csvContent, filename, "text/csv;charset=utf-8");
      
      toast({
        title: "Export CSV réussi",
        description: `Le fichier ${filename} a été téléchargé.`,
      });
    } catch (err) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les statistiques en CSV.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [data, toast]);

  // Export PDF (HTML vers impression)
  const exportToPDF = useCallback(() => {
    if (!data) return;
    setExporting(true);
    
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
      
      // Créer le contenu HTML pour l'impression
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Statistiques TransportManager - ${dateStr}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: 40px; 
              color: #1f2937;
              line-height: 1.5;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .header h1 { 
              font-size: 28px; 
              color: #111827;
              margin-bottom: 5px;
            }
            .header p { 
              color: #6b7280; 
              font-size: 14px; 
            }
            .section { 
              margin-bottom: 30px; 
            }
            .section h2 { 
              font-size: 18px; 
              color: #374151;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .kpi-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 15px; 
            }
            .kpi-card { 
              padding: 20px; 
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: #f9fafb;
            }
            .kpi-card h3 { 
              font-size: 14px; 
              color: #6b7280;
              margin-bottom: 8px;
            }
            .kpi-card .value { 
              font-size: 28px; 
              font-weight: 700;
              color: #111827;
            }
            .kpi-card .trend { 
              font-size: 12px; 
              color: #6b7280;
              margin-top: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
            }
            th, td { 
              padding: 10px 12px; 
              text-align: left; 
              border-bottom: 1px solid #e5e7eb;
            }
            th { 
              background: #f3f4f6; 
              font-weight: 600;
              font-size: 13px;
              color: #374151;
            }
            td { 
              font-size: 14px; 
            }
            .trend-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
            }
            .trend-up { background: #d1fae5; color: #065f46; }
            .trend-down { background: #fee2e2; color: #991b1b; }
            .trend-stable { background: #e5e7eb; color: #374151; }
            .alert-critical { color: #dc2626; }
            .alert-warning { color: #d97706; }
            .alert-info { color: #059669; }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 20px; }
              .kpi-grid { grid-template-columns: repeat(3, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Rapport Statistiques</h1>
            <p>TransportManager - ${dateStr}</p>
          </div>

          <div class="section">
            <h2>Indicateurs Clés de Performance (KPIs)</h2>
            <div class="kpi-grid">
              <div class="kpi-card">
                <h3>Taux de remplissage</h3>
                <div class="value">${data.kpis.fillRate.value.toFixed(1)}%</div>
                <div class="trend">${data.kpis.fillRate.trend >= 0 ? "+" : ""}${data.kpis.fillRate.trend.toFixed(1)} pts vs cible</div>
              </div>
              <div class="kpi-card">
                <h3>Ponctualité</h3>
                <div class="value">${data.kpis.punctuality.value.toFixed(1)}%</div>
                <div class="trend">${data.kpis.punctuality.trend >= 0 ? "+" : ""}${data.kpis.punctuality.trend.toFixed(1)} pts vs cible</div>
              </div>
              <div class="kpi-card">
                <h3>Alertes critiques</h3>
                <div class="value">${data.kpis.criticalAlerts.value}</div>
                <div class="trend">${data.kpis.criticalAlerts.trend >= 0 ? "+" : ""}${data.kpis.criticalAlerts.trend} vs seuil</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Tendance Générale</h2>
            <p>
              <span class="trend-badge ${data.trend.direction === "up" ? "trend-up" : data.trend.direction === "down" ? "trend-down" : "trend-stable"}">
                ${data.trend.direction === "up" ? "↑ Ascendante" : data.trend.direction === "down" ? "↓ Baissière" : "→ Stable"}
              </span>
              sur la dernière semaine, ${data.trend.deltaPercent >= 0 ? "+" : ""}${data.trend.deltaPercent.toFixed(1)}% vs la moyenne.
            </p>
          </div>

          <div class="section">
            <h2>Activité des 7 derniers jours</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Réservations</th>
                </tr>
              </thead>
              <tbody>
                ${data.activity.map(entry => `
                  <tr>
                    <td>${new Date(entry.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}</td>
                    <td>${entry.reservations}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Remplissage des Trajets</h2>
            <table>
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Nombre de trajets</th>
                </tr>
              </thead>
              <tbody>
                ${data.occupancyBuckets.map(bucket => `
                  <tr>
                    <td>${bucket.label}</td>
                    <td>${bucket.count}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>État de la Flotte</h2>
            <table>
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Nombre de véhicules</th>
                </tr>
              </thead>
              <tbody>
                ${data.vehicleStatusCounts.map(v => `
                  <tr>
                    <td>${v.status || "Inconnu"}</td>
                    <td>${v.count}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          ${data.systemAlerts.length > 0 ? `
          <div class="section">
            <h2>Alertes Système</h2>
            <table>
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Sévérité</th>
                </tr>
              </thead>
              <tbody>
                ${data.systemAlerts.map(alert => `
                  <tr>
                    <td>${alert.message}</td>
                    <td class="${alert.severity === "critical" ? "alert-critical" : alert.severity === "warning" ? "alert-warning" : "alert-info"}">
                      ${alert.severity === "critical" ? "Critique" : alert.severity === "warning" ? "Alerte" : "Info"}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          ` : ""}

          <div class="footer">
            <p>Rapport généré automatiquement par TransportManager</p>
            <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
          </div>
        </body>
        </html>
      `;
      
      // Ouvrir une nouvelle fenêtre pour l'impression
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({
        title: "Export PDF préparé",
        description: "La fenêtre d'impression s'est ouverte. Choisissez 'Enregistrer en PDF' comme destination.",
      });
    } catch (err) {
      toast({
        title: "Erreur d'export",
        description: "Impossible de préparer l'export PDF.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [data, toast]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Statistiques</h1>
          <p className="text-muted-foreground">
            Données consolidées pour piloter la performance de la flotte.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled={isLoading || !data || exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              Exporter en CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" />
              Exporter en PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

