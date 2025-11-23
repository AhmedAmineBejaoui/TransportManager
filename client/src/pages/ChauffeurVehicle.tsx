import { useState } from "react";
import {
  AlertTriangle,
  Battery,
  Bus,
  CheckCircle2,
  ClipboardList,
  FileText,
  Fuel,
  Gauge,
  Key,
  ShieldCheck,
  TimerReset,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const vehicleInfo = {
  marque: "Mercedes Sprinter",
  modele: "316 CDI",
  plaque: "201 TUN 3321",
  kilometrage: "182 400 km",
  carburant: "Diesel B7",
  miseEnService: "2023-04-12",
  capacite: "17 places assises",
  charge: "1.2 T de charge utile",
};

const checklistBefore = [
  { label: "Pression pneus verifiee", status: "ok" },
  { label: "Feux et clignotants", status: "ok" },
  { label: "Freins testes", status: "ok" },
  { label: "Documents a bord", status: "attention" },
  { label: "Nettoyage rapide habitacle", status: "ok" },
];

const checklistAfter = [
  { label: "Aucun incident constate", status: "ok" },
  { label: "Plein partiel ou recharge", status: "attention" },
  { label: "Etat carrosserie (rayures)", status: "ok" },
  { label: "Objets oublies verifie", status: "ok" },
  { label: "Kilometrage note pour rapport", status: "ok" },
];

const maintenanceUpcoming = [
  { title: "Vidange + filtres", date: "26 nov 2025", detail: "Garage central - 14h00", priority: "haute" },
  { title: "Controle freins", date: "05 dec 2025", detail: "Mesure disques et plaquettes", priority: "moyenne" },
];

const maintenanceHistory = [
  { title: "Changement pneus avant", date: "10 nov 2025", detail: "Nouveaux pneus hiver", status: "termine" },
  { title: "Recharge climatisation", date: "20 oct 2025", detail: "Circuit verifie", status: "termine" },
];

const documents = [
  { title: "Assurance", status: "valide", expiration: "30/03/2026" },
  { title: "Carte grise", status: "valide", expiration: "Non perim" },
  { title: "Controle technique", status: "a renouveler", expiration: "15/02/2026" },
  { title: "Attestation assurance", status: "valide", expiration: "30/03/2026" },
  { title: "Fiche technique", status: "disponible", expiration: "-" },
];

const equipments = ["GPS embarque", "Climatisation bi-zone", "Sieges enfants (x2)", "Camera arriere", "Kit securite", "Traqueur", "Prise USB passagers", "Support fauteuil roulant"];

export default function ChauffeurVehicle() {
  const { toast } = useToast();
  const [incidentType, setIncidentType] = useState("panne");
  const [incidentText, setIncidentText] = useState("");

  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentText.trim()) {
      return toast({ title: "Ajoutez un detail", variant: "destructive" });
    }
    toast({ title: "Incident transmis", description: "Equipe maintenance notifiee." });
    setIncidentText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Vehicule</h1>
          <p className="text-muted-foreground mt-1">Infos, checklists, entretiens et documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Bus className="h-4 w-4" />
            Affecte au chauffeur
          </Badge>
          <Badge className="gap-1">
            <ShieldCheck className="h-4 w-4" />
            Pret a partir
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Kilometrage" value={vehicleInfo.kilometrage} icon={Gauge} />
        <StatCard title="Carburant" value={vehicleInfo.carburant} icon={Fuel} />
        <StatCard title="Capacite" value={vehicleInfo.capacite} icon={Bus} />
        <StatCard title="Dernier entretien" value="10 nov 2025" icon={Wrench} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Marque / Modele" value={`${vehicleInfo.marque} ${vehicleInfo.modele}`} />
            <InfoRow label="Matricule" value={vehicleInfo.plaque} />
            <InfoRow label="Kilometrage" value={vehicleInfo.kilometrage} />
            <InfoRow label="Carburant" value={vehicleInfo.carburant} />
            <InfoRow label="Mise en service" value={vehicleInfo.miseEnService} />
            <InfoRow label="Charge utile" value={vehicleInfo.charge} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Niveau carburant / batterie</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" />
                  Diesel
                </span>
                <span>68%</span>
              </div>
              <Progress value={68} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-primary" />
                  Batterie auxiliaire
                </span>
                <span>82%</span>
              </div>
              <Progress value={82} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="w-fit gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Prechauffage OK
              </Badge>
              <Badge variant="outline" className="w-fit gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Pas d'alertes tableau de bord
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Etat du vehicule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Checklist title="Avant le depart" items={checklistBefore} />
              <Checklist title="Apres mission" items={checklistAfter} />
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Niveau essuie-glace OK</Badge>
              <Badge variant="secondary">Extincteur controle</Badge>
              <Badge variant="secondary">Kit secours present</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Declaration d'incident</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleIncidentSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full rounded-md border bg-transparent p-2 text-sm"
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                >
                  <option value="panne">Panne</option>
                  <option value="rayure">Rayure / carrosserie</option>
                  <option value="retard">Retard depart</option>
                  <option value="incident">Incident passager</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Details</label>
                <Textarea
                  placeholder="Decrivez le probleme rencontre..."
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Envoyer au support
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toast({ title: "Rappel planifie", description: "Suivi dans 30 minutes." })}
                >
                  <TimerReset className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Entretien</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Prochains entretiens</p>
              <div className="space-y-3">
                {maintenanceUpcoming.map((item) => (
                  <MaintenanceItem
                    key={item.title}
                    title={item.title}
                    date={item.date}
                    detail={item.detail}
                    priority={item.priority}
                  />
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-semibold mb-2">Historique</p>
              <div className="space-y-2">
                {maintenanceHistory.map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-md border bg-muted/40 p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Documents du vehicule</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.title} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-semibold">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">Expiration : {doc.expiration}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.status === "valide" ? "secondary" : doc.status === "a renouveler" ? "destructive" : "outline"}>
                    {doc.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast({ title: doc.title, description: "Document telecharge." })}
                  >
                    Telecharger
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Options et equipements</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {equipments.map((item) => (
              <Badge key={item} variant="outline" className="justify-start">
                {item}
              </Badge>
            ))}
          </div>
          <Separator />
          <div className="grid gap-3 md:grid-cols-3">
            <InfoRow label="Capacite assises" value="17" />
            <InfoRow label="Charge utile" value={vehicleInfo.charge} />
            <InfoRow label="Kit hiver" value="Chaines + pneus hiver" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: { label: string; status: "ok" | "attention" }[] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold">{title}</p>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Checklist
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                item.status === "ok" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceItem({ title, date, detail, priority }: { title: string; date: string; detail: string; priority?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
      <Wrench className="h-4 w-4 text-primary mt-0.5" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
        {priority && (
          <Badge variant="outline" className="mt-1 w-fit">
            Priorite {priority}
          </Badge>
        )}
      </div>
    </div>
  );
}
