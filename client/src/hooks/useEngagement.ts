import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Notification,
  NotificationPreference,
  Survey,
  InsertFeedbackEntry,
} from "@shared/schema";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const message = (await res.text()) || "Requ\u00eate refus\u00e9e";
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function useNotifications(options: { includeRead?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.includeRead) {
    params.set("includeRead", "true");
  }
  const url = params.toString() ? `/api/notifications?${params}` : "/api/notifications";

  return useQuery<Notification[]>({
    queryKey: ["/api/notifications", options],
    queryFn: () => fetchJson<Notification[]>(url),
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreference>({
    queryKey: ["/api/notifications/preferences"],
    queryFn: () => fetchJson<NotificationPreference>("/api/notifications/preferences"),
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/notifications/${id}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });
}

type PreferenceInput = Partial<Pick<NotificationPreference, "channels" | "priority_threshold" | "quiet_mode" | "quiet_hours">>;

export function useSaveNotificationPreferences() {
  return useMutation({
    mutationFn: async (data: PreferenceInput) => {
      const res = await apiRequest("PUT", "/api/notifications/preferences", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (payload: { category?: string; rating?: number; comment?: string }) => {
      const res = await apiRequest("POST", "/api/feedback", payload satisfies Partial<InsertFeedbackEntry>);
      return await res.json();
    },
  });
}

export function useSurveys() {
  return useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    queryFn: () => fetchJson<Survey[]>("/api/surveys"),
  });
}
