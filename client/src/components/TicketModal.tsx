import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";

type TicketModalState = {
  open: boolean;
  reservationId?: string;
  qrText?: string;
};

export function TicketModal() {
  const [state, setState] = useState<TicketModalState>({ open: false });
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    function handle(e: any) {
      const detail = e.detail || {};
      setState({ open: true, reservationId: detail.reservationId, qrText: detail.qrText });
    }
    window.addEventListener("open-ticket-modal", handle as EventListener);
    return () => window.removeEventListener("open-ticket-modal", handle as EventListener);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function gen() {
      if (!state.open || !state.qrText) {
        setDataUrl(null);
        return;
      }
      try {
        const url = await QRCode.toDataURL(state.qrText);
        if (mounted) setDataUrl(url);
      } catch (err) {
        setDataUrl(null);
      }
    }
    void gen();
    return () => { mounted = false; };
  }, [state.open, state.qrText]);

  const onClose = () => setState({ open: false });

  const handleDownload = () => {
    if (!dataUrl || !state.reservationId) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ticket-${state.reservationId}.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!dataUrl || !state.reservationId) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>Billet ${state.reservationId}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
            .ticket { text-align:center; padding:24px; border:1px solid #ddd; }
            .qr { width:360px; height:360px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h1>Billet de réservation</h1>
            <p>Réservation: ${state.reservationId}</p>
            <img class="qr" src="${dataUrl}" />
            <p>Présentez ce QR à l'embarquement.</p>
          </div>
          <script>window.onload = function(){ setTimeout(()=>{ window.print(); }, 300); };</script>
        </body>
      </html>
    `;
    // Use a data URL to avoid using deprecated document.write
    printWindow.location.href = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  };

  return (
    <Dialog open={state.open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Billet de réservation</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          {dataUrl ? (
            <img src={dataUrl} alt="QR code ticket" className="w-64 h-64 object-contain" />
          ) : (
            <div className="h-64 w-64 flex items-center justify-center bg-muted">Génération du QR…</div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleDownload} disabled={!dataUrl}>Télécharger PNG</Button>
            <Button onClick={handlePrint} variant="secondary" disabled={!dataUrl}>Imprimer</Button>
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(state.qrText ?? ""); }}>Copier le contenu</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TicketModal;
