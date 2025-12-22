import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Battery,
  Bus,
  CheckCircle2,
  ClipboardList,
  FileText,
  Fuel,
  Gauge,
  ShieldCheck,
  TimerReset,
  Wrench,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useChauffeurVehicleData,
  useCreateVehicleIncident,
  useCreateVehicleChecklist,
  useUpdateVehicleLevels,
} from "@/hooks/useChauffeurVehicle";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Items de checklist par défaut
const defaultChecklistItems = {
  before: [
    { id: "pression_pneus", label: "Pression pneus vérifiée" },
    { id: "feux_clignotants", label: "Feux et clignotants" },
    { id: "freins", label: "Freins testés" },
    { id: "documents", label: "Documents à bord" },
    { id: "nettoyage", label: "Nettoyage rapide habitacle" },
    { id: "niveau_huile", label: "Niveau huile moteur" },
    { id: "liquide_refroid", label: "Liquide de refroidissement" },
  ],
  after: [
    { id: "incident", label: "Aucun incident constaté" },
    { id: "plein", label: "Plein partiel ou recharge" },
    { id: "carrosserie", label: "État carrosserie (rayures)" },
    { id: "objets_oublies", label: "Objets oubliés vérifiés" },
    { id: "kilometrage", label: "Kilométrage noté pour rapport" },
    { id: "proprete", label: "Propreté intérieure" },
  ],
};

export default function ChauffeurVehicle() {
  const { toast } = useToast();
  
  // Hooks pour les données véhicule
  const {
    vehicle,
    details,
    maintenances,
    documents,
    incidents,
    checklists,
    isLoading,
  } = useChauffeurVehicleData();
  
  const createIncident = useCreateVehicleIncident();
  const createChecklist = useCreateVehicleChecklist();
  const updateLevels = useUpdateVehicleLevels();
  
  // États pour les formulaires
  const [incidentType, setIncidentType] = useState("panne");
  const [incidentText, setIncidentText] = useState("");
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistType, setChecklistType] = useState<"avant_depart" | "apres_mission">("avant_depart");
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [checklistComments, setChecklistComments] = useState("");
  const [updateLevelsDialogOpen, setUpdateLevelsDialogOpen] = useState(false);
  const [newFuelLevel, setNewFuelLevel] = useState(0);
  const [newBatteryLevel, setNewBatteryLevel] = useState(0);

  // Données calculées
  const vehicleInfo = useMemo(() => {
    if (!vehicle) return null;
    return {
      marque: vehicle.marque || "Non spécifié",
      modele: vehicle.modele || "",
      plaque: vehicle.immatriculation || "Non spécifié",
      kilometrage: details?.kilometrage ? `${details.kilometrage.toLocaleString()} km` : "N/A",
      carburant: details?.type_carburant || "Non spécifié",
      miseEnService: details?.date_mise_service ? format(new Date(details.date_mise_service), "dd/MM/yyyy") : "N/A",
      capacite: `${vehicle.capacite || "?"} places`,
      charge: details?.charge_utile ? `${details.charge_utile} T` : "N/A",
    };
  }, [vehicle, details]);

  const equipments = useMemo(() => {
    if (!details?.equipements) return [];
    try {
      return JSON.parse(details.equipements);
    } catch {
      return details.equipements.split(",").map((e: string) => e.trim());
    }
  }, [details]);

  const fuelLevel = details?.niveau_carburant ?? 0;
  const batteryLevel = details?.niveau_batterie ?? 100;

  // Maintenances à venir et historique
  const upcomingMaintenances = useMemo(() => {
    return maintenances
      .filter((m) => m.statut === "planifie" || m.statut === "en_cours")
      .slice(0, 3);
  }, [maintenances]);

  const maintenanceHistory = useMemo(() => {
    return maintenances.filter((m) => m.statut === "termine").slice(0, 5);
  }, [maintenances]);

  // Documents avec statut
  const documentsWithStatus = useMemo(() => {
    return documents.map((doc) => {
      const expDate = doc.date_expiration ? new Date(doc.date_expiration) : null;
      const now = new Date();
      const daysUntilExpiry = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      let status = "valide";
      if (daysUntilExpiry !== null) {
        if (daysUntilExpiry < 0) status = "expire";
        else if (daysUntilExpiry < 30) status = "a renouveler";
      }
      
      return { ...doc, status, daysUntilExpiry };
    });
  }, [documents]);

  // Dernière checklist pour chaque type
  const lastChecklistBefore = useMemo(() => {
    return checklists.find((c) => c.type === "avant_depart");
  }, [checklists]);

  const lastChecklistAfter = useMemo(() => {
    return checklists.find((c) => c.type === "apres_mission");
  }, [checklists]);

  // Handlers
  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentText.trim()) {
      return toast({ title: "Ajoutez un détail", variant: "destructive" });
    }
    if (!vehicle?.id) {
      return toast({ title: "Aucun véhicule assigné", variant: "destructive" });
    }

    createIncident.mutate({
      vehicule_id: vehicle.id,
      type: incidentType,
      description: incidentText,
      date_incident: new Date(),
    }, {
      onSuccess: () => {
        toast({ title: "Incident transmis", description: "L'équipe maintenance a été notifiée." });
        setIncidentText("");
        setIncidentDialogOpen(false);
      },
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

  const handleChecklistSubmit = () => {
    if (!vehicle?.id) {
      return toast({ title: "Aucun véhicule assigné", variant: "destructive" });
    }

    const items = Object.entries(checklistItems).map(([id, checked]) => ({
      id,
      checked,
      label: [...defaultChecklistItems.before, ...defaultChecklistItems.after].find((i) => i.id === id)?.label || id,
    }));

    createChecklist.mutate({
      vehicule_id: vehicle.id,
      type: checklistType,
      items: JSON.stringify(items),
      commentaires: checklistComments,
      date_checklist: new Date(),
    }, {
      onSuccess: () => {
        toast({ title: "Checklist enregistrée", description: "Merci pour votre vigilance." });
        setChecklistDialogOpen(false);
        setChecklistItems({});
        setChecklistComments("");
      },
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

  const handleUpdateLevels = () => {
    if (!vehicle?.id) {
      return toast({ title: "Aucun véhicule assigné", variant: "destructive" });
    }

    updateLevels.mutate({
      vehicleId: vehicle.id,
      niveau_carburant: newFuelLevel,
      niveau_batterie: newBatteryLevel,
    }, {
      onSuccess: () => {
        toast({ title: "Niveaux mis à jour", description: "Les informations ont été enregistrées." });
        setUpdateLevelsDialogOpen(false);
      },
      onError: (error: any) => toast({ title: "Erreur", description: error?.message, variant: "destructive" }),
    });
  };

  const openChecklistDialog = (type: "avant_depart" | "apres_mission") => {
    setChecklistType(type);
    setChecklistItems({});
    setChecklistComments("");
    setChecklistDialogOpen(true);
  };

  const openUpdateLevelsDialog = () => {
    setNewFuelLevel(fuelLevel);
    setNewBatteryLevel(batteryLevel);
    setUpdateLevelsDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Pas de véhicule assigné
  if (!vehicle) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Véhicule</h1>
          <p className="text-muted-foreground mt-1">Aucun véhicule assigné</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Bus className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun véhicule assigné</h3>
            <p className="text-muted-foreground">
              Contactez votre responsable pour vous faire assigner un véhicule.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Véhicule</h1>
          <p className="text-muted-foreground mt-1">Infos, checklists, entretiens et documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Bus className="h-4 w-4" />
            {vehicleInfo?.plaque}
          </Badge>
          <Badge className="gap-1" variant={vehicle.statut === "disponible" ? "default" : "secondary"}>
            <ShieldCheck className="h-4 w-4" />
            {vehicle.statut === "disponible" ? "Prêt à partir" : vehicle.statut}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Kilométrage" value={vehicleInfo?.kilometrage || "N/A"} icon={Gauge} />
        <StatCard title="Carburant" value={vehicleInfo?.carburant || "N/A"} icon={Fuel} />
        <StatCard title="Capacité" value={vehicleInfo?.capacite || "N/A"} icon={Bus} />
        <StatCard 
          title="Dernier entretien" 
          value={maintenanceHistory[0] ? format(new Date(maintenanceHistory[0].date_realisee || maintenanceHistory[0].date_prevue), "dd MMM yyyy", { locale: fr }) : "N/A"} 
          icon={Wrench} 
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Marque / Modèle" value={`${vehicleInfo?.marque} ${vehicleInfo?.modele}`} />
            <InfoRow label="Matricule" value={vehicleInfo?.plaque || "N/A"} />
            <InfoRow label="Kilométrage" value={vehicleInfo?.kilometrage || "N/A"} />
            <InfoRow label="Carburant" value={vehicleInfo?.carburant || "N/A"} />
            <InfoRow label="Mise en service" value={vehicleInfo?.miseEnService || "N/A"} />
            <InfoRow label="Charge utile" value={vehicleInfo?.charge || "N/A"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Niveau carburant / batterie</CardTitle>
            <Button size="sm" variant="ghost" onClick={openUpdateLevelsDialog}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" />
                  {vehicleInfo?.carburant || "Carburant"}
                </span>
                <span className={fuelLevel < 20 ? "text-red-500 font-semibold" : ""}>{fuelLevel}%</span>
              </div>
              <Progress value={fuelLevel} className={fuelLevel < 20 ? "bg-red-100" : ""} />
              {fuelLevel < 20 && (
                <p className="text-xs text-red-500">⚠️ Niveau bas - Faire le plein</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-primary" />
                  Batterie auxiliaire
                </span>
                <span>{batteryLevel}%</span>
              </div>
              <Progress value={batteryLevel} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="w-fit gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Préchauffage OK
              </Badge>
              {incidents.filter(i => i.statut === "ouvert").length === 0 ? (
                <Badge variant="outline" className="w-fit gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Pas d'alertes tableau de bord
                </Badge>
              ) : (
                <Badge variant="destructive" className="w-fit gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {incidents.filter(i => i.statut === "ouvert").length} incident(s) ouvert(s)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>État du véhicule</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openChecklistDialog("avant_depart")}>
                <Plus className="h-4 w-4 mr-1" />
                Checklist départ
              </Button>
              <Button size="sm" variant="outline" onClick={() => openChecklistDialog("apres_mission")}>
                <Plus className="h-4 w-4 mr-1" />
                Checklist retour
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ChecklistDisplay 
                title="Avant le départ" 
                checklist={lastChecklistBefore}
                defaultItems={defaultChecklistItems.before}
              />
              <ChecklistDisplay 
                title="Après mission" 
                checklist={lastChecklistAfter}
                defaultItems={defaultChecklistItems.after}
              />
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Niveau essuie-glace OK</Badge>
              <Badge variant="secondary">Extincteur contrôlé</Badge>
              <Badge variant="secondary">Kit secours présent</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Déclaration d'incident</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleIncidentSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full rounded-md border bg-transparent p-2 text-sm"
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                >
                  <option value="panne">Panne</option>
                  <option value="accident">Accident</option>
                  <option value="rayure">Rayure / carrosserie</option>
                  <option value="vol">Vol / effraction</option>
                  <option value="retard">Retard départ</option>
                  <option value="incident_passager">Incident passager</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Détails</label>
                <Textarea
                  placeholder="Décrivez le problème rencontré..."
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={createIncident.isPending}>
                  {createIncident.isPending ? "Envoi..." : "Envoyer au support"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toast({ title: "Rappel planifié", description: "Suivi dans 30 minutes." })}
                >
                  <TimerReset className="h-4 w-4" />
                </Button>
              </div>
            </form>
            
            {/* Incidents récents */}
            {incidents.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Incidents récents</p>
                <div className="space-y-2">
                  {incidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="text-sm p-2 rounded bg-muted/40">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{incident.type}</span>
                        <Badge variant={incident.statut === "ouvert" ? "destructive" : "secondary"} className="text-xs">
                          {incident.statut}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{incident.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Entretien</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Prochains entretiens</p>
              {upcomingMaintenances.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun entretien planifié</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMaintenances.map((item) => (
                    <MaintenanceItem
                      key={item.id}
                      title={item.type_maintenance}
                      date={format(new Date(item.date_prevue), "dd MMM yyyy", { locale: fr })}
                      detail={item.description || item.garage || ""}
                      priority={item.priorite}
                    />
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-sm font-semibold mb-2">Historique</p>
              {maintenanceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
              ) : (
                <div className="space-y-2">
                  {maintenanceHistory.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-md border bg-muted/40 p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-semibold">{item.type_maintenance}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.date_realisee || item.date_prevue), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documents du véhicule</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {documentsWithStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document disponible</p>
            ) : (
              documentsWithStatus.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div>
                    <p className="font-semibold">{doc.type_document}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.date_expiration 
                        ? `Expiration : ${format(new Date(doc.date_expiration), "dd/MM/yyyy")}`
                        : "Sans expiration"
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      doc.status === "valide" ? "secondary" : 
                      doc.status === "a renouveler" ? "outline" : 
                      "destructive"
                    }>
                      {doc.status === "valide" ? "Valide" : 
                       doc.status === "a renouveler" ? "À renouveler" : 
                       "Expiré"}
                    </Badge>
                    {doc.fichier_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(doc.fichier_url!, '_blank');
                          toast({ title: doc.type_document, description: "Document ouvert." });
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Options et équipements</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {equipments.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {equipments.map((item: string, index: number) => (
                <Badge key={index} variant="outline" className="justify-start">
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun équipement spécifié</p>
          )}
          <Separator />
          <div className="grid gap-3 md:grid-cols-3">
            <InfoRow label="Capacité assises" value={vehicle.capacite?.toString() || "N/A"} />
            <InfoRow label="Charge utile" value={vehicleInfo?.charge || "N/A"} />
            <InfoRow label="Kit hiver" value={equipments.includes("Kit hiver") ? "Présent" : "Non spécifié"} />
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Checklist */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {checklistType === "avant_depart" ? "Checklist avant départ" : "Checklist après mission"}
            </DialogTitle>
            <DialogDescription>
              Cochez les éléments vérifiés. Cette checklist sera enregistrée.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-3">
              {(checklistType === "avant_depart" ? defaultChecklistItems.before : defaultChecklistItems.after).map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={checklistItems[item.id] || false}
                    onCheckedChange={(checked) => 
                      setChecklistItems({ ...checklistItems, [item.id]: checked as boolean })
                    }
                  />
                  <label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checklist-comments">Commentaires (optionnel)</Label>
              <Textarea
                id="checklist-comments"
                placeholder="Remarques ou observations..."
                value={checklistComments}
                onChange={(e) => setChecklistComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChecklistSubmit} disabled={createChecklist.isPending}>
              {createChecklist.isPending ? "Envoi..." : "Valider la checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Mise à jour niveaux */}
      <Dialog open={updateLevelsDialogOpen} onOpenChange={setUpdateLevelsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mettre à jour les niveaux</DialogTitle>
            <DialogDescription>
              Indiquez les niveaux actuels de carburant et batterie.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-level">Niveau de carburant (%)</Label>
              <Input
                id="fuel-level"
                type="number"
                min="0"
                max="100"
                value={newFuelLevel}
                onChange={(e) => setNewFuelLevel(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="battery-level">Niveau batterie (%)</Label>
              <Input
                id="battery-level"
                type="number"
                min="0"
                max="100"
                value={newBatteryLevel}
                onChange={(e) => setNewBatteryLevel(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateLevelsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateLevels} disabled={updateLevels.isPending}>
              {updateLevels.isPending ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

type ChecklistItem = {
  id: string;
  label: string;
  checked?: boolean;
};

type VehicleChecklist = {
  id: string;
  type: string;
  items: string;
  commentaires?: string | null;
  date_checklist: Date | string;
};

function ChecklistDisplay({ 
  title, 
  checklist, 
  defaultItems 
}: { 
  title: string; 
  checklist?: VehicleChecklist | null;
  defaultItems: { id: string; label: string }[];
}) {
  // Parse checklist items if available
  let items: ChecklistItem[] = defaultItems.map(item => ({ ...item, checked: false }));
  
  if (checklist?.items) {
    try {
      const parsedItems = JSON.parse(checklist.items);
      items = defaultItems.map(defaultItem => {
        const savedItem = parsedItems.find((p: any) => p.id === defaultItem.id);
        return {
          ...defaultItem,
          checked: savedItem?.checked ?? false,
        };
      });
    } catch {
      // Keep default items
    }
  }

  const allChecked = items.every(item => item.checked);
  const someChecked = items.some(item => item.checked);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold">{title}</p>
        <Badge 
          variant={allChecked ? "default" : someChecked ? "secondary" : "outline"} 
          className="gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          {allChecked ? "Complet" : someChecked ? "Partiel" : "À faire"}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                item.checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
            <span className={item.checked ? "" : "text-muted-foreground"}>{item.label}</span>
          </div>
        ))}
      </div>
      {checklist && (
        <p className="text-xs text-muted-foreground mt-2">
          Dernière mise à jour: {format(new Date(checklist.date_checklist), "dd/MM HH:mm", { locale: fr })}
        </p>
      )}
    </div>
  );
}

function MaintenanceItem({ title, date, detail, priority }: { title: string; date: string; detail: string; priority?: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
      <Wrench className="h-4 w-4 text-primary mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold capitalize">{title.replace(/_/g, " ")}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{date}</p>
          {priority && (
            <Badge 
              variant={priority === "haute" || priority === "urgente" ? "destructive" : "outline"} 
              className="text-xs"
            >
              Priorité {priority}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
