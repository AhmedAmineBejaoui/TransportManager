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

export const tunisiaRoutes: TunisiaRoute[] = [
  {
    id: "tn-tunis-bizerte",
    depart: "Tunis",
    departCoords: { lat: 36.8065, lng: 10.1815 },
    arrivee: "Bizerte",
    arriveeCoords: { lat: 37.2744, lng: 9.8739 },
    distanceKm: 66,
    moyenneRemplissage: 0.92,
    prochaineDepart: "17:15",
    busActifs: 3,
  },
  {
    id: "tn-tunis-sousse",
    depart: "Tunis",
    departCoords: { lat: 36.8065, lng: 10.1815 },
    arrivee: "Sousse",
    arriveeCoords: { lat: 35.8256, lng: 10.6411 },
    distanceKm: 140,
    moyenneRemplissage: 0.85,
    prochaineDepart: "15:40",
    busActifs: 4,
  },
  {
    id: "tn-sousse-sfax",
    depart: "Sousse",
    departCoords: { lat: 35.8256, lng: 10.6411 },
    arrivee: "Sfax",
    arriveeCoords: { lat: 34.7398, lng: 10.7603 },
    distanceKm: 135,
    moyenneRemplissage: 0.73,
    prochaineDepart: "14:05",
    busActifs: 2,
  },
  {
    id: "tn-tunis-gabes",
    depart: "Tunis",
    departCoords: { lat: 36.8065, lng: 10.1815 },
    arrivee: "Gabès",
    arriveeCoords: { lat: 33.8815, lng: 10.0982 },
    distanceKm: 420,
    moyenneRemplissage: 0.67,
    prochaineDepart: "19:00",
    busActifs: 2,
  },
  {
    id: "tn-sfax-djerba",
    depart: "Sfax",
    departCoords: { lat: 34.7398, lng: 10.7603 },
    arrivee: "Djerba (Houmt Souk)",
    arriveeCoords: { lat: 33.8720, lng: 10.8575 },
    distanceKm: 230,
    moyenneRemplissage: 0.8,
    prochaineDepart: "08:30",
    busActifs: 3,
  },
];
