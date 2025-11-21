import { storage, type TripLoadFactor } from "./storage";
import type { Vehicle, Incident, Trip, OptimizationRule } from "@shared/schema";
import { average } from "./utils/math";
import { capitalize } from "./utils/string";

type ReservationTrend = { day: string; reservations: number; revenue: number };

export type DemandForecastEntry = {
  date: string;
  demand: number;
  confidence: number;
  drivers: { weather: number; events: number; search: number; seasonality: number };
};

export type PricingInsight = {
  route: string;
  action: "augmenter" | "baisser" | "stabiliser";
  delta: number;
  occupancy: number;
  recommendedPrice: number;
  rationale: string;
  confidence: number;
};

export type MaintenanceInsight = {
  fleetRiskIndex: number;
  vehicles: Array<{
    vehicleId: string;
    immatriculation: string;
    statut: string | null;
    incidents: number;
    riskScore: number;
    risk: string;
    avgOccupancy: number;
    nextCheck: string;
    recommendation: string;
  }>;
};

export type ImpactSimulation = {
  id: string;
  title: string;
  expectedGain: string;
  cost: string;
  confidence: number;
  summary: string;
};

export type PredictiveDashboardSnapshot = {
  stressIndex: number;
  alerts: Array<{ id: string; severity: "low" | "medium" | "high"; message: string }>;
  opportunityWindows: Array<{ route: string; window: string; action: string; gainPotential: string }>;
};

export type OptimizationReport = {
  generatedAt: string;
  horizonDays: number;
  demandForecast: DemandForecastEntry[];
  pricingInsights: PricingInsight[];
  maintenance: MaintenanceInsight;
  impactSimulations: ImpactSimulation[];
  predictiveDashboard: PredictiveDashboardSnapshot;
};

type ComputeContext = {
  loadFactors: TripLoadFactor[];
  maintenance: MaintenanceInsight;
  demandForecast: DemandForecastEntry[];
  snapshot: Awaited<ReturnType<typeof storage.getDashboardSnapshot>>;
};

export type OperationalRecommendationSuggestion = {
  routeFrom: string;
  routeTo: string;
  recommendedStart: Date;
  narrative: string;
  reason: string;
  confidence: number;
  priority: number;
  recommendedBusId?: string | null;
  recommendedChauffeurId?: string | null;
  metadata?: Record<string, unknown>;
};

let latestReport: OptimizationReport | null = null;
let schedulerHandle: NodeJS.Timeout | null = null;

const DEFAULT_SCHEDULER_INTERVAL = 60 * 60 * 1000; // 1 hour

export async function computePredictiveAnalytics(options?: {
  horizonDays?: number;
  onCompute?: (ctx: ComputeContext) => Promise<void>;
}): Promise<OptimizationReport> {
  const horizonDays = options?.horizonDays ?? 7;
  const {
    trends,
    loadFactors,
    vehicles,
    incidents,
    searchStats,
    snapshot,
  } = await assembleOptimizationContext(horizonDays);

  const incidentTripIds = incidents.map((incident) => incident.trip_id).filter(Boolean) as string[];
  const incidentTrips = incidentTripIds.length
    ? await storage.getTripsByIds(Array.from(new Set(incidentTripIds)))
    : [];
  const incidentTripMap = new Map(incidentTrips.map((trip) => [trip.id, trip]));

  const demandForecast = buildDemandForecast(trends, horizonDays, searchStats);
  const pricingInsights = buildPricingInsights(loadFactors);
  const maintenance = buildMaintenanceOutlook({
    vehicles,
    incidents,
    incidentTrips: incidentTripMap,
    loadFactors,
  });
  const impactSimulations = buildImpactSimulations({
    pricingInsights,
    maintenance,
    demandForecast,
  });
  const predictiveDashboard = buildPredictiveOverview({
    snapshot,
    demandForecast,
    pricingInsights,
    maintenance,
  });

  const report: OptimizationReport = {
    generatedAt: new Date().toISOString(),
    horizonDays,
    demandForecast,
    pricingInsights,
    maintenance,
    impactSimulations,
    predictiveDashboard,
  };

  if (options?.onCompute) {
    await options.onCompute({
      loadFactors,
      maintenance,
      demandForecast,
      snapshot,
    });
  }

  return report;
}

export async function assembleOptimizationContext(horizonDays: number) {
  const [trends, loadFactors, vehicles, incidents, searchStats, snapshot] = await Promise.all([
    storage.getReservationTrends(21),
    storage.getTripLoadFactors(horizonDays),
    storage.getAllVehicles(),
    storage.getRecentIncidents(50),
    storage.getSearchStats(),
    storage.getDashboardSnapshot(),
  ]);
  return { trends, loadFactors, vehicles, incidents, searchStats, snapshot };
}

export async function runResourceOptimizationCycle(options?: { horizonDays?: number }) {
  const report = await computePredictiveAnalytics({
    horizonDays: options?.horizonDays,
    onCompute: persistOperationalRecommendations,
  });
  latestReport = report;
  return report;
}

export function getLatestOptimizationReport() {
  return latestReport;
}

export function startResourceOptimizationScheduler(options?: { intervalMs?: number; horizonDays?: number }) {
  if (schedulerHandle) return;
  const intervalMs = options?.intervalMs ?? DEFAULT_SCHEDULER_INTERVAL;
  schedulerHandle = setInterval(() => {
    void runResourceOptimizationCycle({ horizonDays: options?.horizonDays }).catch((error) => {
      console.error("Resource optimization cycle failed:", error);
    });
  }, intervalMs);
}

function aggregateRouteLoad(loadFactors: TripLoadFactor[]) {
  const map = new Map<
    string,
    {
      depart: string;
      arrivee: string;
      totalReserved: number;
      totalCapacity: number;
      priceSum: number;
      trips: TripLoadFactor[];
      vehicleIds: Set<string>;
    }
  >();

  for (const entry of loadFactors) {
    const depart = capitalize(entry.depart) || entry.depart || "Itin\u00e9raire";
    const arrivee = capitalize(entry.arrivee) || entry.arrivee || "Destination";
    const key = `${depart}__${arrivee}`;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        depart,
        arrivee,
        totalReserved: 0,
        totalCapacity: 0,
        priceSum: 0,
        trips: [],
        vehicleIds: new Set<string>(),
      };
      map.set(key, bucket);
    }
    const target = bucket!;
    target.totalReserved += entry.reserved;
    target.totalCapacity += entry.capacity;
    target.priceSum += entry.price || 0;
    target.trips.push(entry);
    if (entry.vehicleId) {
      target.vehicleIds.add(entry.vehicleId);
    }
  }

  return Array.from(map.values()).map((bucket) => {
    const avgPrice = bucket.trips.length ? bucket.priceSum / bucket.trips.length : 0;
    const occupancy = bucket.totalCapacity ? bucket.totalReserved / bucket.totalCapacity : 0;
    return {
      depart: bucket.depart,
      arrivee: bucket.arrivee,
      occupancy,
      avgPrice,
      trips: bucket.trips,
      vehicleIds: Array.from(bucket.vehicleIds),
    };
  });
}

export type OptimizationHeatmapEntry = {
  routeLabel: string;
  depart: string;
  arrivee: string;
  occupancy: number;
  avgPrice: number;
  demand: number;
  demandConfidence: number;
  capacity: number;
  reserved: number;
  geoZone: string;
  vehicleCount: number;
};

export type BalanceKPIs = {
  averageOccupancy: number;
  unmetDemand: number;
  balanceScore: number;
};

export function buildHeatmapData(ctx: ComputeContext): OptimizationHeatmapEntry[] {
  const routeBuckets = aggregateRouteLoad(ctx.loadFactors);
  const totalForecastDemand = ctx.demandForecast.reduce((sum, entry) => sum + entry.demand, 0);
  const avgDailyDemand = ctx.demandForecast.length ? totalForecastDemand / ctx.demandForecast.length : 0;

  return routeBuckets.map((bucket) => {
    const routeReserved = bucket.trips.reduce((sum, trip) => sum + (trip.reserved ?? 0), 0);
    const routeCapacity = bucket.trips.reduce((sum, trip) => sum + (trip.capacity ?? 0), 0);
    const demandEstimate = Math.round(avgDailyDemand * (bucket.occupancy ?? 0.5));
    return {
      routeLabel: `${bucket.depart} → ${bucket.arrivee}`,
      depart: bucket.depart,
      arrivee: bucket.arrivee,
      occupancy: Number((bucket.occupancy ?? 0).toFixed(2)),
      avgPrice: Number(bucket.avgPrice.toFixed(2)),
      demand: demandEstimate,
      demandConfidence: ctx.demandForecast[0]?.confidence ?? 0.7,
      capacity: routeCapacity,
      reserved: routeReserved,
      geoZone: bucket.depart.split(" ")[0]?.toUpperCase() ?? bucket.depart,
      vehicleCount: bucket.vehicleIds.length,
    };
  });
}

export function computeBalanceKPIs(ctx: ComputeContext): BalanceKPIs {
  const occupancyRates = ctx.loadFactors.map((factor) => {
    if (!factor.capacity || factor.capacity <= 0) {
      return 0;
    }
    return Math.min(1, factor.reserved / factor.capacity);
  });
  const averageOccupancy =
    occupancyRates.length > 0 ? occupancyRates.reduce((sum, value) => sum + value, 0) / occupancyRates.length : 0;
  const totalCapacity = ctx.loadFactors.reduce((sum, factor) => sum + (factor.capacity ?? 0), 0);
  const totalDemand = ctx.demandForecast.reduce((sum, entry) => sum + entry.demand, 0);
  const unmetDemand = Math.max(0, totalDemand - totalCapacity);
  const balanceScore = Math.min(100, Math.max(0, Math.round(45 + averageOccupancy * 55)));
  return {
    averageOccupancy: Number((averageOccupancy * 100).toFixed(1)),
    unmetDemand: Number(unmetDemand.toFixed(0)),
    balanceScore,
  };
}

function buildPricingInsights(loadFactors: TripLoadFactor[]): PricingInsight[] {
  const aggregated = aggregateRouteLoad(loadFactors);
  const insights = aggregated.map((route) => {
    let action: PricingInsight["action"] = "stabiliser";
    let delta = 0;
    if (route.occupancy >= 0.9) {
      action = "augmenter";
      delta = 8;
    } else if (route.occupancy <= 0.5) {
      action = "baisser";
      delta = -6;
    }
    const recommendedPrice = Math.round(route.avgPrice * (1 + delta / 100));
    const rationale =
      action === "stabiliser"
        ? "Remplissage conforme \u00e0 la cible (70-85%)"
        : action === "augmenter"
          ? "Saturation forte, tension sur la disponibilit\u00e9"
          : "Sous-utilisation persistante, activer une promotion cibl\u00e9e";
    const confidence = Math.max(0.45, Math.min(0.9, route.occupancy * 0.8 + 0.2));
    return {
      route: `${route.depart} ${"->"} ${route.arrivee}`,
      action,
      delta,
      occupancy: Number((route.occupancy * 100).toFixed(1)),
      recommendedPrice,
      rationale,
      confidence,
    };
  });

  return insights.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4);
}

function buildDemandForecast(
  trends: ReservationTrend[],
  horizonDays: number,
  searchStats: Array<{ total: number }>,
): DemandForecastEntry[] {
  const averagesByDow = new Map<number, number>();
  const dowBuckets = new Map<number, number[]>();
  for (const trend of trends) {
    const date = new Date(trend.day);
    const dow = date.getDay();
    const existing = dowBuckets.get(dow) ?? [];
    existing.push(Number(trend.reservations));
    dowBuckets.set(dow, existing);
  }
  dowBuckets.forEach((values, dow) => {
    averagesByDow.set(dow, average(values, average(trends.map((t) => Number(t.reservations)), 45)));
  });

  const totalSearches = searchStats.reduce((sum, entry) => sum + Number(entry.total || 0), 0);
  const searchPressure = totalSearches
    ? Math.min(0.3, (searchStats[0]?.total ?? 0) / totalSearches)
    : 0.05;

  const forecast: DemandForecastEntry[] = [];

  for (let offset = 1; offset <= horizonDays; offset++) {
    const target = new Date();
    target.setDate(target.getDate() + offset);
    const dow = target.getDay();
    const baseline = averagesByDow.get(dow) ?? average(trends.map((t) => Number(t.reservations)), 35);
    const seasonality = dow === 0 || dow === 6 ? 0.12 : dow === 1 ? -0.05 : 0.02;
    const weather = target.getMonth() >= 5 && target.getMonth() <= 8 ? 0.06 : 0.03;
    const events = offset <= 3 ? 0.04 : 0.02;
    const search = searchPressure * (offset <= 3 ? 0.35 : 0.18);
    const multiplier = 1 + seasonality + weather + events + search;
    const demand = Math.round(Math.max(10, baseline * multiplier));
    const confidence = Math.max(0.5, Math.min(0.92, 0.82 - offset * 0.03 + trends.length * 0.004));
    forecast.push({
      date: target.toISOString().slice(0, 10),
      demand,
      confidence,
      drivers: {
        weather: Number(weather.toFixed(2)),
        events: Number(events.toFixed(2)),
        search: Number(search.toFixed(2)),
        seasonality: Number(seasonality.toFixed(2)),
      },
    });
  }

  return forecast;
}

function buildMaintenanceOutlook(args: {
  vehicles: Vehicle[];
  incidents: Incident[];
  incidentTrips: Map<string, Trip>;
  loadFactors: TripLoadFactor[];
}): MaintenanceInsight {
  const incidentByVehicle = new Map<string, number>();
  for (const incident of args.incidents) {
    if (!incident.trip_id) continue;
    const trip = args.incidentTrips.get(incident.trip_id);
    if (!trip?.vehicle_id) continue;
    incidentByVehicle.set(trip.vehicle_id, (incidentByVehicle.get(trip.vehicle_id) ?? 0) + 1);
  }

  const loadByVehicle = new Map<string, TripLoadFactor[]>();
  for (const load of args.loadFactors) {
    if (!load.vehicleId) continue;
    const list = loadByVehicle.get(load.vehicleId) ?? [];
    list.push(load);
    loadByVehicle.set(load.vehicleId, list);
  }

  const vehicles = args.vehicles.map((vehicle) => {
    const incidents = incidentByVehicle.get(vehicle.id) ?? 0;
    const loads = loadByVehicle.get(vehicle.id) ?? [];
    const utilization = loads.length;
    const avgOccupancy = average(
      loads.map((load) => (load.capacity ? load.reserved / load.capacity : 0)),
      0.35,
    );
    let riskScore = 35 + incidents * 20 + utilization * 3 + avgOccupancy * 25;
    if (vehicle.statut === "en_maintenance") {
      riskScore += 15;
    } else if (vehicle.statut === "disponible" && avgOccupancy < 0.4) {
      riskScore -= 5;
    }
    riskScore = Math.max(10, Math.min(100, riskScore));
    const label = riskScore >= 70 ? "haut" : riskScore >= 45 ? "moyen" : "faible";
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + Math.max(2, 10 - incidents * 2));
    return {
      vehicleId: vehicle.id,
      immatriculation: vehicle.immatriculation,
      statut: vehicle.statut,
      incidents,
      riskScore: Math.round(riskScore),
      risk: label,
      avgOccupancy: Number((avgOccupancy * 100).toFixed(1)),
      nextCheck: nextCheck.toISOString(),
      recommendation:
        label === "haut"
          ? "Programmation maintenance prioritaire"
          : label === "moyen"
            ? "R\u00e9duction de charge ou inspection \u00e0 72h"
            : "Rythme nominal, simple surveillance",
    };
  });

  return {
    fleetRiskIndex: Math.round(average(vehicles.map((v) => v.riskScore), 35)),
    vehicles: vehicles.sort((a, b) => b.riskScore - a.riskScore).slice(0, 4),
  };
}

function buildImpactSimulations(args: {
  pricingInsights: PricingInsight[];
  maintenance: MaintenanceInsight;
  demandForecast: DemandForecastEntry[];
}): ImpactSimulation[] {
  const scenarios: ImpactSimulation[] = [];
  const peakPricing = args.pricingInsights.find((insight) => insight.action === "augmenter");
  if (peakPricing) {
    scenarios.push({
      id: "extra-bus",
      title: `Ajouter une rotation sur ${peakPricing.route}`,
      expectedGain: "+12% satisfaction",
      cost: "Mobilisation d'un bus + \u00e9quipage",
      confidence: peakPricing.confidence,
      summary: "R\u00e9duit la tension sur les cr\u00e9neaux satur\u00e9s et maintient le tarif dynamique.",
    });
  }

  const softPricing = args.pricingInsights.find((insight) => insight.action === "baisser");
  if (softPricing) {
    scenarios.push({
      id: "flash-offer",
      title: `Campagne flash ${softPricing.route}`,
      expectedGain: "+18% remplissage sur 72h",
      cost: `- ${Math.abs(softPricing.delta)}% temporaire`,
      confidence: softPricing.confidence,
      summary: "R\u00e9cup\u00e8re les segments sensibles au prix sur les routes \u00e0 faible tension.",
    });
  }

  if (args.maintenance.vehicles[0]) {
    const topRisk = args.maintenance.vehicles[0];
    scenarios.push({
      id: "predictive-maintenance",
      title: `Inspection anticip\u00e9e ${topRisk.immatriculation}`,
      expectedGain: "Force la disponibilit\u00e9 pour la semaine prochaine",
      cost: "Immobilisation < 24h",
      confidence: Math.min(0.9, topRisk.riskScore / 100 + 0.3),
      summary: "Baisse du risque incident, utile pour les p\u00f4les critiques.",
    });
  }

  if (!scenarios.length) {
    scenarios.push({
      id: "baseline",
      title: "Sc\u00e9nario stable",
      expectedGain: "+3% de marge",
      cost: "N\u00e9ant",
      confidence: 0.5,
      summary: "Poursuite des op\u00e9rations avec veille accrue.",
    });
  }
  return scenarios;
}

async function persistOperationalRecommendations(ctx: ComputeContext) {
  const rules = await storage.listOptimizationRules();
  const suggestions = generateOperationalRecommendations(ctx, rules);
  if (!suggestions.length) {
    return;
  }
  await Promise.all(
    suggestions.map((suggestion) =>
      storage.createOptimizationRecommendation({
        route_from: suggestion.routeFrom,
        route_to: suggestion.routeTo,
        recommended_start: suggestion.recommendedStart,
        narrative: suggestion.narrative,
        reason: suggestion.reason,
        priority: suggestion.priority,
        confidence: suggestion.confidence.toFixed(2),
        recommended_bus_id: suggestion.recommendedBusId ?? null,
        recommended_chauffeur_id: suggestion.recommendedChauffeurId ?? null,
        metadata: suggestion.metadata ?? {},
        created_by: null,
      }),
    ),
  );
}

export function generateOperationalRecommendations(
  ctx: ComputeContext,
  rules: OptimizationRule[] = [],
): OperationalRecommendationSuggestion[] {
  const enriched = ctx.loadFactors
    .map((factor) => ({
      ...factor,
      occupancy: factor.capacity ? Math.min(1, factor.reserved / factor.capacity) : 0,
    }))
    .filter((factor) => factor.capacity > 0 && factor.departure);

  const highDemand = enriched
    .filter((factor) => factor.occupancy >= 0.85)
    .sort((a, b) => b.occupancy - a.occupancy);

  const lowDemand = enriched
    .filter((factor) => factor.occupancy <= 0.6 && factor.vehicleId)
    .sort((a, b) => a.occupancy - b.occupancy);

  const suggestions: OperationalRecommendationSuggestion[] = [];
  for (const high of highDemand) {
    if (suggestions.length >= 3) break;
    const donorIndex = lowDemand.findIndex((donor) => donor.vehicleId && donor.vehicleId !== high.vehicleId);
    if (donorIndex < 0) continue;
    const donor = lowDemand.splice(donorIndex, 1)[0];
    const startTime = high.departure ?? new Date();
    const narrative = `Réaffecter le bus ${donor.vehicleImmatriculation ?? donor.vehicleId ?? "disponible"} de ${donor.depart}→${donor.arrivee} vers ${high.depart}→${high.arrivee} pour absorber la demande estimée.`;
    const reason = `Demande projetée ${Math.round(high.occupancy * 100)}% vs ${Math.round(donor.occupancy * 100)}% de remplissage.`;
    const delta = high.occupancy - donor.occupancy;
    const confidence = Math.min(0.95, 0.55 + delta * 0.5);
    const priority = Math.max(1, Math.round(Math.min(9, delta * 10)));
    const matchingRule = rules.find((rule) => {
      if (!rule.enabled) return false;
      if (rule.route_pattern) {
        const regex = new RegExp(rule.route_pattern, "i");
        if (!regex.test(`${high.depart} -> ${high.arrivee}`)) {
          return false;
        }
      }
      const threshold = Number(rule.threshold ?? "1.2");
      return high.occupancy >= threshold;
    });
    suggestions.push({
      routeFrom: `${donor.depart} -> ${donor.arrivee}`,
      routeTo: `${high.depart} -> ${high.arrivee}`,
      recommendedStart: startTime,
      narrative,
      reason,
      confidence,
      priority,
      recommendedBusId: donor.vehicleId,
      recommendedChauffeurId: donor.chauffeurId,
      metadata: {
        highOccupancy: high.occupancy,
        lowOccupancy: donor.occupancy,
        demandGap: delta,
        ruleId: matchingRule?.id,
      },
      ruleId: matchingRule?.id,
      autoApply: matchingRule?.auto_apply ?? false,
    });
  }

  return suggestions;
}

function buildPredictiveOverview(args: {
  snapshot: Awaited<ReturnType<typeof storage.getDashboardSnapshot>>;
  demandForecast: DemandForecastEntry[];
  pricingInsights: PricingInsight[];
  maintenance: MaintenanceInsight;
}): PredictiveDashboardSnapshot {
  const stressFactors = [
    args.snapshot.incidentsOpen * 8,
    (args.snapshot.reservationsToday || 0) > (args.snapshot.totals.trips || 1) * 4 ? 25 : 0,
    args.maintenance.fleetRiskIndex * 0.5,
  ];
  const stressIndex = Math.max(10, Math.min(100, Math.round(stressFactors.reduce((sum, value) => sum + value, 0) / 3)));

  const anomalies: Array<{ id: string; severity: "low" | "medium" | "high"; message: string }> = [];
  if (args.snapshot.incidentsOpen > 3) {
    anomalies.push({
      id: "incident-peak",
      severity: "high",
      message: `${args.snapshot.incidentsOpen} incidents actifs : activer la cellule terrain`,
    });
  }
  if (args.pricingInsights.some((insight) => insight.action === "augmenter" && insight.occupancy > 95)) {
    anomalies.push({
      id: "saturation",
      severity: "medium",
      message: "Saturation forte sur une ligne r\u00e9currente : envisager un renfort flotte",
    });
  }

  return {
    stressIndex,
    alerts: anomalies,
    opportunityWindows: args.pricingInsights
      .filter((insight) => insight.action !== "stabiliser")
      .map((insight) => ({
        route: insight.route,
        window: insight.action === "augmenter" ? "48h" : "72h",
        action: insight.action,
        gainPotential: insight.action === "augmenter" ? "+6% marge" : "+15% remplissage",
      })),
  };
}
