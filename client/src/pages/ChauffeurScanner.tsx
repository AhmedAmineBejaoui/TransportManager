import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, RefreshCw, Copy, Image as ImageIcon } from "lucide-react";

type SignedQrPayload = {
  reservation_id: string;
  client_id: string;
  bus_id: string | null;
  seat_number: string | null;
  date: string;
  time: string;
  trip_id?: string;
  signature: string;
};

type ValidationResponse = {
  valid: boolean;
  status?: "valid" | "invalid" | "expired" | "not_found";
  reservation?: any;
  trip?: any;
  payload?: SignedQrPayload;
  issues?: string[];
  error?: string;
  alreadyChecked?: boolean;
};

function isSignedPayload(value: any): value is SignedQrPayload {
  return (
    value &&
    typeof value === "object" &&
    typeof value.reservation_id === "string" &&
    typeof value.client_id === "string" &&
    typeof value.date === "string" &&
    typeof value.time === "string" &&
    typeof value.signature === "string"
  );
}

function statusStyle(status?: ValidationResponse["status"]) {
  const label = status ?? "invalid";
  if (label === "valid") return { text: "Validé", className: "bg-emerald-100 text-emerald-800" };
  if (label === "expired") return { text: "Expiré", className: "bg-amber-100 text-amber-800" };
  if (label === "not_found") return { text: "Inconnu", className: "bg-slate-100 text-slate-800" };
  return { text: "Invalide", className: "bg-red-100 text-red-800" };
}

// Charger jsQR depuis CDN
let jsQRLoaded: Promise<any> | null = null;
function loadJsQR(): Promise<any> {
  if (jsQRLoaded) return jsQRLoaded;
  jsQRLoaded = new Promise((resolve, reject) => {
    if ((window as any).jsQR) {
      resolve((window as any).jsQR);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.onload = () => resolve((window as any).jsQR);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return jsQRLoaded;
}

export default function ChauffeurScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [scannerReady, setScannerReady] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [scanPayload, setScanPayload] = useState<SignedQrPayload | null>(null);
  const [validated, setValidated] = useState<ValidationResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // Fonction de validation mémorisée
  const validateSignedPayload = useCallback(async (payload: SignedQrPayload) => {
    setValidating(true);
    setValidated(null);
    try {
      const res = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      const nextPayload = data?.payload || payload;
      setScanPayload(nextPayload);
      setValidated({ ...data, payload: nextPayload });
      const status = statusStyle(data?.status);
      toast({
        title: data?.valid ? "Billet validé" : "Billet refusé",
        description: data?.error || status.text,
        variant: data?.valid ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Erreur serveur", description: String(err), variant: "destructive" });
    } finally {
      setValidating(false);
    }
  }, [toast]);

  const validateLegacyPayload = useCallback(async (reservationId: string, token: string) => {
    setValidating(true);
    setValidated(null);
    setScanPayload(null);
    try {
      const res = await fetch(
        `/api/tickets/validate?reservationId=${encodeURIComponent(reservationId)}&token=${encodeURIComponent(token)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = await res.json();
      const status: ValidationResponse["status"] = res.ok ? "valid" : "invalid";
      setValidated({ ...data, status, valid: res.ok });
      toast({
        title: res.ok ? "Billet validé" : "Billet refusé",
        description: data?.error || reservationId,
        variant: res.ok ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Erreur serveur", description: String(err), variant: "destructive" });
    } finally {
      setValidating(false);
    }
  }, [toast]);

  const processQRResult = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    try {
      setLastResult(decodedText);
      
      // If it's a URL to /reserve, open it
      try {
        const parsedUrl = new URL(decodedText, globalThis.location.origin);
        if (parsedUrl.pathname === "/reserve") {
          globalThis.location.href = parsedUrl.toString();
          return;
        }
      } catch {
        // not a URL, continue
      }

      // Try to parse JSON payload
      try {
        const obj = JSON.parse(decodedText);
        if (isSignedPayload(obj)) {
          setScanPayload(obj);
          await validateSignedPayload(obj);
          return;
        }
        if (obj.reservationId && obj.token) {
          await validateLegacyPayload(obj.reservationId, obj.token);
          return;
        }
        toast({ title: "QR non reconnu", description: "Format inattendu dans le code scanné", variant: "destructive" });
      } catch {
        toast({ title: "QR illisible", description: "Impossible de lire le contenu du QR code", variant: "destructive" });
      }
    } finally {
      // Délai avant de permettre un nouveau scan
      setTimeout(() => {
        processingRef.current = false;
      }, 2000);
    }
  }, [toast, validateSignedPayload, validateLegacyPayload]);

  const stopScanning = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScannerReady(false);
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setScannerError(null);
      
      // Charger jsQR
      const jsQR = await loadJsQR();
      if (!mountedRef.current) return;
      
      // Demander l'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      if (!mountedRef.current) {
        stopScanning();
        return;
      }
      
      setIsScanning(true);
      setScannerReady(true);
      
      // Boucle de scan
      const scan = () => {
        if (!mountedRef.current || !videoRef.current || !canvasRef.current) {
          return;
        }
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && code.data && !processingRef.current) {
            processQRResult(code.data);
          }
        }
        
        animationRef.current = requestAnimationFrame(scan);
      };
      
      animationRef.current = requestAnimationFrame(scan);
      
    } catch (err: any) {
      console.error("Scanner error:", err);
      setScannerError(err?.message || "Impossible d'accéder à la caméra");
      toast({ title: "Erreur caméra", description: err?.message || String(err), variant: "destructive" });
    }
  }, [toast, processQRResult, stopScanning]);

  useEffect(() => {
    mountedRef.current = true;
    startScanning();
    
    return () => {
      mountedRef.current = false;
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  async function markChecked(reservationId: string) {
    try {
      setChecking(true);
      const res = await fetch(`/api/reservations/${encodeURIComponent(reservationId)}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setValidated((prev) => ({ ...(prev ?? {}), valid: true, reservation: data.reservation }));
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

  const handleRestart = () => {
    stopScanning();
    setTimeout(() => startScanning(), 100);
  };

  // Fonction pour décoder une image QR depuis un fichier
  const decodeImageFile = useCallback(async (file: File) => {
    try {
      const jsQR = await loadJsQR();
      
      // Lire l'image
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.onload = () => {
          // Créer un canvas pour traiter l'image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            toast({ title: "Erreur", description: "Impossible de traiter l'image", variant: "destructive" });
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          
          if (code && code.data) {
            processQRResult(code.data);
            toast({ title: "QR détecté", description: "Code QR trouvé dans l'image" });
          } else {
            toast({ title: "Aucun QR trouvé", description: "Impossible de détecter un code QR dans cette image", variant: "destructive" });
          }
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    }
  }, [toast, processQRResult]);

  // Gestionnaires drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        decodeImageFile(file);
      } else {
        toast({ title: "Fichier invalide", description: "Veuillez déposer une image (PNG, JPG, etc.)", variant: "destructive" });
      }
    }
  }, [decodeImageFile, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        decodeImageFile(file);
      } else {
        toast({ title: "Fichier invalide", description: "Veuillez sélectionner une image (PNG, JPG, etc.)", variant: "destructive" });
      }
    }
  }, [decodeImageFile, toast]);

  const statusBadge = statusStyle(validated?.status ?? (validated?.valid ? "valid" : undefined));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scanner de billets</h1>
          <p className="text-sm text-muted-foreground">
            Scannez le QR d&apos;embarquement avec la caméra ou déposez une image QR.
          </p>
        </div>
        <Badge className={scannerReady ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
          {scannerReady ? (
            <><Camera className="w-3 h-3 mr-1" /> Caméra prête</>
          ) : (
            <><CameraOff className="w-3 h-3 mr-1" /> Initialisation...</>
          )}
        </Badge>
      </div>

      {/* Zone de drag & drop pour upload d'image */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
            : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Glissez-déposez une image QR ici ou{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-600 hover:text-emerald-700 font-medium underline"
            >
              parcourez vos fichiers
            </button>
          </p>
          <p className="text-xs text-gray-500">PNG, JPG, JPEG acceptés</p>
        </div>
      </div>

      <div className="relative w-full h-96 bg-black rounded-md border overflow-hidden">
        {/* Video et canvas pour le scan */}
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay avec cadre de ciblage */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Coins du cadre de ciblage */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              
              {/* Ligne de scan animée */}
              <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 animate-pulse" 
                   style={{ top: '50%', boxShadow: '0 0 8px rgba(52, 211, 153, 0.8)' }} />
            </div>
          </div>
        )}
        
        {/* Message de démarrage */}
        {!isScanning && !scannerError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <span className="text-sm">Démarrage du scanner...</span>
            </div>
          </div>
        )}
        
        {/* Message d'erreur */}
        {scannerError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <CameraOff className="w-12 h-12 mx-auto mb-2 text-red-400" />
              <span className="text-sm text-red-400 block mb-3">{scannerError}</span>
              <Button onClick={handleRestart} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {lastResult && (
        <div className="text-xs text-muted-foreground break-all bg-muted/50 p-2 rounded">
          Dernier scan : {lastResult}
        </div>
      )}

      {validated && (
        <div className="p-4 border rounded-md bg-white/60 dark:bg-gray-800/60 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-medium">Résultat de validation</div>
            <Badge className={statusBadge.className}>{statusBadge.text}</Badge>
          </div>

          {scanPayload && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>Réservation : <span className="font-semibold">{scanPayload.reservation_id}</span></div>
              <div>Client : <span className="font-semibold">{scanPayload.client_id}</span></div>
              <div>Bus : <span className="font-semibold">{scanPayload.bus_id ?? "Non assigné"}</span></div>
              <div>Siège : <span className="font-semibold">{scanPayload.seat_number ?? "Libre"}</span></div>
              <div>Date : <span className="font-semibold">{scanPayload.date}</span></div>
              <div>Heure : <span className="font-semibold">{scanPayload.time}</span></div>
            </div>
          )}

          {validated.issues?.length ? (
            <div className="text-sm text-red-700 dark:text-red-400 space-y-1">
              <div className="font-medium">Points à vérifier :</div>
              <ul className="list-disc pl-5 space-y-1">
                {validated.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {validated.error && !validated.valid && (
            <div className="text-sm text-red-700 dark:text-red-400">{validated.error}</div>
          )}

          {validated.valid && validated.reservation && (
            <div className="space-y-2 text-sm">
              <div>Client : {validated.reservation.client_name || validated.reservation.client_id}</div>
              <div>Places : {validated.reservation.nombre_places}</div>
              <div>Statut : {validated.reservation.statut}</div>
              <div>Check-in : {validated.reservation.checked ? "Oui" : "Non"}</div>
              {!validated.reservation.checked && (
                <Button onClick={() => markChecked(validated.reservation.id)} disabled={checking}>
                  {checking ? "Enregistrement..." : "Marquer comme présent"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleRestart} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Redémarrer
        </Button>
        {scanPayload && (
          <Button
            variant="outline"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(scanPayload))}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier les données QR
          </Button>
        )}
        {validating && <span className="text-sm text-muted-foreground self-center">Validation en cours…</span>}
      </div>
    </div>
  );
}
