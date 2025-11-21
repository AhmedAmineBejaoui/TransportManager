import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { Brain, Bot, Sparkles, Radio, Clock, Target } from "lucide-react";

function AssistantSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Assistant IA
          </CardTitle>
          <CardDescription>Analyse comportementale en cours...</CardDescription>
        </div>
        <Badge variant="secondary">Synchronisation</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((column) => (
          <div key={column} className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AICompanionPanel() {
  const { data, isLoading, isError } = useAiAssistant();

  if (isLoading) {
    return <AssistantSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Assistant IA
          </CardTitle>
          <CardDescription>Impossible de charger les recommandations intelligentes.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const primaryAction = data.nextBestActions?.[0];
  const secondaryAction = data.nextBestActions?.[1];
  const highlightedIntegration = data.integrations?.find((integration) => integration.status === "connecté") ?? data.integrations?.[0];
  const routeOutlook = data.routeOutlook?.[0];
  const upcomingTrip = data.timeline?.upcoming?.[0];

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {data.persona.codename}
          </CardTitle>
          <CardDescription>
            {data.persona.specialities[0] ?? "Assistant proactif"} • {data.conversation?.tone}
          </CardDescription>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {data.persona.languages.slice(0, 3).map((language) => (
              <span key={language} className="rounded-full border px-2 py-0.5">
                {language.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Mode proactif
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-xs uppercase text-muted-foreground">Profil comportemental</p>
          <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <Brain className="h-5 w-5 text-primary" />
            {data.behaviorProfile.archetype}
          </div>
          <p className="text-sm text-muted-foreground">{data.behaviorProfile.predictedIntent}</p>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {data.behaviorProfile.signals.slice(0, 3).map((signal) => (
              <li key={signal}>• {signal}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase text-muted-foreground">Actions priorisées</p>
          {[primaryAction, secondaryAction].filter(Boolean).map((action) => (
            <div key={action!.id} className="rounded-lg border px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{action!.label}</p>
                <Badge variant="outline" className="text-[10px] uppercase">
                  Impact {action!.impact}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{action!.description}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {action!.deadline
                  ? new Date(action!.deadline).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
                  : "Flexible"}
              </div>
            </div>
          ))}
          {data.proactiveSuggestions?.[0] && (
            <div className="rounded-lg bg-primary/5 px-3 py-2 text-sm">
              <p className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Suggestion proactive
              </p>
              <p className="text-muted-foreground">{data.proactiveSuggestions[0].description}</p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border bg-background/50 p-4">
          <p className="text-xs uppercase text-muted-foreground">Vision IA</p>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            {routeOutlook ? (
              <div>
                <p className="text-sm font-semibold">{routeOutlook.route}</p>
                <p className="text-xs text-muted-foreground">
                  Fenêtre optimale dans {routeOutlook.recommendedWindowDays} j • Confiance {(routeOutlook.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Collecte des routes favorites...</p>
            )}
          </div>

          {upcomingTrip && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">Prochain départ</p>
              <p className="text-muted-foreground">
                {upcomingTrip.depart} → {upcomingTrip.arrivee}
              </p>
              <p className="text-xs text-muted-foreground">
                {upcomingTrip.departure
                  ? new Date(upcomingTrip.departure).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "Date à confirmer"}
              </p>
            </div>
          )}

          {highlightedIntegration && (
            <div className="rounded-md border px-3 py-2 text-xs">
              <p className="font-semibold text-sm">{highlightedIntegration.provider}</p>
              <p className="text-muted-foreground capitalize">Statut : {highlightedIntegration.status}</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {highlightedIntegration.capabilities.slice(0, 2).map((capability) => (
                  <li key={capability}>• {capability}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
