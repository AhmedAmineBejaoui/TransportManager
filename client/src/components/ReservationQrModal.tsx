import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";

type State = { open: boolean; tripId?: string };

export function ReservationQrModal() {
  const [state, setState] = useState<State>({ open: false });
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: any) {
      const d = e.detail || {};
      setState({ open: true, tripId: d.tripId });
    }
    window.addEventListener("open-reserve-qr", handler as EventListener);
    return () => window.removeEventListener("open-reserve-qr", handler as EventListener);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function gen() {
      if (!state.open || !state.tripId) {
        setDataUrl(null);
        return;
      }
      const origin = typeof location !== "undefined" ? location.origin : "";
      const url = `${origin}/reserve?tripId=${encodeURIComponent(state.tripId)}`;
      try {
        const d = await QRCode.toDataURL(url);
        if (mounted) setDataUrl(d);
      } catch (err) {
        setDataUrl(null);
      }
    }
    void gen();
    return () => { mounted = false; };
  }, [state.open, state.tripId]);

  const close = () => setState({ open: false });

  const download = () => {
    if (!dataUrl || !state.tripId) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `reserve-${state.tripId}.png`;
    a.click();
  };

  return (
    <Dialog open={state.open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Réserver via QR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          {dataUrl ? (
            <img src={dataUrl} alt="QR code reserve" className="w-56 h-56 object-contain" />
          ) : (
            <div className="h-56 w-56 flex items-center justify-center bg-muted">Génération…</div>
          )}
          <div className="flex gap-2">
            <Button onClick={download} disabled={!dataUrl}>Télécharger QR</Button>
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/reserve?tripId=${state.tripId}`); }}>Copier le lien</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationQrModal;
