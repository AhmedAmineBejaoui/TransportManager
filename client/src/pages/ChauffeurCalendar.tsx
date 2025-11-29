import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Clock,
  FileDown,
  MapPin,
  Navigation,
  TimerReset,
  User,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useChauffeurTrips, useUpdateTrip } from "@/hooks/useTrips";
import { useCreateIncident } from "@/hooks/useChauffeurInsights";
import type { Trip, Reservation } from "@shared/schema";
import { normalizeTripStatus } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type TripPlanning = {
  id: string;
  date: string;
  start: string;
  end: string;
  from: string;
  to: string;
  mission: string;
  status: "a_venir" | "termine" | "off";
  places_disponibles?: number;
};

type CalendarDay = {
  date: string;
  label: string;
  status: "worked" | "off" | "done" | "upcoming";
  note?: string;
};

const importantEvents = [
  {
    title: "Entretien vehicule",
    date: "25 nov - 14:00",
    detail: "Vidange + filtres, garage central",
    type: "maintenance",
  },
  {
    title: "Formation securite",
    date: "27 nov - 09:00",
    detail: "Session en ligne, module conduite defensive",
    type: "formation",
  },
  {
    title: "Conge valide",
    date: "30 nov",
    detail: "Journee OFF validee par le dispatch",
    type: "conge",
  },
];

const samplePassengers = [
  { name: "Yasmine G.", phone: "+216 22 111 222", seat: "A3", status: "Confirme", note: "Client fidele" },
  { name: "Karim L.", phone: "+216 52 444 555", seat: "B1", status: "Paye", note: "Bagage volumineux" },
  { name: "Meriem S.", phone: "+216 98 777 888", seat: "B2", status: "En attente", note: "Arrive 5 min avant" },
];

const statusBadge: Record<TripPlanning["status"], string> = {
  a_venir: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  termine: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  off: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
};

const dayColors: Record<CalendarDay["status"], string> = {
  worked: "border-primary/60 bg-primary/5",
  off: "border-dashed border-slate-300 dark:border-slate-700 bg-muted",
  done: "border-emerald-400/70 bg-emerald-50 dark:bg-emerald-900/20",
  upcoming: "border-blue-400/70 bg-blue-50 dark:bg-blue-900/20",
};

const dayStatusLabel: Record<CalendarDay["status"], string> = {
  worked: "Travaille",
  off: "Off",
  done: "Termine",
  upcoming: "A venir",
};

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTripPlanningFromTrip(trip: Trip): TripPlanning {
  const departDate = new Date(trip.heure_depart_prevue);
  const arriveeDate = new Date(trip.heure_arrivee_prevue);
  const normalizedStatus = normalizeTripStatus(trip.statut);
  const now = new Date();

  let status: TripPlanning["status"] = "a_venir";
  if (normalizedStatus === "termine" || departDate < now) {
    status = "termine";
  }

   // Traduction du workflow métier pour l'affichage chauffeur
   const workflow = (trip.status ?? "") as string;
   let mission = "Trajet planifie";
   if (workflow === "waiting_chauffeur_confirmation") {
     mission = "Client paye • Trajet a confirmer";
   } else if (workflow === "confirmed") {
     mission = "Mission confirmee (client paye)";
   } else if (workflow === "to_reassign") {
     mission = "A reassigner par le dispatch";
   }

  return {
    id: trip.id,
    date: toISODate(departDate),
    start: format(departDate, "HH:mm"),
    end: format(arriveeDate, "HH:mm"),
    from: trip.point_depart,
    to: trip.point_arrivee,
    mission,
    status,
    places_disponibles: trip.places_disponibles,
  };
}

function buildCalendarDays(trips: TripPlanning[]): CalendarDay[] {
  const today = new Date();

  const tripsByDate = trips.reduce<Record<string, TripPlanning[]>>((acc, trip) => {
    acc[trip.date] = acc[trip.date] ? [...acc[trip.date], trip] : [trip];
    return acc;
  }, {});

  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const iso = toISODate(date);
    const dayTrips = tripsByDate[iso] ?? [];

    let status: CalendarDay["status"] = "off";
    let note: string | undefined = "Jour off";

    if (dayTrips.length > 0) {
      const hasUpcoming = dayTrips.some((t) => t.status === "a_venir");
      const hasDone = dayTrips.some((t) => t.status === "termine");

      if (hasUpcoming) {
        status = "upcoming";
        note = `${dayTrips.length} trajet(s) a venir`;
      } else if (hasDone) {
        status = "done";
        note = "Trajets termines";
      } else {
        status = "worked";
        note = `${dayTrips.length} trajet(s)`;
      }
    }

    days.push({
      date: iso,
      label: format(date, "EEE dd", { locale: fr }),
      status,
      note,
    });
  }

  return days;
}

function generateMissionOrderPdf(trips: TripPlanning[], date: string) {
  const doc = new jsPDF();
  const missionDate = parseISO(date);

  doc.setFontSize(16);
  doc.text("Ordre de mission chauffeur", 14, 18);
  doc.setFontSize(11);
  doc.text(`Date : ${format(missionDate, "dd MMMM yyyy", { locale: fr })}`, 14, 28);
  doc.text(`Nombre de trajets : ${trips.length}`, 14, 36);

  let y = 50;
  trips.forEach((trip, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.text(`Trajet ${index + 1}`, 14, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(`Heure : ${trip.start} - ${trip.end}`, 14, y);
    y += 6;
    doc.text(`Itineraire : ${trip.from} -> ${trip.to}`, 14, y);
    y += 6;
    doc.text(`Mission : ${trip.mission}`, 14, y);
    y += 6;
    doc.text(
      `Statut : ${trip.status === "a_venir" ? "A venir" : trip.status === "termine" ? "Termine" : "Off"}`,
      14,
      y,
    );
    y += 10;
  });

  doc.setFontSize(10);
  doc.text("Signature chauffeur: ____________________", 14, y + 8);
  doc.text("Cachet dispatch: ____________________", 120, y + 8);

  doc.save(`ordre-mission-${date}.pdf`);
}

export default function ChauffeurCalendar() {
  const { data: trips = [], isLoading } = useChauffeurTrips();
  const updateTrip = useUpdateTrip();
  const createIncident = useCreateIncident();
  const { toast } = useToast();
  const [view, setView] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));
  const [passengerDrawerOpen, setPassengerDrawerOpen] = useState(false);
  const [tripForPassengers, setTripForPassengers] = useState<TripPlanning | null>(null);

  const tripPlanning = useMemo<TripPlanning[]>(() => {
    return trips.map((trip) => buildTripPlanningFromTrip(trip));
  }, [trips]);

  const tripsByDate = useMemo(() => {
    return tripPlanning.reduce<Record<string, TripPlanning[]>>((acc, trip) => {
      acc[trip.date] = acc[trip.date] ? [...acc[trip.date], trip] : [trip];
      return acc;
    }, {});
  }, [tripPlanning]);

  const calendarDays = useMemo<CalendarDay[]>(() => buildCalendarDays(tripPlanning), [tripPlanning]);

  const counters = useMemo(() => {
    return {
      upcoming: tripPlanning.filter((t) => t.status === "a_venir").length,
      done: tripPlanning.filter((t) => t.status === "termine").length,
      off: calendarDays.filter((d) => d.status === "off").length,
      worked: calendarDays.filter((d) => d.status === "worked").length,
    };
  }, [tripPlanning, calendarDays]);

  const selectedTrips = tripsByDate[selectedDate] ?? [];
  const selectedDayInfo = calendarDays.find((d) => d.date === selectedDate);
  const currentTripForPassengers = tripForPassengers;

  const { data: passengerReservations = [], isLoading: isLoadingPassengers } = useQuery<Reservation[]>({
    queryKey: ["/api/trips", currentTripForPassengers?.id, "reservations"],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${currentTripForPassengers?.id}/reservations`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Impossible de charger les passagers");
      }
      return (await res.json()) as Reservation[];
    },
    enabled: Boolean(currentTripForPassengers?.id),
  });

  const confirmTrip = (tripId: string) => {
    updateTrip.mutate(
      { id: tripId, data: { status: "confirmed" } as any },
      {
        onSuccess: () => {
          toast({
            title: "Mission confirmee",
            description: "Le dispatch est informe que le client a paye.",
          });
        },
        onError: (error: any) =>
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de confirmer le trajet",
            variant: "destructive",
          }),
      },
    );
  };

  const refuseTrip = (tripId: string) => {
    updateTrip.mutate(
      { id: tripId, data: { status: "to_reassign" } as any },
      {
        onSuccess: () => {
          toast({
            title: "Mission refusee",
            description: "Le dispatch doit reassigner ce trajet.",
          });
        },
        onError: (error: any) =>
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de refuser le trajet",
            variant: "destructive",
          }),
      },
    );
  };

  const handleOpenPassengerDetails = (trip?: TripPlanning) => {
    const fallbackTrip = trip ?? selectedTrips[0] ?? tripPlanning[0];
    if (!fallbackTrip) {
      toast({
        title: "Aucun trajet",
        description: "Aucun trajet selectionne pour afficher les passagers.",
        variant: "destructive",
      });
      return;
    }
    setTripForPassengers(fallbackTrip);
    setPassengerDrawerOpen(true);
  };

  const handleAction = (title: string, description: string) => {
    toast({ title, description });
  };

  const handleQuickIncident = () => {
    const description = window.prompt("Decrivez rapidement le retard ou l'incident :");
    if (!description || !description.trim()) {
      return;
    }

    createIncident.mutate(
      { type: "trafic", description: description.trim() },
      {
        onSuccess: () =>
          toast({
            title: "Incident signale",
            description: "Le centre a ete informe.",
          }),
        onError: () =>
          toast({
            title: "Erreur",
            description: "Impossible de signaler l'incident",
            variant: "destructive",
          }),
      }
    );
  };

  const handleDownload = () => {
    const fallback = Object.entries(tripsByDate)
      .filter(([, list]) => list.length > 0)
      .sort(([a], [b]) => a.localeCompare(b))[0];

    const orderDate = selectedTrips.length > 0 ? selectedDate : fallback?.[0];
    const tripsForOrder = selectedTrips.length > 0 ? selectedTrips : fallback?.[1] ?? [];

    if (!orderDate || tripsForOrder.length === 0) {
      toast({
        title: "Aucun trajet",
        description: "Aucun trajet disponible pour generer un ordre de mission.",
        variant: "destructive",
      });
      return;
    }

    generateMissionOrderPdf(tripsForOrder, orderDate);
    toast({
      title: "Ordre de mission",
      description: `PDF genere pour le ${format(parseISO(orderDate), "dd/MM/yyyy", { locale: fr })}`,
    });
  };

  const reservedSeats = passengerReservations.reduce((sum, reservation) => {
    const seats = typeof reservation.nombre_places === "number" ? reservation.nombre_places : Number(reservation.nombre_places ?? 0);
    return sum + (Number.isFinite(seats) ? seats : 0);
  }, 0);
  const remainingSeats = tripForPassengers?.places_disponibles ?? 0;
  const totalSeats = reservedSeats + remainingSeats || undefined;

  const passengerItems =
    passengerReservations.length > 0
      ? passengerReservations.map((reservation, index) => ({
          name: reservation.client_id ? `Client ${reservation.client_id.slice(0, 6)}` : `Passager ${index + 1}`,
          phone: "Non fourni",
          seat: reservation.numero_siege ?? `x${reservation.nombre_places} place(s)`,
          status: reservation.statut ?? "en_attente",
          note: reservation.checked ? "Check-in effectue" : "En attente de check-in",
        }))
      : samplePassengers;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Calendrier chauffeur</h1>
          <p className="text-muted-foreground mt-1">Planning, disponibilites et actions rapides</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            {counters.upcoming} a venir
          </Badge>
          <Badge variant="outline" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {counters.done} termines
          </Badge>
          <Badge variant="outline" className="gap-2">
            <CalendarX2 className="h-4 w-4" />
            {counters.off} jours off
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Planning des trajets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : tripPlanning.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun trajet planifie pour le moment.</p>
            ) : (
              Object.entries(tripsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, tripsForDay]) => (
                  <div key={date} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{formatDate(date)}</span>
                      </div>
                      <Badge variant="secondary">{tripsForDay.length} trajet(s)</Badge>
                    </div>
                    <div className="space-y-3">
                      {tripsForDay.map((trip) => (
                        <div
                          key={trip.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Clock className="h-4 w-4 text-primary" />
                              <span>
                                {trip.start} - {trip.end}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {trip.from} vers {trip.to}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{trip.mission}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={statusBadge[trip.status]}>
                              {trip.status === "a_venir" ? "A venir" : trip.status === "termine" ? "Termine" : "Off"}
                            </Badge>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenPassengerDetails(trip)}>
                                Passagers
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedDate(trip.date);
                                setView("daily");
                              }}>
                                Voir jour
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => confirmTrip(trip.id)}
                                disabled={trip.status === "termine" || updateTrip.isPending}
                              >
                                Confirmer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => refuseTrip(trip.id)}
                                disabled={trip.status === "termine" || updateTrip.isPending}
                              >
                                Refuser
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Actions rapides</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-2"
              onClick={() => handleAction("Trajet confirme", "Utilisez les boutons sur chaque trajet.")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmer un trajet
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => handleAction("Indisponibilite signalee", "Le dispatch est informe")}
            >
              <CalendarX2 className="h-4 w-4" />
              Signaler une indisponibilite
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => handleOpenPassengerDetails()}
            >
              <User className="h-4 w-4" />
              Consulter les details passager
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline" onClick={handleDownload}>
              <FileDown className="h-4 w-4" />
              Telecharger l'ordre de mission
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="destructive"
              onClick={handleQuickIncident}
            >
              <AlertTriangle className="h-4 w-4" />
              Signaler un retard ou incident
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Vue calendrier</CardTitle>
            <p className="text-muted-foreground text-sm">
              Jours travailles, jours off, trajets termines ou a venir
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="monthly">Mois</TabsTrigger>
              <TabsTrigger value="weekly">Semaine</TabsTrigger>
              <TabsTrigger value="daily">Jour</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Tabs value={view}>
            <TabsContent value="monthly" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <LegendItem className={dayColors.upcoming} label="A venir" />
                <LegendItem className={dayColors.done} label="Termine" />
                <LegendItem className={dayColors.worked} label="Travaille" />
                <LegendItem className={dayColors.off} label="Off" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {calendarDays.map((day) => (
                  <button
                    key={day.date}
                    className={`rounded-lg border px-3 py-3 text-left transition hover:border-primary ${
                      selectedDate === day.date ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <div
                      className={`rounded-md border px-3 py-2 ${dayColors[day.status]} text-sm font-semibold`}
                    >
                      {day.label}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{day.note}</p>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {calendarDays.slice(0, 7).map((day) => (
                  <div
                    key={day.date}
                    className={`rounded-lg border bg-muted/30 p-3 ${selectedDate === day.date ? "border-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{day.label}</span>
                      <Badge variant="outline">{dayStatusLabel[day.status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{day.note}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setSelectedDate(day.date)}
                    >
                      Voir la journee
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Jour selectionne</p>
                  <p className="text-lg font-semibold">{selectedDayInfo ? selectedDayInfo.label : formatDate(selectedDate)}</p>
                </div>
              </div>
              <Separator />
              {selectedTrips.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun trajet ce jour.</p>
              ) : (
                <div className="space-y-3">
                  {selectedTrips.map((trip) => (
                    <div key={trip.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>
                            {trip.start} - {trip.end}
                          </span>
                        </div>
                        <Badge variant="secondary">{trip.mission}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {trip.from} vers {trip.to}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmTrip(trip.id)}
                          disabled={trip.status === "termine" || updateTrip.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refuseTrip(trip.id)}
                          disabled={trip.status === "termine" || updateTrip.isPending}
                        >
                          <CalendarX2 className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuickIncident}
                        >
                          <TimerReset className="h-4 w-4 mr-1" />
                          Signaler un retard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownload}
                        >
                          <FileDown className="h-4 w-4 mr-1" />
                          Ordre de mission
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPassengerDetails(trip)}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Passagers
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evenements importants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {importantEvents.map((event) => (
              <div key={event.title} className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="mt-0.5">
                  {event.type === "maintenance" && <CalendarCheck className="h-4 w-4 text-primary" />}
                  {event.type === "formation" && <User className="h-4 w-4 text-primary" />}
                  {event.type === "conge" && <CalendarX2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.detail}</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rappels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReminderItem
              icon={<CalendarCheck className="h-4 w-4 text-primary" />}
              title="Valider les trajets du jour"
              content="Confirmez ou signalez vos disponibilites."
            />
            <ReminderItem
              icon={<FileDown className="h-4 w-4 text-primary" />}
              title="Telecharger les ordres de mission"
              content="A conserver dans le vehicule et sur mobile."
            />
            <ReminderItem
              icon={<Navigation className="h-4 w-4 text-primary" />}
              title="Points de prise en charge"
              content="Verifier les adresses et le trafic 30 min avant."
            />
          </CardContent>
        </Card>
      </div>

      <Drawer open={passengerDrawerOpen} onOpenChange={setPassengerDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Details passagers</DrawerTitle>
            <DrawerDescription>
              {tripForPassengers
                ? `${tripForPassengers.from} -> ${tripForPassengers.to} | ${tripForPassengers.start} - ${tripForPassengers.end}`
                : "Selectionnez un trajet pour voir les passagers"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <Badge variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                {passengerReservations.length} reservation(s)
              </Badge>
              <Badge variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                {reservedSeats} place(s) occupees
              </Badge>
              <Badge variant="outline" className="gap-2">
                <CalendarCheck className="h-4 w-4" />
                {typeof totalSeats === "number" ? `${totalSeats} places totales (estim.)` : "Capacite inconnue"}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {passengerItems.map((passenger, index) => (
                <div key={`${passenger.name}-${index}`} className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="h-4 w-4 text-primary" />
                      <span>{passenger.name}</span>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {passenger.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Siege / places : {passenger.seat}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PhoneCall className="h-4 w-4" />
                    <span>{passenger.phone}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{passenger.note}</p>
                </div>
              ))}
            </div>
          </div>
          <DrawerFooter className="pt-0">
            <div className="text-xs text-muted-foreground">
              Les donnees dynamiques proviennent des reservations du trajet. En absence de donnees, une fiche exemple est affichee.
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-3 w-3 rounded-sm border ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function ReminderItem({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  return (
    <div className="flex gap-3 rounded-md border bg-muted/30 p-3">
      <div className="mt-0.5">{icon}</div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{content}</p>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
