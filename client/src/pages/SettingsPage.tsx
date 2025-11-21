import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, BellRing, ShieldCheck } from "lucide-react";
import { PersonalizationConsole } from "@/components/PersonalizationConsole";
import { AccessibilityConsole } from "@/components/AccessibilityConsole";

const settingsOptions = [
  {
    label: "Alertes critiques",
    description: "Recevoir une notification par e-mail et push pour les incidents majeurs.",
    icon: BellRing,
  },
  {
    label: "Mises à jour automatiques",
    description: "Télécharger les synchronisations de la flotte tous les matins.",
    icon: ShieldCheck,
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState({
    alerts: true,
    maintenance: false,
  });

  const toggle = (key: keyof typeof toggles) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Paramètres de la plateforme</h1>
          <p className="text-muted-foreground">
            Ajustez les comportements globaux et les notifications sécurisées.
          </p>
        </div>
        <Button variant="ghost" className="gap-2">
          <Settings className="h-4 w-4" />
          Gestion avancée
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsOptions.map((option) => (
              <div
                key={option.label}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <option.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between">
                <span className="text-sm font-semibold">Alertes par SMS</span>
                <Switch checked={toggles.alerts} onCheckedChange={() => toggle("alerts")} />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-semibold">Maintenance directe</span>
                <Switch checked={toggles.maintenance} onCheckedChange={() => toggle("maintenance")} />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Préférences rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Saisissez un contact opérationnel pour les interventions express.</p>
              <p className="mt-2 text-lg font-semibold">+216 55 123 456</p>
              <Badge variant="outline" className="mt-2">
                Priorité Haute
              </Badge>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Colorimétrie du tableau</p>
              <div className="mt-3 flex items-center gap-3">
                {["#0f172a", "#1d4ed8", "#0ea5e9"].map((color) => (
                  <span key={color} className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Button className="w-full">Enregistrer les préférences</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonalizationConsole />
        <AccessibilityConsole />
      </div>
    </div>
  );
}
