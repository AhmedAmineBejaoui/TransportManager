import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Calendar } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export type TripCardProps = {
  id: string;
  depart: string;
  arrivee: string;
  heureDepart?: Date | string | number | null;
  heureArrivee?: Date | string | number | null;
  prix: number;
  placesDisponibles: number;
  capaciteTotal?: number;
  statut: "planifie" | "en_cours" | "termine" | "annule";
  chauffeur?: string;
  vehicule?: string;
  onReserver?: () => void;
};

const statusConfig = {
  planifie: { label: "Planifié", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  en_cours: { label: "En cours", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  termine: { label: "Terminé", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  annule: { label: "Annulé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export function TripCard(props: Readonly<TripCardProps>) {
  const { id, depart, arrivee, heureDepart, prix, placesDisponibles, capaciteTotal, statut, chauffeur, vehicule, onReserver } = props;
  const status = statusConfig[statut];
  const isAvailable = placesDisponibles > 0 && statut === "planifie";
  let capacityLabel = "";
  if (capaciteTotal) {
    capacityLabel = `${placesDisponibles}/${capaciteTotal} places`;
  } else {
    capacityLabel = `${placesDisponibles} place${placesDisponibles > 1 ? "s" : ""} restantes`;
  }

  return (
    <Card className="hover-elevate" data-testid={`card-trip-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-semibold text-base">{depart}</span>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <div className="h-6 w-px bg-border" />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="font-semibold text-base">{arrivee}</span>
            </div>
          </div>
          <Badge className={status.className} data-testid={`badge-trip-status-${id}`}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/** Safe date parsing and rendering: avoid calling format on invalid dates */}
          {(() => {
            const toDate = (d?: Date | string | number | null): Date | null => {
              if (!d) return null;
              if (d instanceof Date) return isValid(d) ? d : null;
              if (typeof d === "number") {
                const dt = new Date(d);
                return isValid(dt) ? dt : null;
              }
              if (typeof d === "string") {
                // try ISO parse first
                const parsed = parseISO(d);
                if (isValid(parsed)) return parsed;
                // fallback to Date constructor for other formats
                const dt2 = new Date(d);
                return isValid(dt2) ? dt2 : null;
              }
              return null;
            };

            const dep = toDate(heureDepart);
            return (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{dep ? format(dep, "dd MMM yyyy", { locale: fr }) : "--"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{dep ? format(dep, "HH:mm", { locale: fr }) : "--:--"}</span>
                </div>
              </>
            );
          })()}
        </div>

        {chauffeur && (
          <p className="text-sm text-muted-foreground">
            Chauffeur: {chauffeur}
          </p>
        )}

        {vehicule && (
          <p className="text-sm text-muted-foreground">
            Véhicule: {vehicule}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{capacityLabel}</span>
          </div>
          <span className="text-xl font-bold text-primary" data-testid={`text-trip-price-${id}`}>
            {prix} DH
          </span>
        </div>
      </CardContent>

      {onReserver && (
        <CardFooter>
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <InlineTripQr tripId={id} isAvailable={isAvailable} />
              <div className="text-sm text-muted-foreground">Scannez pour réserver</div>
            </div>

            <Button
              className="w-40"
              disabled={!isAvailable}
              onClick={onReserver}
              data-testid={`button-reserve-${id}`}
            >
              {isAvailable ? "Réserver" : "Complet"}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

function InlineTripQr(props: Readonly<{ tripId: string; isAvailable: boolean }>) {
  const { tripId, isAvailable } = props;
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function gen() {
      if (!isAvailable) return;
      const origin = typeof location === "undefined" ? "" : location.origin;
      const url = `${origin}/reserve?tripId=${encodeURIComponent(tripId)}&auto=1`;
      try {
        const d = await QRCode.toDataURL(url, { margin: 1, width: 120 });
        if (mounted) setDataUrl(d);
      } catch (err) {
        // log any QR generation error to help debugging
        // eslint-disable-next-line no-console
        console.error("QR generation error", err);
      }
    }
    void gen();
    return () => { mounted = false; };
  }, [tripId, isAvailable]);

  if (!isAvailable) {
    return <div className="text-xs text-muted-foreground">Complet</div>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      {dataUrl ? (
        <button onClick={() => globalThis.dispatchEvent(new CustomEvent("open-reserve-qr", { detail: { tripId } }))} className="p-0">
          <img src={dataUrl} alt="QR reserve" className="w-20 h-20 rounded-sm border" />
        </button>
      ) : (
        <div className="w-20 h-20 bg-muted" />
      )}
    </div>
  );
}
