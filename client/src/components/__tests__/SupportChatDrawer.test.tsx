import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupportChatDrawer } from "../SupportChatDrawer";

vi.mock("@/components/ui/drawer", () => {
  const Drawer = ({ children, open }: any) => (
    <div data-open={open}>{children}</div>
  );
  const DrawerContent = ({ children }: any) => <div>{children}</div>;
  const DrawerHeader = ({ children }: any) => <div>{children}</div>;
  const DrawerTitle = ({ children }: any) => <div>{children}</div>;
  const DrawerFooter = ({ children }: any) => <div>{children}</div>;

  return {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
  };
});

const mockUseSupportTickets = vi.fn();
const mockUseSupportTicketThread = vi.fn();
const mockUseCreateSupportTicket = vi.fn();
const mockUseSendSupportMessage = vi.fn();

vi.mock("@/hooks/useSupport", () => ({
  useSupportTickets: (params?: { status?: string; limit?: number }) =>
    mockUseSupportTickets(params),
  useSupportTicketThread: (
    id?: string,
    options?: { enabled?: boolean; refetchInterval?: number | false },
  ) => mockUseSupportTicketThread(id, options),
  useCreateSupportTicket: () => mockUseCreateSupportTicket(),
  useSendSupportMessage: () => mockUseSendSupportMessage(),
}));

const baseTicket = {
  id: "ticket-1",
  subject: "Support chauffeur",
  priority: "high",
  statut: "pending",
};

describe("SupportChatDrawer", () => {
  beforeEach(() => {
    mockUseSupportTickets.mockReturnValue({
      data: [],
      isFetching: false,
    });
    mockUseSupportTicketThread.mockReturnValue({
      data: undefined,
      isFetching: false,
    });
    mockUseCreateSupportTicket.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseSendSupportMessage.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("affiche l'état de chargement pendant la récupération des données", () => {
    mockUseSupportTickets.mockReturnValue({
      data: [],
      isFetching: true,
    });
    mockUseSupportTicketThread.mockReturnValue({
      data: undefined,
      isFetching: true,
    });

    render(<SupportChatDrawer open onOpenChange={vi.fn()} />);

    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
  });

  it("affiche un état vide lorsqu'aucun message n'est présent", () => {
    mockUseSupportTickets.mockReturnValue({
      data: [baseTicket],
      isFetching: false,
    });
    mockUseSupportTicketThread.mockReturnValue({
      data: {
        ticket: baseTicket,
        messages: [],
      },
      isFetching: false,
    });

    render(<SupportChatDrawer open onOpenChange={vi.fn()} />);

    expect(
      screen.getByText(/pas encore de conversation/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it("envoie un message sur un ticket existant puis vide le champ", async () => {
    const onSend = vi.fn(
      (_payload: { ticketId: string; message: string }, options?: any) =>
        options?.onSuccess?.(),
    );

    mockUseSupportTickets.mockReturnValue({
      data: [baseTicket],
      isFetching: false,
    });
    mockUseSupportTicketThread.mockReturnValue({
      data: {
        ticket: baseTicket,
        messages: [
          {
            id: "m1",
            ticket_id: baseTicket.id,
            sender_id: "user-1",
            role: "user",
            message: "Bonjour",
            created_at: "2024-01-01T10:00:00.000Z",
          },
        ],
      },
      isFetching: false,
    });
    mockUseSendSupportMessage.mockReturnValue({
      mutate: onSend,
      isPending: false,
    });

    render(<SupportChatDrawer open onOpenChange={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      "Votre message...",
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Une nouvelle question");

    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith(
        { ticketId: baseTicket.id, message: "Une nouvelle question" },
        expect.any(Object),
      ),
    );

    await waitFor(() => expect(textarea.value).toBe(""));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/support/assistant-reply",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          ticketId: baseTicket.id,
          message: "Une nouvelle question",
        }),
      }),
    );
  });

  it("crée un nouveau ticket si aucun ticket n'existe encore", async () => {
    const createTicket = vi.fn(
      (_payload: any, options?: any) =>
        options?.onSuccess?.({ id: "ticket-new" }),
    );

    mockUseCreateSupportTicket.mockReturnValue({
      mutate: createTicket,
      isPending: false,
    });

    render(<SupportChatDrawer open onOpenChange={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      "Votre message...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Besoin d'aide" } });

    await userEvent.click(screen.getByRole("button", { name: /chat/i }));

    await waitFor(() =>
      expect(createTicket).toHaveBeenCalledWith(
        {
          subject: "Support chauffeur",
          priority: "high",
          message: "Besoin d'aide",
        },
        expect.any(Object),
      ),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/support/assistant-reply",
      expect.objectContaining({
        body: JSON.stringify({
          ticketId: "ticket-new",
          message: "Besoin d'aide",
        }),
      }),
    );
    await waitFor(() => expect(textarea.value).toBe(""));
  });
});
