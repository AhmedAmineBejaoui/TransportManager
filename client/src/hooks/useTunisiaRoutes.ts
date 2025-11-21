import { useQuery } from "@tanstack/react-query";

export type TunisiaRoute = {
  id: string;
  depart: string;
  departCoords: { lat: number; lng: number };
  arrivee: string;
  arriveeCoords: { lat: number; lng: number };
  distanceKm: number;
  moyenneRemplissage: number;
  prochaineDepart: string;
  busActifs: number;
};

export function useTunisiaRoutes() {
  return useQuery<TunisiaRoute[]>({
    queryKey: ["/api/geo/tunisia-routes"],
  });
}
