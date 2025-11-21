import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";
type ContrastPreset = "standard" | "high" | "night" | "soft";

type ThemeSettings = {
  mode: ThemeMode;
  accent: string;
  contrast: ContrastPreset;
  fontScale: number;
  presentation: boolean;
  cognitive: boolean;
};

type ThemeContextType = ThemeSettings & {
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  applyRemoteTheme: (payload: Partial<ThemeSettings>) => void;
  setPresentationMode: (value: boolean) => void;
  setCognitiveMode: (value: boolean) => void;
};

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: "light",
  accent: "#2563eb",
  contrast: "standard",
  fontScale: 1,
  presentation: false,
  cognitive: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const stored = localStorage.getItem("theme-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn("Impossible de charger les pr\u00e9f\u00e9rences th\u00e9matique", error);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(settings.mode);
    root.style.setProperty("--app-accent", settings.accent);
    root.style.setProperty("--app-font-scale", settings.fontScale.toString());
    root.dataset.contrast = settings.contrast;
    root.dataset.presentation = settings.presentation ? "true" : "false";
    root.dataset.cognitive = settings.cognitive ? "true" : "false";
    localStorage.setItem("theme-settings", JSON.stringify(settings));
  }, [settings]);

  const setThemeMode = (mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  };

  const toggleTheme = () => {
    setSettings((prev) => ({ ...prev, mode: prev.mode === "light" ? "dark" : "light" }));
  };

  const applyRemoteTheme = (payload: Partial<ThemeSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...payload,
      accent: payload.accent ?? prev.accent,
      contrast: (payload.contrast as ContrastPreset | undefined) ?? prev.contrast,
      fontScale: payload.fontScale ? clamp(payload.fontScale, 0.8, 1.4) : prev.fontScale,
      mode: (payload.mode as ThemeMode | undefined) ?? prev.mode,
      presentation: payload.presentation ?? prev.presentation,
      cognitive: payload.cognitive ?? prev.cognitive,
    }));
  };

  const setPresentationMode = (value: boolean) => {
    setSettings((prev) => ({ ...prev, presentation: value }));
  };

  const setCognitiveMode = (value: boolean) => {
    setSettings((prev) => ({ ...prev, cognitive: value }));
  };

  const contextValue = useMemo(
    () => ({
      ...settings,
      toggleTheme,
      setThemeMode,
      applyRemoteTheme,
      setPresentationMode,
      setCognitiveMode,
    }),
    [settings],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
