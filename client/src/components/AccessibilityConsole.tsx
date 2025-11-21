import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccessibilitySettings, useAccessibilityTranslator, useUpdateAccessibilitySettings } from "@/hooks/useAccessibility";
import { useVoiceInterface } from "@/hooks/useVoiceInterface";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Languages, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";

type TranslationResult = {
  translatedText: string;
  confidence: number;
  dictionaryHits: number;
  fallback: boolean;
  targetLanguage: string;
};

const LANGUAGE_OPTIONS = [
  { value: "fr-FR", label: "Fr Fran\u00e7ais" },
  { value: "en-US", label: "En Anglais" },
  { value: "ar-TN", label: "Ar Arabe" },
];

export function AccessibilityConsole() {
  const { data: settings, isLoading } = useAccessibilitySettings();
  const updateSettings = useUpdateAccessibilitySettings();
  const translator = useAccessibilityTranslator();
  const { toast } = useToast();
  const { setPresentationMode, setCognitiveMode } = useTheme();
  const [translationInput, setTranslationInput] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("fr-FR");
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);

  const handleUpdate = useCallback(
    (patch: Record<string, unknown>, successMessage?: string) => {
      updateSettings.mutate(patch, {
        onSuccess: () => {
          if (successMessage) {
            toast({ title: successMessage });
          }
        },
      });
    },
    [updateSettings, toast],
  );

  const handleVoiceCommand = useCallback(
    (command: string) => {
      const normalized = command.toLowerCase();
      if (normalized.includes("presentation")) {
        handleUpdate({ presentation_mode: true }, "Mode pr\u00e9sentation forc\u00e9 via la voix");
        setPresentationMode(true);
      }
      if (normalized.includes("normal")) {
        handleUpdate({ presentation_mode: false }, "Retour \u00e0 la vue d\u00e9taill\u00e9e");
        setPresentationMode(false);
      }
      if (normalized.includes("cognitif") || normalized.includes("cognitive")) {
        handleUpdate({ cognitive_mode: true }, "Mode cognitif activ\u00e9");
        setCognitiveMode(true);
      }
    },
    [handleUpdate, setPresentationMode, setCognitiveMode],
  );

  const voiceInterface = useVoiceInterface({
    language: settings?.speech_language,
    onCommand: handleVoiceCommand,
  });

  const languages = useMemo(() => {
    if (!settings?.translation_languages) return [];
    return Array.isArray(settings.translation_languages) ? settings.translation_languages : [];
  }, [settings?.translation_languages]);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast({ title: "Synth\u00e8se vocale indisponible", variant: "destructive" });
      return;
    }
    const utterance = new SpeechSynthesisUtterance("Assistant vocal Transport Manager actif");
    utterance.lang = settings?.speech_language ?? "fr-FR";
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) {
      toast({ title: "Aucun texte \u00e0 traduire", variant: "destructive" });
      return;
    }
    const response = await translator.mutateAsync({
      text: translationInput,
      sourceLanguage: settings?.speech_language,
      targetLanguage,
    });
    setTranslationResult(response as TranslationResult);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessibilit\u00e9 avanc\u00e9e</CardTitle>
        <CardDescription>
          Commandes vocales, gestes adaptatifs, contrastes et traduction multilingue avec synchronisation cloud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Interface vocale</p>
                    <p className="text-xs text-muted-foreground">Commandes avanc\u00e9es et feedback audio.</p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.voice_enabled)}
                    onCheckedChange={(checked) =>
                      handleUpdate({ voice_enabled: checked }, checked ? "Interface vocale activ\u00e9e" : "Interface vocale d\u00e9sactiv\u00e9e")
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Gestes adaptatifs</p>
                    <p className="text-xs text-muted-foreground">Reconnaissance des balayages pour acc\u00e8s rapide.</p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.gestures_enabled)}
                    onCheckedChange={(checked) =>
                      handleUpdate(
                        { gestures_enabled: checked },
                        checked ? "Reconnaissance des gestes activ\u00e9e" : "Gestes d\u00e9sactiv\u00e9s",
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mode pr\u00e9sentation</p>
                    <p className="text-xs text-muted-foreground">Interface \u00e9pur\u00e9e pour les briefings.</p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.presentation_mode)}
                    onCheckedChange={(checked) => {
                      handleUpdate({ presentation_mode: checked });
                      setPresentationMode(checked);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mode cognitif</p>
                    <p className="text-xs text-muted-foreground">Guidage pas \u00e0 pas et contrastes doux.</p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.cognitive_mode)}
                    onCheckedChange={(checked) => {
                      handleUpdate({ cognitive_mode: checked });
                      setCognitiveMode(checked);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border p-4">
                <div>
                  <p className="text-sm font-medium">Taille de police</p>
                  <Slider
                    value={[settings?.font_scale ?? 100]}
                    min={80}
                    max={160}
                    step={5}
                    onValueChange={(value) =>
                      handleUpdate({ font_scale: value[0] }, `Police ${value[0]}% appliqu\u00e9e`)
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Contraste</p>
                    <Select
                      value={settings?.contrast_preset ?? "standard"}
                      onValueChange={(value) => handleUpdate({ contrast_preset: value }, "Contraste adapt\u00e9")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Contraste" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">Elev\u00e9</SelectItem>
                        <SelectItem value="night">Mode nuit</SelectItem>
                        <SelectItem value="soft">Doux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Vision color\u00e9e</p>
                    <Select
                      value={settings?.color_blind_preset ?? "none"}
                      onValueChange={(value) => handleUpdate({ color_blind_preset: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pr\u00e9sets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Standard</SelectItem>
                        <SelectItem value="protanopie">Protanopie</SelectItem>
                        <SelectItem value="deuteranopie">Deut\u00e9ranopie</SelectItem>
                        <SelectItem value="tritanopie">Tritanopie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Langue vocale</p>
                  <Input
                    value={settings?.speech_language ?? "fr-FR"}
                    onChange={(event) => handleUpdate({ speech_language: event.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Assistant vocal</p>
                    <p className="text-xs text-muted-foreground">
                      Statut : {voiceInterface.isActive ? "Actif" : voiceInterface.isSupported ? "Pr\u00eat" : "Non support\u00e9"}
                    </p>
                    {voiceInterface.lastCommand && (
                      <p className="text-xs text-muted-foreground italic">
                        Dernier ordre : {voiceInterface.lastCommand}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant={voiceInterface.isActive ? "default" : "secondary"}
                      disabled={!voiceInterface.isSupported}
                      onClick={voiceInterface.isActive ? voiceInterface.stop : voiceInterface.start}
                    >
                      {voiceInterface.isActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="secondary" onClick={handleSpeak}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Langues actives</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {languages.length === 0 ? (
                      <Badge variant="outline">Fr</Badge>
                    ) : (
                      languages.map((lang: string) => (
                        <Badge key={lang} variant="secondary">
                          {lang}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <p className="text-sm font-medium">Traduction instantan\u00e9e</p>
                </div>
                <Textarea
                  value={translationInput}
                  onChange={(event) => setTranslationInput(event.target.value)}
                  placeholder="Dictez ou collez un message \u00e0 traduire..."
                />
                <div className="flex items-center gap-2">
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Langue cible" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleTranslate} disabled={translator.isPending}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Traduire
                  </Button>
                </div>
                {translationResult && (
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">Traduction ({translationResult.targetLanguage})</p>
                    <p className="mt-1">{translationResult.translatedText}</p>
                    <p className="text-xs text-muted-foreground">
                      Confiance {Math.round(translationResult.confidence * 100)}% &middot;{" "}
                      {translationResult.dictionaryHits} correspondances lexiques
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
