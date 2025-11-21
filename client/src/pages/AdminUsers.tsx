import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ShieldCheck, User, Users } from "lucide-react";

const highlights = [
  {
    label: "Utilisateurs actifs",
    value: "128",
    detail: "Dont 34 chauffeurs et 8 responsables métiers",
    icon: <Users className="h-5 w-5 text-white" />,
    badge: "En croissance",
  },
  {
    label: "Invitations en attente",
    value: "12",
    detail: "Agents et opérateurs qui n'ont pas validé leur mail",
    icon: <User className="h-5 w-5 text-white" />,
    badge: "Relancer",
  },
  {
    label: "Sécurité",
    value: "100%",
    detail: "Politiques de mot de passe et double authentif.",
    icon: <ShieldCheck className="h-5 w-5 text-white" />,
    badge: "A jour",
  },
];

const managers = [
  { name: "Leïla Mahjoub", role: "Responsable opérations", email: "leila@transportpro.tn" },
  { name: "Tarek Ben Amor", role: "Planification nationale", email: "tarek@transportpro.tn" },
  { name: "Sarah Rebah", role: "Support premium", email: "sarah@transportpro.tn" },
];

export default function AdminUsers() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Visualisez l&apos;activité du personnel et gérez les droits d&apos;accès.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ArrowUpRight className="h-4 w-4" />
          Synchroniser avec l&apos;annuaire
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {highlights.map((highlight) => (
          <Card
            key={highlight.label}
            className="overflow-hidden border-transparent bg-gradient-to-br from-sky-700/30 to-slate-900/60 shadow-lg"
          >
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl text-white">{highlight.label}</CardTitle>
                <CardDescription className="text-xl text-white">
                  {highlight.value}
                </CardDescription>
              </div>
              <div className="rounded-full bg-white/10 p-2">{highlight.icon}</div>
            </CardHeader>
            <CardContent className="pt-2 text-sm text-muted-foreground">
              <p>{highlight.detail}</p>
              <Badge className="mt-3 bg-white/10 text-white" variant="secondary">
                {highlight.badge}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Escouades métiers</CardTitle>
            <CardDescription>
              Les profils de pilotage et support à contacter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {managers.map((manager) => (
              <div key={manager.email} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="font-semibold">{manager.name}</p>
                  <p className="text-sm text-muted-foreground">{manager.role}</p>
                  <p className="text-xs text-muted-foreground">{manager.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Actif
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Flux d&apos;accès</CardTitle>
            <CardDescription>Derniers changements de rôle et alertes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Nouveaux chauffeurs autorisés", value: "+5", change: "+12% cette semaine" },
              { label: "Revocations critiques", value: "0", change: "Rien à signaler" },
              { label: "Demandes de privilèges", value: "3", change: "En validation" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">{item.change}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
