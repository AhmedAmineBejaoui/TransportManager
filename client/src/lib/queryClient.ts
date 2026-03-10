import { QueryClient, QueryFunction } from "@tanstack/react-query";

const DEFAULT_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getHttpStatusFromError(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = /^(\d{3}):/.exec(error.message);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

/* -------------------------------------------------------------
   Helper: Throw error if response NOT ok
------------------------------------------------------------- */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/* -------------------------------------------------------------
   API Request (POST / PUT / DELETE)
------------------------------------------------------------- */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  // Attach Authorization header if JWT present (localStorage)
  const token = typeof window !== "undefined" ? localStorage.getItem("auth:jwt") : null;

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithTimeout(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,

    // 🔥 Indispensable pour envoyer les cookies
    credentials: "include",
  });

  // If unauthorized and a refresh token is available, try refresh flow once
  if (res.status === 401) {
    const refresh = typeof window !== "undefined" ? localStorage.getItem("auth:refresh") : null;
    if (refresh) {
      try {
        const refreshRes = await fetchWithTimeout("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
          credentials: "include",
        });
        if (refreshRes.ok) {
          const payload = await refreshRes.json();
          if (payload.jwt) {
            localStorage.setItem("auth:jwt", payload.jwt);
          }
          if (payload.refreshToken) {
            localStorage.setItem("auth:refresh", payload.refreshToken);
          }

          // retry original request with new token
          const newToken = typeof window !== "undefined" ? localStorage.getItem("auth:jwt") : null;
          if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
          const retryRes = await fetchWithTimeout(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
            credentials: "include",
          });
          await throwIfResNotOk(retryRes);
          return retryRes;
        }
      } catch (e) {
        // ignore and fallthrough to original error
        console.warn("Refresh attempt failed", e);
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

/* -------------------------------------------------------------
   Unauthorized behavior
------------------------------------------------------------- */
type UnauthorizedBehavior = "returnNull" | "throw";

/* -------------------------------------------------------------
   MAIN FIX : QueryFn (GET requests)
   ✔ Ne casse plus les URLs
   ✔ Reconstruit les query params correctement
   ✔ Envoie les cookies
------------------------------------------------------------- */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }: { on401: UnauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [url, params] = queryKey; // ex: ["/api/support/tickets", {limit: 1}]

    let finalUrl = url as string;

    // 🔥 Si query params présents, on les ajoute proprement
    if (params && typeof params === "object") {
      const search = new URLSearchParams();

      for (const key in params) {
        if (
          params[key] !== undefined &&
          params[key] !== null &&
          params[key] !== ""
        ) {
          search.set(key, String(params[key]));
        }
      }

      const qs = search.toString();
      if (qs.length > 0) finalUrl += "?" + qs;
    }

    const res = await fetchWithTimeout(finalUrl, {
      credentials: "include", // 🔥 Nécessaire pour la session
    });

    // Option: return null if user is unauthenticated
    if (on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return res.json();
  };

/* -------------------------------------------------------------
   Query Client
------------------------------------------------------------- */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      gcTime: 15 * 60_000,
      retry: (failureCount, error) => {
        const status = getHttpStatusFromError(error);
        if (status !== null && status >= 400 && status < 500) {
          return false;
        }

        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});
