import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

async function fetchWithAuth(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const message = (await res.text()) || "Erreur de chargement";
    throw new Error(message);
  }
  return res.json();
}

export function usePersonalizationState<TData = any>(context?: string) {
  const queryKey = ["/api/personalization/state", context || "auto"];
  const queryParams = new URLSearchParams();
  if (context) {
    queryParams.set("context", context);
  }

  const url = queryParams.size ? `/api/personalization/state?${queryParams.toString()}` : "/api/personalization/state";

  return useQuery<TData>({
    queryKey,
    queryFn: () => fetchWithAuth(url),
  });
}

export function usePersonalizationProfiles() {
  return useQuery({
    queryKey: ["/api/personalization/profiles"],
    queryFn: () => fetchWithAuth("/api/personalization/profiles"),
  });
}

export function useSavePersonalizationState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/personalization/state", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalization/state"] });
    },
  });
}

export function useCreatePersonalizationProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/personalization/profiles", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalization/profiles"] });
    },
  });
}

export function useUpdatePersonalizationProfile(profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/personalization/profiles/${profileId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalization/state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/personalization/profiles"] });
    },
  });
}
