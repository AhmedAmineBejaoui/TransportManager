import type { IncomingMessage } from "http";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";

type TrackingMessage =
  | { type: "update"; tripId: string; lat: number; lng: number; speed?: number; eta?: string }
  | { type: "request-state"; tripId: string };

type ChatMessage =
  | { type: "message"; tripId: string; text: string; author: string; role: "CHAUFFEUR" | "CLIENT" }
  | { type: "moderation"; reason: string };

const trackingState = new Map<
  string,
  { lat: number; lng: number; speed?: number; eta?: string; updatedAt: number }
>();

const bannedWords = ["injure", "insulte", "haine"];

export function initRealtime(server: Server) {
  const trackingWss = new WebSocketServer({ noServer: true });
  const chatWss = new WebSocketServer({ noServer: true });

  const upgradeHandler = (request: IncomingMessage, socket: any, head: Buffer) => {
    const { pathname } = parse(request.url || "", true);
    if (pathname === "/ws/tracking") {
      trackingWss.handleUpgrade(request, socket, head, (ws) => {
        trackingWss.emit("connection", ws, request);
      });
    } else if (pathname === "/ws/chat") {
      chatWss.handleUpgrade(request, socket, head, (ws) => {
        chatWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  };

  server.on("upgrade", upgradeHandler);

  trackingWss.on("connection", (ws, request) => {
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as TrackingMessage;
        if (message.type === "update") {
          trackingState.set(message.tripId, {
            lat: message.lat,
            lng: message.lng,
            speed: message.speed,
            eta: message.eta,
            updatedAt: Date.now(),
          });
          broadcastTracking(trackingWss, message.tripId);
        } else if (message.type === "request-state") {
          const existing = trackingState.get(message.tripId);
          if (existing) {
            ws.send(
              JSON.stringify({
                type: "state",
                tripId: message.tripId,
                ...existing,
              })
            );
          }
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: "error", message: "Format invalide" }));
      }
    });
  });

  chatWss.on("connection", (ws, request) => {
    const { query } = parse(request.url || "", true);
    const tripId = typeof query.tripId === "string" ? query.tripId : undefined;

    ws.on("message", (data) => {
      if (!tripId) return;
      try {
        const message = JSON.parse(data.toString()) as ChatMessage;
        if (message.type !== "message") {
          return;
        }
        if (containsBannedWords(message.text)) {
          ws.send(JSON.stringify({ type: "moderation", reason: "Message refusé (contenu inapproprié)" }));
          return;
        }
        broadcastChat(chatWss, tripId, {
          type: "message",
          tripId,
          text: message.text,
          author: message.author,
          role: message.role,
          timestamp: Date.now(),
        });
      } catch (error) {
        ws.send(JSON.stringify({ type: "moderation", reason: "Message invalide" }));
      }
    });
  });

  const interval = setInterval(() => {
    const now = Date.now();
    trackingState.forEach((state, tripId) => {
      if (now - state.updatedAt > 5 * 60 * 1000) {
        trackingState.delete(tripId);
        broadcastTracking(trackingWss, tripId);
      }
    });
  }, 60 * 1000);

  server.on("close", () => {
    clearInterval(interval);
    server.off("upgrade", upgradeHandler);
    trackingWss.close();
    chatWss.close();
  });
}

function broadcastTracking(wss: WebSocketServer, tripId: string) {
  const state = trackingState.get(tripId);
  const payload = JSON.stringify({
    type: "state",
    tripId,
    ...state,
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastChat(wss: WebSocketServer, tripId: string, payload: object) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientTrip = client.protocol || "";
      if (!clientTrip || clientTrip === tripId) {
        client.send(message);
      }
    }
  });
}

function containsBannedWords(text: string) {
  const normalized = text.toLowerCase();
  return bannedWords.some((word) => normalized.includes(word));
}
