import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type MissionSummary = {
  id: string;
  title: string;
  description?: string | null;
  points?: number | null;
  progress: number;
  completed: boolean;
};

type LoyaltySummaryResponse = {
  balance: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    source?: string | null;
    created_at: string;
    metadata?: Record<string, unknown>;
  }>;
  missions: MissionSummary[];
  badges: Array<{
    id: string;
    badge: string;
    description?: string | null;
    awarded_at: string;
  }>;
  tiers: Array<{
    id: string;
    name: string;
    min_points?: number | null;
    perks?: Record<string, unknown>;
    badge?: string | null;
  }>;
  currentTier: {
    id: string;
    name: string;
    min_points?: number | null;
  } | null;
};

export function useLoyaltySummary() {
  return useQuery<LoyaltySummaryResponse>({
    queryKey: ["/api/loyalty/summary"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/summary", { credentials: "include" });
      if (!res.ok) {
        const message = (await res.text()) || "Impossible de charger la fid\u00e9lit\u00e9";
        throw new Error(message);
      }
      return (await res.json()) as LoyaltySummaryResponse;
    },
  });
}

export function useTransferPoints() {
  return useMutation({
    mutationFn: async (payload: { recipientEmail: string; amount: number; note?: string }) => {
      const res = await apiRequest("POST", "/api/loyalty/transfer", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/summary"] });
    },
  });
}
