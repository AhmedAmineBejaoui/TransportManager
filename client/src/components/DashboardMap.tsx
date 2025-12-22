import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, useMap } from "react-leaflet";
import { Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Trip } from "@shared/schema";
import L from "leaflet";

type LatLng = { lat: number; lng: number };

interface DashboardMapProps {
  height?: string;
  origin?: string;
  destination?: string;
  trips?: Trip[];
  activeTripId?: string;
}

type TripRoute = {
  id: string;
  label: string;
  path: LatLng[];
  start?: LatLng;
  end?: LatLng;
  distanceKm?: number;
};

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution = "© OpenStreetMap contributors";

const defaultCenter: LatLng = { lat: 34, lng: 9 };

function FitBounds({ paths, user }: { paths: LatLng[][]; user?: LatLng }) {
  const map = useMap();

  useEffect(() => {
    const allPoints = paths.flat().filter(Boolean) as LatLng[];
    if (user) allPoints.push(user);
    if (allPoints.length === 0) return;

    const bounds = allPoints.reduce(
      (acc, point) => acc.extend([point.lat, point.lng]),
      new L.LatLngBounds([allPoints[0].lat, allPoints[0].lng], [allPoints[0].lat, allPoints[0].lng]),
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [paths, user, map]);

  return null;
}

async function geocodeLabel(label: string, cache: Map<string, LatLng>): Promise<LatLng | null> {
  if (cache.has(label)) return cache.get(label)!;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(label)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "transport-manager-app/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.[0];
  if (!hit) return null;
  const coords = { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
  cache.set(label, coords);
  return coords;
}

async function fetchOsrmRoute(start: LatLng, end: LatLng): Promise<{ path: LatLng[]; distanceKm?: number }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return { path: [start, end] };
  const data = await res.json();
  const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates ?? [];
  const distanceMeters: number | undefined = data?.routes?.[0]?.distance;
  const distanceKm = typeof distanceMeters === "number" ? Math.round((distanceMeters / 1000) * 10) / 10 : undefined;
  if (!coords.length) return { path: [start, end], distanceKm };
  return {
    path: coords.map(([lng, lat]) => ({ lat, lng })),
    distanceKm,
  };
}

async function buildRouteFromLabels(
  id: string,
  from: string,
  to: string,
  cache: Map<string, LatLng>,
): Promise<TripRoute | null> {
  const [start, end] = await Promise.all([geocodeLabel(from, cache), geocodeLabel(to, cache)]);
  if (!start || !end) return null;
  const { path, distanceKm } = await fetchOsrmRoute(start, end);
  return {
    id,
    label: `${from} → ${to}`,
    path,
    start,
    end,
    distanceKm,
  };
}

export function DashboardMap({ height = "h-[500px]", origin, destination, trips, activeTripId }: DashboardMapProps) {
  const {
    coords: userCoords,
    error: geoError,
    isLoading: geoLoading,
    isWatching,
    startWatching,
    stopWatching,
  } = useGeolocation(true, true);

  const [enableTracking, setEnableTracking] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLng>(defaultCenter);
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeMarkers, setRouteMarkers] = useState<{ origin?: LatLng; destination?: LatLng }>({});
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [tripRoutes, setTripRoutes] = useState<TripRoute[]>([]);
  const [tripRoutesLoading, setTripRoutesLoading] = useState(false);
  const geocodeCacheRef = useRef<Map<string, LatLng>>(new Map());

  const center = useMemo(() => mapCenter, [mapCenter]);

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
    } else if (isWatching) {
      stopWatching();
    }
  }, [enableTracking, isWatching, startWatching, stopWatching]);

  // Build route from search
  useEffect(() => {
    if (!origin || !destination) {
      setRoutePath([]);
      setRouteDistance(null);
      setRouteMarkers({});
      setRouteError(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);
    setRouteError(null);

    buildRouteFromLabels("user-route", origin, destination, geocodeCacheRef.current)
      .then((route) => {
        if (cancelled) return;
        if (!route) {
          setRouteError("Impossible de tracer cet itineraire (geocodage)");
          setRoutePath([]);
          setRouteMarkers({});
          setRouteDistance(null);
          return;
        }
        setRoutePath(route.path);
        setRouteMarkers({ origin: route.start, destination: route.end });
        setRouteDistance(route.distanceKm ? `${route.distanceKm} km` : null);
        if (route.path.length > 0) {
          setMapCenter(route.path[Math.floor(route.path.length / 2)]);
        } else if (route.start) {
          setMapCenter(route.start);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRouteError("Erreur lors du calcul de l'itineraire.");
        setRoutePath([]);
        setRouteMarkers({});
        setRouteDistance(null);
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  // Build routes from admin trips
  useEffect(() => {
    if (!trips || trips.length === 0) {
      setTripRoutes([]);
      setTripRoutesLoading(false);
      return;
    }

    const limitedTrips = trips.slice(0, 6);
    let cancelled = false;
    setTripRoutesLoading(true);

    Promise.all(
      limitedTrips.map((trip) => {
        const from = trip.point_depart || trip.start_location;
        const to = trip.point_arrivee || trip.end_location;
        if (!from || !to) return Promise.resolve(null);
        return buildRouteFromLabels(trip.id, from, to, geocodeCacheRef.current);
      }),
    )
      .then((routes) => {
        if (cancelled) return;
        const filtered = routes.filter(Boolean) as TripRoute[];
        setTripRoutes(filtered);
      })
      .catch(() => {
        if (cancelled) return;
        setTripRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setTripRoutesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trips]);

  const allPaths = useMemo(() => {
    const combined: LatLng[][] = [];
    if (routePath.length) combined.push(routePath);
    tripRoutes.forEach((r) => {
      if (r.path.length) combined.push(r.path);
    });
    return combined;
  }, [routePath, tripRoutes]);

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
        {geoLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <>
            {(routeDistance || routeLoading || routeError || (origin && destination) || tripRoutesLoading) && (
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
                {tripRoutesLoading && (
                  <div className="rounded-md bg-white/90 px-3 py-2 shadow text-sm text-muted-foreground">
                    Synchronisation des trajets (OpenStreetMap)...
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

            <MapContainer
              className="h-full w-full"
              center={[center.lat, center.lng]}
              zoom={userCoords ? 13 : 6}
              zoomControl={false}
              scrollWheelZoom
            >
              <TileLayer url={tileUrl} attribution={tileAttribution} />

              {allPaths.length > 0 && <FitBounds paths={allPaths} user={userCoords ? { lat: userCoords.latitude, lng: userCoords.longitude } : undefined} />}

              {routePath.length > 0 && (
                <Polyline
                  positions={routePath.map((p) => [p.lat, p.lng] as [number, number])}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 5,
                    opacity: 0.9,
                  }}
                />
              )}

              {tripRoutes.filter((route) => route.path.length > 0).map((route) => (
                <Polyline
                  key={route.id}
                  positions={route.path.map((p) => [p.lat, p.lng] as [number, number])}
                  pathOptions={{
                    color: activeTripId === route.id ? "#38bdf8" : "#0ea5e9",
                    weight: activeTripId === route.id ? 6 : 4,
                    opacity: activeTripId === route.id ? 1 : 0.85,
                  }}
                />
              ))}

              {tripRoutes.map((route) => {
                const startPoint = route.start ?? route.path[0];
                if (!startPoint) return null;
                return (
                  <CircleMarker
                    key={`${route.id}-start`}
                    center={[startPoint.lat, startPoint.lng]}
                    pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9" }}
                    radius={7}
                  />
                );
              })}
              {tripRoutes.map((route) => {
                const endPoint = route.end ?? (route.path.length ? route.path[route.path.length - 1] : undefined);
                if (!endPoint) return null;
                return (
                  <CircleMarker
                    key={`${route.id}-end`}
                    center={[endPoint.lat, endPoint.lng]}
                    pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9" }}
                    radius={7}
                  />
                );
              })}

              {routeMarkers.origin && (
                <CircleMarker
                  center={[routeMarkers.origin.lat, routeMarkers.origin.lng]}
                  pathOptions={{ color: "#2563eb", fillColor: "#2563eb" }}
                  radius={8}
                />
              )}
              {routeMarkers.destination && (
                <CircleMarker
                  center={[routeMarkers.destination.lat, routeMarkers.destination.lng]}
                  pathOptions={{ color: "#2563eb", fillColor: "#2563eb" }}
                  radius={8}
                />
              )}

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
              <Alert className="absolute bottom-4 left-4 right-4 bg-blue-50 border-blue-200 max-w-xs z-10">
                <Navigation className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Precision: {Math.round(userCoords.accuracy)}m
                  {userCoords.speed !== undefined && ` - Vitesse: ${Math.round(userCoords.speed * 3.6)} km/h`}
                </AlertDescription>
              </Alert>
            )}

            {tripRoutes.length > 0 && (
              <Alert className="absolute bottom-4 right-4 bg-white/90 border-white/70 max-w-xs z-10">
                <AlertDescription className="text-sm text-slate-800">
                  {tripRoutes.length} trajets admin affiches sur la carte (OSM/Leaflet). Selectionnez un trajet pour reserver.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
