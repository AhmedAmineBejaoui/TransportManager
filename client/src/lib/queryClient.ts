import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,

    // 🔥 Indispensable pour envoyer les cookies
    credentials: "include",
  });

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

    const res = await fetch(finalUrl, {
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
