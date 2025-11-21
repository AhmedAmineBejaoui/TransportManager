import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { usePersonalizationState, useSavePersonalizationState } from "@/hooks/usePersonalization";
import { useAccessibilitySettings } from "@/hooks/useAccessibility";
import { useAdaptiveGestures } from "@/hooks/useAdaptiveGestures";
import { useTheme } from "@/components/ThemeProvider";
import { Brain, Briefcase, Car, CloudUpload, GripVertical, Palette, Presentation, RefreshCcw, Smartphone, Sparkles } from "lucide-react";

type AdaptiveWidget = {
  id: string;
  title: string;
  description: string;
  accent?: string;
};

type PersonalizationStateResponse = {
  layout?: unknown;
  theme?: {
    mode: "light" | "dark";
    accent: string;
    contrast: string;
    fontScale?: number;
    gradient?: string;
  };
  presentationMode?: boolean;
  cognitiveMode?: boolean;
  availableContexts?: Array<{ id: string; label: string; focus?: string[] }>;
  suggestions?: Array<{ id: string; label: string; description: string; type: string }>;
  cloud?: { lastSync?: string };
};

const FALLBACK_WIDGETS: AdaptiveWidget[] = [
  { id: "search", title: "Bloc recherche", description: "Entr\u00e9e rapide pour les trajets favoris" },
  { id: "map", title: "Carte dynamique", description: "Visualisation contextuelle des lignes" },
  { id: "alerts", title: "Alertes intelligentes", description: "Synth\u00e8se incidents & maintenance" },
  { id: "loyalty", title: "Fid\u00e9lit\u00e9", description: "Suivi points et avantages prioritaires" },
];

const CONTEXT_ICONS: Record<string, React.ReactNode> = {
  conduite: <Car className="h-4 w-4" />,
  bureau: <Briefcase className="h-4 w-4" />,
  mobilite: <Smartphone className="h-4 w-4" />,
  presentation: <Presentation className="h-4 w-4" />,
  cognitive: <Brain className="h-4 w-4" />,
};

function normalizeLayout(layout: unknown): AdaptiveWidget[] {
  if (!Array.isArray(layout)) return FALLBACK_WIDGETS;
  const normalized = layout
    .map((item) => {
      if (item && typeof item === "object" && "id" in item) {
        const casted = item as Record<string, unknown>;
        return {
          id: String(casted.id),
          title: typeof casted.title === "string" ? casted.title : `Widget ${casted.id}`,
          description:
            typeof casted.description === "string" ? casted.description : "Widget personnalis\u00e9",
          accent: typeof casted.accent === "string" ? casted.accent : undefined,
        };
      }
      if (typeof item === "string") {
        const fallback = FALLBACK_WIDGETS.find((widget) => widget.id === item);
        if (fallback) return fallback;
        return {
          id: item,
          title: `Bloc ${item}`,
          description: "Widget personnalisable",
        };
      }
      return null;
    })
    .filter(Boolean) as AdaptiveWidget[];
  return normalized.length ? normalized : FALLBACK_WIDGETS;
}

export function PersonalizationConsole() {
  const [context, setContext] = useState("bureau");
  const [widgets, setWidgets] = useState<AdaptiveWidget[]>(FALLBACK_WIDGETS);
  const layoutPreviewRef = useRef<AdaptiveWidget[] | null>(null);
  const { data, isLoading, refetch } = usePersonalizationState<PersonalizationStateResponse>(context);
  const { data: accessibility } = useAccessibilitySettings();
  const saveState = useSavePersonalizationState();
  const { applyRemoteTheme, setPresentationMode } = useTheme();
  const { toast } = useToast();
  const draggingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (data?.layout) {
      setWidgets(normalizeLayout(data.layout));
    }
  }, [data?.layout]);

  useEffect(() => {
    if (data?.theme) {
      applyRemoteTheme({
        mode: data.theme.mode,
        accent: data.theme.accent,
        contrast: data.theme.contrast as any,
        fontScale: data.theme.fontScale,
        presentation: data.presentationMode,
        cognitive: data.cognitiveMode,
      });
    }
  }, [data?.theme, data?.presentationMode, data?.cognitiveMode, applyRemoteTheme]);

  useAdaptiveGestures(
    (gesture) => {
      if (gesture === "swipe-right") {
        setContext("presentation");
        toast({
          title: "Geste d\u00e9tect\u00e9",
          description: "Passage au mode pr\u00e9sentation adaptatif.",
        });
      } else {
        setContext("conduite");
        toast({
          title: "Geste d\u00e9tect\u00e9",
          description: "Assistant conduite pr\u00eat.",
        });
      }
    },
    Boolean(accessibility?.gestures_enabled),
  );

  const persistLayout = useCallback(
    (nextLayout: AdaptiveWidget[]) => {
      saveState.mutate(
        { context, layout: nextLayout },
        {
          onSuccess: () => {
            toast({ title: "Disposition enregistr\u00e9e dans le cloud" });
          },
        },
      );
    },
    [context, saveState, toast],
  );

  const handleDragOver = (dragId: string | null, targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setWidgets((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === dragId);
      const targetIndex = prev.findIndex((item) => item.id === targetId);
      if (currentIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const updated = [...prev];
      const [removed] = updated.splice(currentIndex, 1);
      updated.splice(targetIndex, 0, removed);
      layoutPreviewRef.current = updated;
      return updated;
    });
  };

  const handleDragEnd = () => {
    draggingIdRef.current = null;
    if (layoutPreviewRef.current) {
      persistLayout(layoutPreviewRef.current);
      layoutPreviewRef.current = null;
    }
  };

  const handlePresentationToggle = (checked: boolean) => {
    setPresentationMode(checked);
    saveState.mutate(
      { context, presentationMode: checked },
      {
        onSuccess: () => {
          toast({
            title: checked ? "Mode pr\u00e9sentation actif" : "Interface d\u00e9taill\u00e9e",
          });
          refetch();
        },
      },
    );
  };

  const suggestions = data?.suggestions ?? [];
  const availableContexts = data?.availableContexts ?? [];
  const contextMeta = useMemo(() => {
    const found = availableContexts.find((item: { id: string }) => item.id === context);
    return found ?? { label: "Contexte adaptatif", focus: [] };
  }, [availableContexts, context]);

  const contextOptions = availableContexts.length
    ? availableContexts
    : [
        { id: "bureau", label: "Mode bureau" },
        { id: "conduite", label: "Assistant conduite" },
        { id: "mobilite", label: "Mobilit\u00e9" },
        { id: "presentation", label: "Pr\u00e9sentation" },
        { id: "cognitive", label: "Guidage cognitif" },
      ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personnalisation contextuelle</CardTitle>
        <CardDescription>
          Interface adaptative selon la conduite, le bureau ou la mobilit\u00e9 avec synchronisation cloud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Select value={context} onValueChange={setContext}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Contexte" />
              </SelectTrigger>
              <SelectContent>
                {contextOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      {CONTEXT_ICONS[option.id] ?? <Palette className="h-4 w-4" />}
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Rafra\u00eechir la couche contextuelle
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CloudUpload className="h-4 w-4" />
            <span>Derni\u00e8re sync {data?.cloud?.lastSync ? new Date(data.cloud.lastSync).toLocaleTimeString() : "--"}</span>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div
                className="rounded-xl border p-4 text-white shadow"
                style={{
                  backgroundImage: data?.theme?.gradient ?? "linear-gradient(135deg,#2563eb,#1d4ed8)",
                }}
              >
                <p className="text-sm uppercase tracking-widest opacity-80">Th\u00e8me dynamique</p>
                <p className="text-2xl font-semibold">{contextMeta.label}</p>
                <p className="mt-2 text-sm">
                  Accent {data?.theme?.accent ?? "#2563eb"} &middot; Contraste {data?.theme?.contrast ?? "standard"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(contextMeta.focus ?? []).map((item: string) => (
                    <Badge key={item} variant="secondary" className="bg-white/20 text-white">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mode pr\u00e9sentation</p>
                    <p className="text-xs text-muted-foreground">
                      Interface \u00e9pur\u00e9e pour briefings et d\u00e9mos.
                    </p>
                  </div>
                  <Switch checked={Boolean(data?.presentationMode)} onCheckedChange={handlePresentationToggle} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Th\u00e8me dynamique</p>
                    <p className="text-xs text-muted-foreground">S'adapte \u00e0 l'heure, la m\u00e9t\u00e9o et la luminosit\u00e9.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      saveState.mutate(
                        { context, dynamicTheme: true },
                        {
                          onSuccess: () => {
                            toast({ title: "Th\u00e8me mis \u00e0 jour" });
                            refetch();
                          },
                        },
                      )
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Recalibrer
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Disposition adaptative</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setWidgets(FALLBACK_WIDGETS);
                    persistLayout(FALLBACK_WIDGETS);
                  }}
                >
                  R\u00e9initialiser
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    draggable
                    onDragOver={(event) => {
                      event.preventDefault();
                      handleDragOver(draggingIdRef.current, widget.id);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", widget.id);
                      draggingIdRef.current = widget.id;
                    }}
                    onDragEnd={handleDragEnd}
                    data-widget-id={widget.id}
                    className="group flex cursor-grab items-start gap-3 rounded-lg border p-3 hover:border-primary/50"
                  >
                    <GripVertical className="mt-1 h-4 w-4 text-muted-foreground group-active:cursor-grabbing" />
                    <div>
                      <p className="font-semibold">{widget.title}</p>
                      <p className="text-xs text-muted-foreground">{widget.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium">Suggestions adaptatives</p>
              {suggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune recommandation contextuelle pour le moment.</p>
              ) : (
                <div className="mt-2 grid gap-2">
                  {suggestions.map((suggestion: { id: string; label: string; description: string; type: string }) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{suggestion.label}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                      </div>
                      <Badge variant="outline">{suggestion.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
