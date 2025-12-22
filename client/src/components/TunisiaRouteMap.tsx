import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTunisiaRoutes } from "@/hooks/useTunisiaRoutes";
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, useMap } from "react-leaflet";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import L from "leaflet";

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution = "© OpenStreetMap contributors";

type LatLng = { lat: number; lng: number };

function FitBounds({ routes, user }: { routes: { path: LatLng[] }[]; user?: LatLng }) {
  const map = useMap();

  useEffect(() => {
    const points: LatLng[] = [];
    routes.forEach((route) => route.path.forEach((p) => points.push(p)));
    if (user) points.push(user);
    if (!points.length) return;
    const bounds = points.reduce(
      (acc, point) => acc.extend([point.lat, point.lng]),
      new L.LatLngBounds([points[0].lat, points[0].lng], [points[0].lat, points[0].lng]),
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [routes, user, map]);

  return null;
}

export function TunisiaRouteMap() {
  const { data: routes = [], isLoading } = useTunisiaRoutes();
  const {
    coords: userCoords,
    error: geoError,
    isLoading: geoLoading,
    startWatching,
    stopWatching,
  } = useGeolocation(true, true);
  const [enableTracking, setEnableTracking] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 34, lng: 9 });

  const enrichedRoutes = useMemo(
    () =>
      routes.map((route: any) => ({
        ...route,
        path: [
          { lat: route.departCoords.lat, lng: route.departCoords.lng },
          { lat: route.arriveeCoords.lat, lng: route.arriveeCoords.lng },
        ],
      })),
    [routes],
  );

  useEffect(() => {
    if (userCoords) {
      setMapCenter({
        lat: userCoords.latitude,
        lng: userCoords.longitude,
      });
    }
  }, [userCoords]);

  useEffect(() => {
    if (enableTracking) {
      startWatching();
    } else {
      stopWatching();
    }
  }, [enableTracking, startWatching, stopWatching]);

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>Flux en temps reel</CardTitle>
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
        <CardContent className="h-[420px] p-0 relative">
          {isLoading || geoLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <>
              {geoError && (
                <Alert className="mb-2 bg-red-50 border-red-200">
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

              <MapContainer
                className="h-full w-full"
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={userCoords ? 13 : 6}
                zoomControl={false}
                scrollWheelZoom
              >
                <TileLayer url={tileUrl} attribution={tileAttribution} />
                <FitBounds
                  routes={enrichedRoutes}
                  user={userCoords ? { lat: userCoords.latitude, lng: userCoords.longitude } : undefined}
                />

                {enrichedRoutes.map((route: any) => (
                  <Polyline
                    key={route.id}
                    positions={route.path.map((p: LatLng) => [p.lat, p.lng] as [number, number])}
                    pathOptions={{
                      color: "#2563eb",
                      weight: 4,
                      opacity: 0.8,
                    }}
                  />
                ))}
                {enrichedRoutes.flatMap((route: any) => {
                  const markers: JSX.Element[] = [];
                  const start = route.path[0];
                  const end = route.path[1];
                  if (start) {
                    markers.push(
                      <Circle
                        key={`${route.id}-depart`}
                        center={[start.lat, start.lng]}
                        pathOptions={{ color: "#2563eb", fillColor: "#2563eb", weight: 0, fillOpacity: 0.7 }}
                        radius={1500}
                      />,
                    );
                  }
                  if (end) {
                    markers.push(
                      <Circle
                        key={`${route.id}-arrivee`}
                        center={[end.lat, end.lng]}
                        pathOptions={{ color: "#dc2626", fillColor: "#dc2626", weight: 0, fillOpacity: 0.7 }}
                        radius={1500}
                      />,
                    );
                  }
                  return markers;
                })}

                {userCoords && (
                  <>
                    <CircleMarker
                      center={[userCoords.latitude, userCoords.longitude]}
                      pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6" }}
                      radius={8}
                    />
                    <Circle
                      center={[userCoords.latitude, userCoords.longitude]}
                      pathOptions={{
                        color: "#3b82f6",
                        fillColor: "#3b82f6",
                        weight: 1,
                        opacity: 0.3,
                        fillOpacity: 0.08,
                      }}
                      radius={userCoords.accuracy}
                    />
                  </>
                )}
              </MapContainer>

              {enableTracking && userCoords && (
                <Alert className="absolute bottom-4 left-4 right-4 bg-blue-50 border-blue-200 max-w-xs">
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

      <div className="space-y-4">
        {routes.map((route: any) => (
          <Card key={route.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {route.depart} → {route.arrivee}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span>Distance</span>
                <span className="font-medium">{route.distanceKm} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bus actifs</span>
                <span className="font-medium">{route.busActifs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Depart à</span>
                <Badge>{route.prochaineDepart}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Taux de remplissage</span>
                <span className="font-medium">{Math.round(route.moyenneRemplissage * 100)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
