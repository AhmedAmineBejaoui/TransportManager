import { useMemo, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useChauffeurTrips, useUpdateTrip } from "@/hooks/useTrips";
import { useCreateIncident } from "@/hooks/useChauffeurInsights";
import type { Trip } from "@shared/schema";
import { normalizeTripStatus } from "@/lib/formatters";
import { format } from "date-fns";
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

  return {
    id: trip.id,
    date: toISODate(departDate),
    start: format(departDate, "HH:mm"),
    end: format(arriveeDate, "HH:mm"),
    from: trip.point_depart,
    to: trip.point_arrivee,
    mission: "Trajet planifie",
    status,
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

export default function ChauffeurCalendar() {
  const { data: trips = [], isLoading } = useChauffeurTrips();
  const updateTrip = useUpdateTrip();
  const createIncident = useCreateIncident();
  const { toast } = useToast();
  const [view, setView] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));

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

  const updateTripStatus = (tripId: string, statut: "en_cours" | "termine") => {
    updateTrip.mutate(
      { id: tripId, data: { statut } },
      {
        onSuccess: () => {
          toast({
            title: statut === "en_cours" ? "Trajet confirme" : "Trajet mis a jour",
            description: "Le dispatch est informe.",
          });
        },
        onError: (error: any) =>
          toast({
            title: "Erreur",
            description: error?.message || "Impossible de mettre a jour le trajet",
            variant: "destructive",
          }),
      }
    );
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
    toast({
      title: "Ordre de mission",
      description: "Telechargement en cours...",
    });
  };

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
                              <Button size="sm" variant="outline" onClick={() => setSelectedDate(trip.date)}>
                                Voir jour
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateTripStatus(trip.id, "en_cours")}
                                disabled={trip.status === "termine" || updateTrip.isPending}
                              >
                                Confirmer
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
              onClick={() => handleAction("Details client", "Ouverture de la fiche passager")}
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
                          onClick={() => updateTripStatus(trip.id, "en_cours")}
                          disabled={trip.status === "termine" || updateTrip.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirmer
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
                          onClick={() => handleAction("Ordre de mission", "Ouverture du PDF")}
                        >
                          <FileDown className="h-4 w-4 mr-1" />
                          Ordre de mission
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
