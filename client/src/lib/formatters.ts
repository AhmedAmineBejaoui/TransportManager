import type { Trip, Reservation, Vehicle } from "@shared/schema";
import type { TripCardProps } from "@/components/TripCard";
import type { ReservationCardProps } from "@/components/ReservationCard";
import type { VehicleCardProps } from "@/components/VehicleCard";

const TRIP_STATUSES: TripCardProps["statut"][] = ["planifie", "en_cours", "termine", "annule"];
const VEHICLE_STATUSES: VehicleCardProps["statut"][] = ["disponible", "en_route", "en_maintenance"];
const RESERVATION_STATUSES: ReservationCardProps["statut"][] = ["en_attente", "confirme", "annule", "termine"];

function normalizeValue<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  if (value && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

export function normalizeTripStatus(status: Trip["statut"]): TripCardProps["statut"] {
  return normalizeValue(status ?? undefined, TRIP_STATUSES, "planifie");
}

export function normalizeVehicleStatus(status: Vehicle["statut"]): VehicleCardProps["statut"] {
  return normalizeValue(status ?? undefined, VEHICLE_STATUSES, "disponible");
}

export function normalizeReservationStatus(status: Reservation["statut"]): ReservationCardProps["statut"] {
  return normalizeValue(status ?? undefined, RESERVATION_STATUSES, "en_attente");
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

export function buildTripCardModel(trip: Trip, options?: { totalCapacity?: number; chauffeurName?: string; vehicleLabel?: string }): TripCardProps {
  return {
    id: trip.id,
    depart: trip.point_depart,
    arrivee: trip.point_arrivee,
    heureDepart: new Date(trip.heure_depart_prevue),
    heureArrivee: new Date(trip.heure_arrivee_prevue),
    prix: toNumber(trip.prix),
    placesDisponibles: trip.places_disponibles,
    capaciteTotal: options?.totalCapacity,
    statut: normalizeTripStatus(trip.statut),
    chauffeur: options?.chauffeurName ?? trip.chauffeur_id ?? undefined,
    vehicule: options?.vehicleLabel ?? trip.vehicle_id ?? undefined,
  };
}

export function formatTripLabel(trip: Trip): string {
  return `${trip.point_depart} → ${trip.point_arrivee}`;
}

export function buildReservationCardModel(reservation: Reservation, trip?: Trip): ReservationCardProps | null {
  if (!trip) {
    return null;
  }

  return {
    id: reservation.id,
    depart: trip.point_depart,
    arrivee: trip.point_arrivee,
    heureDepart: new Date(trip.heure_depart_prevue),
    nombrePlaces: reservation.nombre_places,
    numeroSiege: reservation.numero_siege ?? undefined,
    montantTotal: toNumber(reservation.montant_total),
    statut: normalizeReservationStatus(reservation.statut),
    dateReservation: reservation.date_reservation ?? new Date(),
    // If server included qr in the reservation object, expose the text for the UI
    qrText: (reservation as any)?.qr?.text ?? undefined,
  };
}

export function buildVehicleCardModel(vehicle: Vehicle, options?: { chauffeurName?: string }): VehicleCardProps {
  return {
    id: vehicle.id,
    immatriculation: vehicle.immatriculation,
    marque: vehicle.marque,
    modele: vehicle.modele,
    capacite: vehicle.capacite,
    statut: normalizeVehicleStatus(vehicle.statut),
    chauffeur: options?.chauffeurName ?? vehicle.chauffeur_id ?? undefined,
  };
}
