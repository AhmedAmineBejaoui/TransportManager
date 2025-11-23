import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Ticket = {
  id: string;
  subject: string;
  priority: string;
  statut: string;
  created_at?: string;
};

type TicketThread = {
  ticket: Ticket;
  messages: {
    id: string;
    ticket_id: string;
    sender_id: string | null;
    role: string | null;
    message: string;
    created_at: string | null;
  }[];
};

export function useSupportTickets(params?: { status?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));

  const qs = search.toString();
  const url = qs ? `/api/support/tickets?${qs}` : "/api/support/tickets";

  return useQuery<Ticket[]>({
    queryKey: ["/api/support/tickets", params],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger les tickets");
      return res.json();
    },
  });
}

export function useSupportTicketThread(
  id?: string,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  return useQuery<TicketThread>({
    queryKey: ["/api/support/tickets", id],
    enabled: options?.enabled ?? !!id,
    refetchInterval: options?.refetchInterval,
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Impossible de charger la conversation");
      return res.json();
    },
  });
}

export function useCreateSupportTicket() {
  return useMutation({
    mutationFn: async (payload: {
      subject: string;
      message: string;
      priority?: string;
    }) => {
      const res = await apiRequest("POST", "/api/support/tickets", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/support/tickets"],
      });
    },
  });
}

export function useSendSupportMessage() {
  return useMutation({
    mutationFn: async ({
      ticketId,
      message,
    }: {
      ticketId: string;
      message: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/support/tickets/${ticketId}/messages`,
        { message }
      );
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/support/tickets"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/support/tickets", variables.ticketId],
      });
    },
  });
}
