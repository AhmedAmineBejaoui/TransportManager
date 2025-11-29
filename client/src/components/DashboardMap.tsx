import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadScript, GoogleMap, Circle, Marker, Polyline } from "@react-google-maps/api";
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
  origin?: string;
  destination?: string;
}

export function DashboardMap({ height = "h-[500px]", origin, destination }: DashboardMapProps) {
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
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeMarkers, setRouteMarkers] = useState<{
    origin?: google.maps.LatLngLiteral;
    destination?: google.maps.LatLngLiteral;
  }>({});
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey || "",
  });

  const center = useMemo(() => mapCenter, [mapCenter]);
  const mapError = loadError?.message ?? "";
  const billingNotEnabled = mapError.includes("BillingNotEnabled");

  useEffect(() => {
    if (userCoords && routePath.length === 0) {
      setMapCenter({
        lat: userCoords.latitude,
        lng: userCoords.longitude,
      });
    }
  }, [userCoords, routePath.length]);

  useEffect(() => {
    if (enableTracking) {
      startWatching();
    } else {
      stopWatching();
    }
  }, [enableTracking, startWatching, stopWatching]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!origin || !destination) {
      setRoutePath([]);
      setRouteDistance(null);
      setRouteMarkers({});
      setRouteError(null);
      return;
    }

    let active = true;
    const service = new google.maps.DirectionsService();
    setRouteLoading(true);
    setRouteError(null);

    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (!active) return;

        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes?.[0];
          const leg = route?.legs?.[0];
          const overviewPath = route?.overview_path ?? [];
          const path = overviewPath.map((point) => ({ lat: point.lat(), lng: point.lng() }));

          setRoutePath(path);
          setRouteDistance(leg?.distance?.text ?? null);
          setRouteMarkers({
            origin: leg?.start_location
              ? { lat: leg.start_location.lat(), lng: leg.start_location.lng() }
              : undefined,
            destination: leg?.end_location
              ? { lat: leg.end_location.lat(), lng: leg.end_location.lng() }
              : undefined,
          });

          if (path.length > 0) {
            setMapCenter(path[Math.floor(path.length / 2)]);
          } else if (leg?.start_location) {
            setMapCenter({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
          }

          if (mapRef.current && path.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            path.forEach((point) => bounds.extend(point));
            mapRef.current.fitBounds(bounds, 48);
          } else if (leg?.start_location && leg?.end_location && mapRef.current) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
            mapRef.current.fitBounds(bounds, 48);
          }
        } else {
          const statusLabel =
            status === google.maps.DirectionsStatus.REQUEST_DENIED
              ? "Clé Google Maps invalide ou facturation désactivée."
              : status === google.maps.DirectionsStatus.ZERO_RESULTS
                ? "Aucun itinéraire trouvé entre ces points."
                : status === google.maps.DirectionsStatus.NOT_FOUND
                  ? "Adresses introuvables pour l'itinéraire."
                  : "Impossible de calculer l'itinéraire. Verifiez les adresses.";
          setRouteError(statusLabel);
          setRoutePath([]);
          setRouteDistance(null);
          setRouteMarkers({});
        }

        setRouteLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [origin, destination, isLoaded]);

  if (!googleMapsApiKey || billingNotEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ma position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Pour afficher la carte :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Creer une cle Google Maps (console.cloud.google.com).</li>
            <li>Activez la facturation sur ce projet (exigence Google).</li>
            <li>Mettez la cle dans <code>client/.env.local - VITE_GOOGLE_MAPS_API_KEY</code>.</li>
          </ol>
          {billingNotEnabled && (
            <p className="text-red-500">Erreur actuelle : la facturation n'est pas activee sur votre cle.</p>
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
            Impossible de charger Google Maps ({loadError.message}). Verifiez votre cle.
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
            {(routeDistance || routeLoading || routeError || (origin && destination)) && (
              <div className="absolute top-4 left-4 z-10 space-y-2 max-w-xs">
                {routeDistance && (
                  <div className="rounded-md bg-white/90 px-3 py-2 shadow">
                    <p className="text-xs text-muted-foreground">Distance estimee</p>
                    <p className="font-semibold">{routeDistance}</p>
                    {origin && destination && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {`${origin} -> ${destination}`}
                      </p>
                    )}
                  </div>
                )}
                {routeLoading && (
                  <div className="rounded-md bg-white/90 px-3 py-2 shadow text-sm text-muted-foreground">
                    Calcul de l'itineraire...
                  </div>
                )}
                {routeError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 shadow text-sm text-red-800">
                    {routeError}
                  </div>
                )}
              </div>
            )}

            {geoError && (
              <Alert className="absolute top-4 left-4 right-4 z-10 bg-red-50 border-red-200 max-w-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-800">
                      {geoError}. Autorisez la geolocalisation dans les parametres de votre navigateur.
                    </AlertDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { startWatching(); setEnableTracking(true); }}>
                    Reessayer
                  </Button>
                </div>
              </Alert>
            )}
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              zoom={userCoords ? 14 : 6}
              center={center}
              onLoad={handleMapLoad}
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
                      title: `Votre position (Precision: ${Math.round(userCoords.accuracy)}m)`,
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

              {routeMarkers.origin && (
                <Marker
                  position={routeMarkers.origin}
                  options={{ title: "Depart" }}
                />
              )}
              {routeMarkers.destination && (
                <Marker
                  position={routeMarkers.destination}
                  options={{ title: "Arrivee" }}
                />
              )}
              {routePath.length > 0 && (
                <Polyline
                  path={routePath}
                  options={{
                    strokeColor: "#2563eb",
                    strokeOpacity: 0.9,
                    strokeWeight: 4,
                  }}
                />
              )}
            </GoogleMap>
            {enableTracking && userCoords && (
              <Alert className="absolute bottom-4 left-4 right-4 bg-blue-50 border-blue-200 max-w-xs z-10">
                <Navigation className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Precision: {Math.round(userCoords.accuracy)}m
                  {userCoords.speed !== undefined && ` - Vitesse: ${Math.round(userCoords.speed * 3.6)} km/h`}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
