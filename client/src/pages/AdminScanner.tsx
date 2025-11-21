import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type ValidatedResult = {
  valid: boolean;
  reservation?: any;
  error?: string;
};

export default function AdminScanner() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [validated, setValidated] = useState<ValidatedResult | null>(null);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let html5Qr: any = null;
    let mounted = true;
    async function setup() {
      // load library dynamically (client-only)
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mounted) return;
      if (!containerRef.current) return;
      html5Qr = new Html5Qrcode(containerRef.current.id || "reader");

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      try {
        await html5Qr.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            setLastResult(decodedText);
            handleDecoded(decodedText);
          },
          (errorMessage: any) => {
            // ignore for now
          }
        );
        setRunning(true);
      } catch (err) {
        toast({ title: "Erreur caméra", description: String(err), variant: "destructive" });
      }
    }

    function stop() {
      if (html5Qr?.getState?.() !== "stopped") {
        html5Qr.stop().catch(() => {});
      }
    }

    setup();
    return () => {
      mounted = false;
      stop();
    };
  }, []);

  async function handleDecoded(text: string) {
    toast({ title: "QR scanné", description: text });
    // If it's a URL to /reserve, open it
    try {
      const parsed = new URL(text, globalThis.location.origin);
      if (parsed.pathname === "/reserve") {
        globalThis.location.href = parsed.toString();
        return;
      }
    } catch (err) {
      console.debug("Not a URL while scanning QR:", err);
    }

    // try parse JSON { reservationId, token }
    try {
      const obj = JSON.parse(text);
      if (obj.reservationId && obj.token) {
        // call validation endpoint
        const res = await fetch(`/api/tickets/validate?reservationId=${encodeURIComponent(obj.reservationId)}&token=${encodeURIComponent(obj.token)}`);
        const data = await res.json();
        if (res.ok) {
          setValidated({ valid: true, reservation: data.reservation });
          toast({ title: "Valide", description: `Réservation: ${obj.reservationId}` });
        } else {
          setValidated({ valid: false, error: data?.error || "Jeton invalide" });
          toast({ title: "Invalide", description: data?.error || "Jeton invalide", variant: "destructive" });
        }
      }
    } catch (err) {
      console.debug("Error parsing scanned payload as JSON:", err);
    }
  }

  async function markChecked(reservationId: string) {
    try {
      setChecking(true);
      const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json();
      if (res.ok) {
        setValidated({ valid: true, reservation: data.reservation });
        toast({ title: "Enregistré", description: "Arrivée cochée" });
      } else {
        toast({ title: "Erreur", description: data?.error || "Impossible de cocher la réservation", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Scanner de billets</h1>
      <div id="reader" ref={containerRef} className="w-full h-96 bg-black/5"></div>
      {lastResult && <div className="text-sm">Dernier: {lastResult}</div>}

      {validated && (
        <div className="p-4 border rounded-md bg-white/50">
          <div className="font-medium">Validation</div>
          {!validated.valid && <div className="text-sm text-red-600">{validated.error}</div>}
          {validated.valid && validated.reservation && (
            <div className="space-y-2">
              <div>Réservation: {validated.reservation.id}</div>
              <div>Client: {validated.reservation.client_name || validated.reservation.client_id}</div>
              <div>Places: {validated.reservation.nombre_places}</div>
              <div>Checked: {validated.reservation.checked ? "Oui" : "Non"}</div>
              {!validated.reservation.checked && (
                <div className="pt-2">
                  <Button onClick={() => markChecked(validated.reservation.id)} disabled={checking}>
                    {checking ? "Enregistrement..." : "Marquer comme présent"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => globalThis.location.reload()}>Redémarrer</Button>
      </div>
    </div>
  );
}
