import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

async function fetchAccessibilitySettings() {
  const res = await fetch("/api/accessibility/settings", { credentials: "include" });
  if (!res.ok) {
    const message = (await res.text()) || "Impossible de charger les param\u00e8tres d'accessibilit\u00e9";
    throw new Error(message);
  }
  return res.json();
}

export function useAccessibilitySettings() {
  return useQuery({
    queryKey: ["/api/accessibility/settings"],
    queryFn: fetchAccessibilitySettings,
  });
}

export function useUpdateAccessibilitySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest("PUT", "/api/accessibility/settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accessibility/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/personalization/state"] });
    },
  });
}

export function useAccessibilityTranslator() {
  return useMutation({
    mutationFn: async (payload: { text: string; sourceLanguage?: string; targetLanguage?: string }) => {
      const res = await apiRequest("POST", "/api/accessibility/translate", payload);
      return res.json();
    },
  });
}
