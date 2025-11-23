import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useCreateSupportTicket,
  useSendSupportMessage,
  useSupportTicketThread,
  useSupportTickets,
} from "@/hooks/useSupport";
import { Loader2, MessageSquare, ShieldQuestion } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type SupportChatDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportChatDrawer({ open, onOpenChange }: SupportChatDrawerProps) {
  const { data: tickets = [], isFetching: loadingTickets } =
    useSupportTickets({ limit: 1 });

  const latestTicket = tickets[0];
  const [ticketId, setTicketId] = useState<string | undefined>(
    latestTicket?.id
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (latestTicket) setTicketId(latestTicket.id);
  }, [latestTicket]);

  const { data: thread, isFetching: loadingThread } =
    useSupportTicketThread(ticketId, {
      enabled: !!ticketId && open,
      refetchInterval: open ? 1000 : false,
    });

  const createTicket = useCreateSupportTicket();
  const sendMessage = useSendSupportMessage();

  const sending = createTicket.isPending || sendMessage.isPending;
  const hasMessages = (thread?.messages?.length ?? 0) > 0;

  const statusBadge = useMemo(() => {
    if (!thread?.ticket?.statut)
      return "bg-muted text-muted-foreground";

    if (thread.ticket.statut === "resolved")
      return "bg-emerald-100 text-emerald-800";

    if (thread.ticket.statut === "pending")
      return "bg-amber-100 text-amber-800";

    return "bg-blue-100 text-blue-800";
  }, [thread?.ticket?.statut]);

  // 🔥 Fait répondre l'IA (Ollama) + enregistre dans DB
  const triggerAssistantReply = async (ticketId: string, content: string) => {
    try {
      await fetch("/api/support/assistant-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          ticketId,
          message: content,
        }),
      });
    } catch (err) {
      console.error("Erreur IA :", err);
    }
  };

  const handleSend = () => {
    const msg = message.trim();
    if (!msg) return;

    if (!ticketId) {
      createTicket.mutate(
        { subject: "Support chauffeur", priority: "high", message: msg },
        {
          onSuccess: (ticket: any) => {
            setTicketId(ticket.id);
            setMessage("");
            triggerAssistantReply(ticket.id, msg);
          },
        }
      );
      return;
    }

    sendMessage.mutate(
      { ticketId, message: msg },
      {
        onSuccess: () => {
          setMessage("");
          triggerAssistantReply(ticketId, msg);
        },
      }
    );
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <ShieldQuestion className="h-6 w-6 text-muted-foreground" />
      <div>
        <p className="font-medium">Pas encore de conversation</p>
        <p className="text-sm text-muted-foreground">
          Démarrez un chat avec le dispatch.
        </p>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-start justify-between">
          <div className="space-y-1 text-left">
            <DrawerTitle>Support dispatch</DrawerTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Chat en direct
              </Badge>

              {thread?.ticket?.statut && (
                <Badge className={statusBadge}>
                  {thread.ticket.statut}
                </Badge>
              )}
            </div>
          </div>
        </DrawerHeader>

        <Separator />

        <div className="px-4 pb-4">
          <ScrollArea className="h-72 rounded-md border bg-muted/30 p-3">
            {loadingTickets || loadingThread ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </div>
            ) : !hasMessages ? (
              emptyState
            ) : (
              <div className="space-y-3">
                {thread?.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border bg-background p-3 ${
                      m.role === "user"
                        ? "border-primary/40"
                        : "border-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">
                        {m.role === "user" ? "Vous" : "Support"}
                      </span>
                      <span>
                        {m.created_at
                          ? format(new Date(m.created_at), "dd MMM HH:mm", {
                              locale: fr,
                            })
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm">{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="mt-4 space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message..."
              rows={3}
            />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={sending}
              >
                {ticketId ? "Envoyer" : "Démarrer le chat"}
              </Button>

              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>

        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
