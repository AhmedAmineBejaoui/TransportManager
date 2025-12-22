function resolveWsPort(): string {
  const envPort = (import.meta.env as any)?.VITE_WS_PORT;
  const normalized =
    envPort === undefined || envPort === null || envPort === "" || envPort === "undefined" || envPort === "null"
      ? undefined
      : String(envPort);
  if (normalized) {
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) return String(parsed);
    // Allow explicit empty to skip port segment (e.g., behind proxy)
    if (normalized === "auto" || normalized === "default") return "";
  }

  // Fallback to the current page port when available, else default 5000
  if (typeof location !== "undefined" && location.port) {
    return location.port;
  }
  return "5000";
}

function resolveHost() {
  if (typeof location === "undefined") return "127.0.0.1";
  return location.hostname || "127.0.0.1";
}

export function buildWsUrl(path: string = "/", token?: string) {
  const port = resolveWsPort();
  const host = resolveHost();
  const protocol = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  const portSegment = port ? `:${port}` : "";
  return `${protocol}://${host}${portSegment}${cleanPath}${query}`;
}

export function createWebSocket(token?: string, path: string = "/ws") {
  const url = buildWsUrl(path, token);
  return new WebSocket(url);
}

export default createWebSocket;
