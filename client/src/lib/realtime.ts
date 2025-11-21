export function getWsPort(): number | string {
  // Vite exposes env vars through import.meta.env
  // `VITE_WS_PORT` may be a string or undefined; default to 5000
  // cast to any to avoid TS complaining about unknown keys on import.meta.env
  const raw = (import.meta.env as any).VITE_WS_PORT;
  if (raw === undefined || raw === null || raw === "") return 5000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : raw;
}

export function buildWsUrl(token?: string) {
  const wsPort = getWsPort();
  const host = typeof location === "undefined" ? "127.0.0.1" : location.hostname;
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `ws://${host}:${wsPort}/${query}`.replace(/:\/\/(.*?):\/\//, "//");
}

export function createWebSocket(token?: string) {
  const url = buildWsUrl(token);
  return new WebSocket(url);
}

export default createWebSocket;
