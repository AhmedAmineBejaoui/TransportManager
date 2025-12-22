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
  Plus,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Coffee,
} from "lucide-react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useChauffeurTrips, useUpdateTrip } from "@/hooks/useTrips";
import { useCreateIncident } from "@/hooks/useChauffeurInsights";
import {
  useChauffeurCalendarData,
  useCreateChauffeurEvent,
  useCreateChauffeurLeave,
  useCreateChauffeurUnavailability,
  useCancelChauffeurLeave,
} from "@/hooks/useChauffeurCalendar";
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

// Types pour les événements dynamiques
type EventDisplay = {
  id: string;
  title: string;
  date: string;
  detail: string;
  type: "maintenance" | "formation" | "reunion" | "conge" | "rdv_medical" | "autre";
  statut?: string;
};

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

  // Dialogs state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [unavailabilityDialogOpen, setUnavailabilityDialogOpen] = useState(false);

  // New event/leave form state
  const [newEvent, setNewEvent] = useState({
    type: "reunion" as string,
    titre: "",
    description: "",
    date_debut: "",
    date_fin: "",
    lieu: "",
  });
  const [newLeave, setNewLeave] = useState({
    type: "conge_paye" as string,
    date_debut: "",
    date_fin: "",
    motif: "",
  });
  const [newUnavailability, setNewUnavailability] = useState({
    date_debut: "",
    date_fin: "",
    motif: "",
  });

  // Hooks pour les données du calendrier
  const { events, leaves, unavailabilities, isLoading: isLoadingCalendarData } = useChauffeurCalendarData();
  const createEvent = useCreateChauffeurEvent();
  const createLeave = useCreateChauffeurLeave();
  const createUnavailability = useCreateChauffeurUnavailability();
  const cancelLeave = useCancelChauffeurLeave();

  // Construire les événements importants dynamiques
  const importantEvents = useMemo<EventDisplay[]>(() => {
    const result: EventDisplay[] = [];

    // Ajouter les événements
    events.forEach((event) => {
      result.push({
        id: event.id,
        title: event.titre,
        date: event.date_debut ? format(new Date(event.date_debut), "dd MMM - HH:mm", { locale: fr }) : "",
        detail: event.description || event.lieu || "",
        type: event.type as EventDisplay["type"],
        statut: event.statut ?? undefined,
      });
    });

    // Ajouter les congés
    leaves.forEach((leave) => {
      result.push({
        id: leave.id,
        title: leave.type === "conge_paye" ? "Congé payé" : leave.type === "maladie" ? "Arrêt maladie" : "Congé",
        date: leave.date_debut ? `${format(new Date(leave.date_debut), "dd MMM")} - ${format(new Date(leave.date_fin), "dd MMM")}` : "",
        detail: leave.motif || `Statut: ${leave.statut}`,
        type: "conge",
        statut: leave.statut ?? undefined,
      });
    });

    return result.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    }).slice(0, 10);
  }, [events, leaves]);

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
      leavePending: leaves.filter((l) => l.statut === "en_attente").length,
      events: events.length,
    };
  }, [tripPlanning, calendarDays, leaves, events]);

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

  // Handlers pour créer des événements/congés
  const handleCreateEvent = () => {
    if (!newEvent.titre || !newEvent.date_debut) {
      toast({ title: "Erreur", description: "Titre et date sont requis", variant: "destructive" });
      return;
    }
    createEvent.mutate({
      type: newEvent.type,
      titre: newEvent.titre,
      description: newEvent.description,
      date_debut: new Date(newEvent.date_debut),
      date_fin: newEvent.date_fin ? new Date(newEvent.date_fin) : null,
      lieu: newEvent.lieu,
    }, {
      onSuccess: () => {
        toast({ title: "Événement créé", description: "L'événement a été ajouté au calendrier" });
        setEventDialogOpen(false);
        setNewEvent({ type: "reunion", titre: "", description: "", date_debut: "", date_fin: "", lieu: "" });
      },
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

  const handleCreateLeave = () => {
    if (!newLeave.date_debut || !newLeave.date_fin) {
      toast({ title: "Erreur", description: "Les dates sont requises", variant: "destructive" });
      return;
    }
    createLeave.mutate({
      type: newLeave.type,
      date_debut: new Date(newLeave.date_debut),
      date_fin: new Date(newLeave.date_fin),
      motif: newLeave.motif,
    }, {
      onSuccess: () => {
        toast({ title: "Demande envoyée", description: "Votre demande de congé est en attente de validation" });
        setLeaveDialogOpen(false);
        setNewLeave({ type: "conge_paye", date_debut: "", date_fin: "", motif: "" });
      },
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

  const handleCreateUnavailability = () => {
    if (!newUnavailability.date_debut || !newUnavailability.date_fin) {
      toast({ title: "Erreur", description: "Les dates sont requises", variant: "destructive" });
      return;
    }
    createUnavailability.mutate({
      date_debut: new Date(newUnavailability.date_debut),
      date_fin: new Date(newUnavailability.date_fin),
      motif: newUnavailability.motif,
    }, {
      onSuccess: () => {
        toast({ title: "Indisponibilité signalée", description: "Le dispatch a été informé" });
        setUnavailabilityDialogOpen(false);
        setNewUnavailability({ date_debut: "", date_fin: "", motif: "" });
      },
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

  const handleCancelLeave = (leaveId: string) => {
    cancelLeave.mutate(leaveId, {
      onSuccess: () => toast({ title: "Congé annulé", description: "Votre demande de congé a été annulée" }),
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

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
              onClick={() => setUnavailabilityDialogOpen(true)}
            >
              <CalendarX2 className="h-4 w-4" />
              Signaler une indisponibilite
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <Coffee className="h-4 w-4" />
              Demander un conge
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => setEventDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Ajouter un evenement
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Événements importants</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEventDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingCalendarData ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : importantEvents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun événement à venir</p>
                <p className="text-sm">Cliquez sur "Ajouter" pour créer un événement</p>
              </div>
            ) : (
              importantEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="mt-0.5">
                    {event.type === "maintenance" && <CalendarCheck className="h-5 w-5 text-orange-500" />}
                    {event.type === "formation" && <GraduationCap className="h-5 w-5 text-blue-500" />}
                    {event.type === "reunion" && <Briefcase className="h-5 w-5 text-purple-500" />}
                    {event.type === "rdv_medical" && <Stethoscope className="h-5 w-5 text-red-500" />}
                    {event.type === "conge" && <CalendarX2 className="h-5 w-5 text-emerald-500" />}
                    {event.type === "autre" && <Coffee className="h-5 w-5 text-gray-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{event.title}</p>
                      {event.statut && (
                        <Badge variant={
                          event.statut === "approuve" ? "default" :
                          event.statut === "en_attente" ? "secondary" :
                          event.statut === "refuse" ? "destructive" : "outline"
                        } className="text-xs">
                          {event.statut === "approuve" ? "Approuvé" :
                           event.statut === "en_attente" ? "En attente" :
                           event.statut === "refuse" ? "Refusé" :
                           event.statut === "annule" ? "Annulé" : event.statut}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{event.detail}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rappels & congés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Congés en attente */}
            {leaves.filter(l => l.statut === "en_attente").length > 0 && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-3 space-y-2">
                <p className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Congés en attente ({leaves.filter(l => l.statut === "en_attente").length})
                </p>
                {leaves.filter(l => l.statut === "en_attente").slice(0, 2).map(leave => (
                  <div key={leave.id} className="flex items-center justify-between text-sm">
                    <span>
                      {format(new Date(leave.date_debut), "dd/MM")} - {format(new Date(leave.date_fin), "dd/MM")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-destructive"
                      onClick={() => handleCancelLeave(leave.id)}
                    >
                      Annuler
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <ReminderItem
              icon={<CalendarCheck className="h-4 w-4 text-primary" />}
              title="Valider les trajets du jour"
              content="Confirmez ou signalez vos disponibilités."
            />
            <ReminderItem
              icon={<FileDown className="h-4 w-4 text-primary" />}
              title="Télécharger les ordres de mission"
              content="À conserver dans le véhicule et sur mobile."
            />
            <ReminderItem
              icon={<Navigation className="h-4 w-4 text-primary" />}
              title="Points de prise en charge"
              content="Vérifier les adresses et le trafic 30 min avant."
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

      {/* Dialog: Créer un événement */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
            <DialogDescription>
              Ajoutez un événement personnel à votre calendrier (réunion, formation, RDV médical, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event-type">Type d'événement</Label>
              <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}>
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reunion">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span>Réunion</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="formation">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Formation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rdv_medical">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      <span>RDV médical</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4" />
                      <span>Maintenance véhicule</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="autre">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      <span>Autre</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-title">Titre *</Label>
              <Input
                id="event-title"
                placeholder="Ex: Réunion équipe transport"
                value={newEvent.titre}
                onChange={(e) => setNewEvent({ ...newEvent, titre: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-desc">Description</Label>
              <Textarea
                id="event-desc"
                placeholder="Détails de l'événement..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="event-start">Date/heure début *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={newEvent.date_debut}
                  onChange={(e) => setNewEvent({ ...newEvent, date_debut: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-end">Date/heure fin</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={newEvent.date_fin}
                  onChange={(e) => setNewEvent({ ...newEvent, date_fin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-location">Lieu</Label>
              <Input
                id="event-location"
                placeholder="Ex: Bureau principal, Garage, etc."
                value={newEvent.lieu}
                onChange={(e) => setNewEvent({ ...newEvent, lieu: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateEvent} disabled={createEvent.isPending}>
              {createEvent.isPending ? "Création..." : "Créer l'événement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Demander un congé */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de congé</DialogTitle>
            <DialogDescription>
              Soumettez une demande de congé. Elle sera validée par l'administrateur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leave-type">Type de congé</Label>
              <Select value={newLeave.type} onValueChange={(v) => setNewLeave({ ...newLeave, type: v })}>
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conge_paye">Congé payé</SelectItem>
                  <SelectItem value="conge_sans_solde">Congé sans solde</SelectItem>
                  <SelectItem value="maladie">Arrêt maladie</SelectItem>
                  <SelectItem value="exceptionnel">Congé exceptionnel</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leave-start">Date de début *</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={newLeave.date_debut}
                  onChange={(e) => setNewLeave({ ...newLeave, date_debut: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leave-end">Date de fin *</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={newLeave.date_fin}
                  onChange={(e) => setNewLeave({ ...newLeave, date_fin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leave-reason">Motif</Label>
              <Textarea
                id="leave-reason"
                placeholder="Raison de votre demande..."
                value={newLeave.motif}
                onChange={(e) => setNewLeave({ ...newLeave, motif: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateLeave} disabled={createLeave.isPending}>
              {createLeave.isPending ? "Envoi..." : "Soumettre la demande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Signaler une indisponibilité */}
      <Dialog open={unavailabilityDialogOpen} onOpenChange={setUnavailabilityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler une indisponibilité</DialogTitle>
            <DialogDescription>
              Indiquez une période où vous ne serez pas disponible pour des missions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unavail-start">Date/heure début *</Label>
                <Input
                  id="unavail-start"
                  type="datetime-local"
                  value={newUnavailability.date_debut}
                  onChange={(e) => setNewUnavailability({ ...newUnavailability, date_debut: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unavail-end">Date/heure fin *</Label>
                <Input
                  id="unavail-end"
                  type="datetime-local"
                  value={newUnavailability.date_fin}
                  onChange={(e) => setNewUnavailability({ ...newUnavailability, date_fin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unavail-reason">Motif</Label>
              <Textarea
                id="unavail-reason"
                placeholder="Raison de l'indisponibilité (optionnel)..."
                value={newUnavailability.motif}
                onChange={(e) => setNewUnavailability({ ...newUnavailability, motif: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnavailabilityDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateUnavailability} disabled={createUnavailability.isPending}>
              {createUnavailability.isPending ? "Envoi..." : "Signaler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
