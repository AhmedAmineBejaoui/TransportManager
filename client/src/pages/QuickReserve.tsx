import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CreateReservationDialog } from "@/components/CreateReservationDialog";

export default function QuickReserve() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(true);
  const [tripId, setTripId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const id = params.get("tripId");
    setTripId(id);
    setOpen(Boolean(id));
    const auto = params.get("auto");
    setAutoSubmit(auto === "1");
    const seats = params.get("seats");
    setDefaultSeats(seats ?? undefined);
  }, [location]);

  const [autoSubmit, setAutoSubmit] = useState(false);
  const [defaultSeats, setDefaultSeats] = useState<string | undefined>(undefined);

  // trip data isn't needed here; the dialog will fetch trip by id when opened

  return (
    <div>
      {tripId && (
        <CreateReservationDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setLocation("/");
          }}
          tripId={tripId}
          defaultNombrePlaces={defaultSeats}
          autoSubmit={autoSubmit}
        />
      )}
    </div>
  );
}
