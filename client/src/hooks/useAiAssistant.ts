import { useQuery } from "@tanstack/react-query";

export type AssistantAction = {
  id: string;
  label: string;
  description: string;
  impact: "low" | "medium" | "high";
  deadline?: string | null;
  dataPoints?: string[];
};

export type AssistantIntegration = {
  provider: string;
  status: string;
  capabilities: string[];
  lastSync: string | null;
};

export type AssistantTimelineEntry = {
  tripId?: string;
  depart?: string | null;
  arrivee?: string | null;
  departure?: string | null;
  statut?: string | null;
};

export type AIAssistantSnapshot = {
  generatedAt: string;
  persona: {
    codename: string;
    version: string;
    specialities: string[];
    languages: string[];
    proactiveMode: { enabled: boolean; confidence: number; lastReview: string | null };
  };
  learningSignals: {
    favoriteRoute: string | null;
    bookingWindowDays: number;
    travelRhythmDays: number;
    preferredDepartureHour: number | null;
    loyalty: { tier: string; balance: number; nextTierDelta: number | null };
    searchSignal: null | { lastQuery: string; hoursAgo: number };
    modelConfidence: number;
  };
  behaviorProfile: {
    archetype: string;
    description: string;
    predictedIntent: string;
    probability: number;
    signals: string[];
  };
  nextBestActions: AssistantAction[];
  proactiveSuggestions: Array<{ id: string; title: string; description: string; rationale: string; channels: string[] }>;
  routeOutlook: Array<{
    route: string;
    demandScore: number;
    recommendedWindowDays: number;
    nextBestPeriod: string | null;
    confidence: number;
  }>;
  integrations: AssistantIntegration[];
  conversation: {
    preferredLanguages: string[];
    tone: string;
    emotionalContext: { label: string; confidence: number };
    contextSummary: string;
  };
  timeline: {
    upcoming: AssistantTimelineEntry[];
    recent: AssistantTimelineEntry[];
  };
};

export function useAiAssistant() {
  return useQuery<AIAssistantSnapshot>({
    queryKey: ["/api/ai/assistant"],
    queryFn: async () => {
      const res = await fetch("/api/ai/assistant", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Impossible de charger l'assistant intelligent");
      }
      return (await res.json()) as AIAssistantSnapshot;
    },
    staleTime: 60 * 1000,
  });
}
