import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadScript, GoogleMap, Circle, Marker } from "@react-google-maps/api";
import { Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Alert, AlertDescription } from "@/components/ui/alert";

const mapContainerStyle: google.maps.MapOptions["styles"] = [
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3476e6" }],
  },
];

interface DashboardMapProps {
  height?: string;
}

export function DashboardMap({ height = "h-[500px]" }: DashboardMapProps) {
  const {
    coords: userCoords,
    error: geoError,
    isLoading: geoLoading,
    isWatching,
    startWatching,
    stopWatching,
  } = useGeolocation(true, true);
  
  const [enableTracking, setEnableTracking] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 34, lng: 9 });

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey || "",
  });

  const center = useMemo(() => mapCenter, [mapCenter]);
  const mapError = loadError?.message ?? "";
  const billingNotEnabled = mapError.includes("BillingNotEnabled");

  // Mettre à jour le centre de la carte en fonction de la géolocalisation
  useEffect(() => {
    if (userCoords) {
      setMapCenter({
        lat: userCoords.latitude,
        lng: userCoords.longitude,
      });
    }
  }, [userCoords]);

  // Gérer le suivi de position
  useEffect(() => {
    if (enableTracking) {
      startWatching();
    } else {
      stopWatching();
    }
  }, [enableTracking, startWatching, stopWatching]);

  if (!googleMapsApiKey || billingNotEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ma position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Pour afficher la carte :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Créez une clé Google Maps (console.cloud.google.com).</li>
            <li>Activez la facturation sur ce projet (exigence Google).</li>
            <li>Mettez la clé dans <code>client/.env.local → VITE_GOOGLE_MAPS_API_KEY</code>.</li>
          </ol>
          {billingNotEnabled && (
            <p className="text-red-500">Erreur actuelle : la facturation n'est pas activée sur votre clé.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loadError && !billingNotEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ma position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Impossible de charger Google Maps ({loadError.message}). Vérifiez votre clé.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Ma position</CardTitle>
        <Button
          variant={enableTracking ? "default" : "outline"}
          size="sm"
          onClick={() => setEnableTracking(!enableTracking)}
          className="gap-2"
        >
          <Navigation className="h-4 w-4" />
          {enableTracking ? "Suivi actif" : "Activer suivi"}
        </Button>
      </CardHeader>
      <CardContent className={`${height} p-0 relative`}>
        {!isLoaded || geoLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <>
            {geoError && (
              <Alert className="absolute top-4 left-4 right-4 z-10 bg-red-50 border-red-200 max-w-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-800">
                      {geoError}. Autorisez la géolocalisation dans les paramètres de votre navigateur.
                    </AlertDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { startWatching(); setEnableTracking(true); }}>
                    Réessayer
                  </Button>
                </div>
              </Alert>
            )}
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              zoom={userCoords ? 14 : 6}
              center={center}
              options={{
                styles: mapContainerStyle,
                disableDefaultUI: true,
              }}
            >
              {userCoords && (
                <>
                  <Marker
                    position={{
                      lat: userCoords.latitude,
                      lng: userCoords.longitude,
                    }}
                    options={{
                      title: `Votre position (Précision: ${Math.round(userCoords.accuracy)}m)`,
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#3b82f6",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                      },
                    }}
                  />
                  <Circle
                    center={{
                      lat: userCoords.latitude,
                      lng: userCoords.longitude,
                    }}
                    options={{
                      radius: userCoords.accuracy,
                      fillColor: "#3b82f6",
                      fillOpacity: 0.1,
                      strokeColor: "#3b82f6",
                      strokeOpacity: 0.3,
                      strokeWeight: 1,
                    }}
                  />
                </>
              )}
            </GoogleMap>
            {enableTracking && userCoords && (
              <Alert className="absolute bottom-4 left-4 right-4 bg-blue-50 border-blue-200 max-w-xs z-10">
                <Navigation className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Précision: {Math.round(userCoords.accuracy)}m
                  {userCoords.speed !== undefined && ` • Vitesse: ${Math.round(userCoords.speed * 3.6)} km/h`}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
