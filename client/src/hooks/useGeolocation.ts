import { useState, useEffect, useCallback, useRef } from "react";

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface UseGeolocationReturn {
  coords: GeolocationCoords | null;
  error: string | null;
  isLoading: boolean;
  isWatching: boolean;
  startWatching: () => void;
  stopWatching: () => void;
}

export function useGeolocation(
  enableWatch: boolean = true,
  highAccuracy: boolean = true
): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } =
      position.coords;

    setCoords({
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = "Erreur de géolocalisation";

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = "Permission de géolocalisation refusée";
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = "Position non disponible";
        break;
      case err.TIMEOUT:
        errorMessage = "Délai d'attente dépassé";
        break;
    }

    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par ce navigateur");
      return;
    }

    if (watchIdRef.current !== null) return;

    setIsWatching(true);
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: highAccuracy,
      maximumAge: 1000,
      timeout: 10000,
    });
  }, [handleSuccess, handleError, highAccuracy]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsWatching(false);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par ce navigateur");
      setIsLoading(false);
      return;
    }

    // Obtenir la position initiale
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: highAccuracy,
      timeout: 10000,
    });

    // Démarrer la surveillance si activée
    if (enableWatch) {
      startWatching();
    }

    return () => {
      stopWatching();
    };
  }, [enableWatch, highAccuracy, handleSuccess, handleError, startWatching, stopWatching]);

  return {
    coords,
    error,
    isLoading,
    isWatching,
    startWatching,
    stopWatching,
  };
}
