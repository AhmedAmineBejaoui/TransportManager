import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  computePredictiveAnalytics,
  runResourceOptimizationCycle,
  assembleOptimizationContext,
  generateOperationalRecommendations,
  buildHeatmapData,
  computeBalanceKPIs,
  type OperationalRecommendationSuggestion,
} from "./resourceOptimizationService";
import { capitalize } from "./utils/string";
import { average } from "./utils/math";
import {
  insertUserSchema,
  insertVehicleSchema,
  insertTripSchema,
  insertReservationSchema,
  insertSearchLogSchema,
  insertIncidentSchema,
  insertExperiencePersonalizationSchema,
  insertAccessibilitySettingSchema,
  type User as TransportUser,
  type ExperiencePersonalization,
  type AccessibilitySetting,
  type InsertTrip,
  type Trip,
  type Reservation,
  type SearchLog,
  type Vehicle,
  type Incident,
} from "@shared/schema";
import { tunisiaRoutes } from "@shared/tunisiaRoutes";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcrypt";
import passport from "passport";
import { isRoleAllowed, isAdminRole } from "@shared/roles";

const disableCache = (res: Response) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User extends TransportUser {}
  }
}

// Extend Express Session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie || "none";
  console.log("[auth] userId:", req.session.userId, "cookie header:", cookieHeader);
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  storage
    .getUser(req.session.userId)
    .then((user) => {
      if (!user) {
        req.session.destroy(() => undefined);
        return res.status(401).json({ error: "Session invalide" });
      }
      if (isUserInMaintenance(user)) {
        return res.status(423).json({
          error: "Compte en maintenance",
          until: user.maintenance_until,
          reason: user.maintenance_reason,
        });
      }
      req.user = user;
      void storage.logUserActivity({
        user_id: user.id,
        event: "heartbeat",
        ip: req.ip,
        device: req.get("user-agent") || undefined,
      });
      next();
    })
    .catch((error) => next(error));
}

// Middleware to check role
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }

    try {
      let user = req.user;
      if (!user) {
        user = await storage.getUser(req.session.userId);
      }
      if (!user) {
        return res.status(401).json({ error: "Session invalide" });
      }
      if (isUserInMaintenance(user)) {
        return res.status(423).json({
          error: "Compte en maintenance",
          until: user.maintenance_until,
          reason: user.maintenance_reason,
        });
      }
      if (!isRoleAllowed(user.role, roles)) {
        console.warn(`[auth] access denied for user ${user.id} with role=${user.role}; required roles=${roles.join(",")}`);
        return res.status(403).json({ error: "Acc\u00e8s interdit" });
      }
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function isUserInMaintenance(user: TransportUser): boolean {
  if (!user) {
    return false;
  }

  if (user.statut === "maintenance" && !user.maintenance_until) {
    return true;
  }

  if (!user.maintenance_until) {
    return false;
  }

  const until = user.maintenance_until instanceof Date ? user.maintenance_until : new Date(user.maintenance_until);
  return until.getTime() > Date.now();
}

const ENTITIES = [
  { id: "national", name: "Réseau National", factor: 1 },
  { id: "nord", name: "Nord & Grand Tunis", factor: 1.2 },
  { id: "centre", name: "Centre & Sahel", factor: 0.9 },
  { id: "sud", name: "Sud & Sahara", factor: 0.7 },
] as const;

function sanitizeMetaInput(input?: string) {
  if (!input) return "";
  return input.replace(/[<>"]/g, "");
}

const PRIORITY_LEVELS = {
  low: 0,
  normal: 1,
  high: 2,
} as const;

const notificationActionSchema = z.object({
  id: z.string().min(2),
  label: z.string().min(2),
  action: z.enum(["confirm", "cancel", "snooze", "custom"]),
  metadata: z.record(z.any()).optional(),
});

type UserNotificationAction = z.infer<typeof notificationActionSchema>;

type SegmentFilters = {
  role?: "ADMIN" | "SUPER_ADMIN" | "CHAUFFEUR" | "CLIENT";
  statut?: string;
  minHealthScore?: number;
  segmentId?: string;
  location?: string;
};

const notificationPreferenceSchema = z.object({
  channels: z.record(z.boolean()).optional(),
  priority_threshold: z.enum(["low", "normal", "high"]).optional(),
  quiet_mode: z.boolean().optional(),
  quiet_hours: z.string().max(32).nullable().optional(),
  context_filters: z.record(z.any()).optional(),
  vacation_mode: z.boolean().optional(),
  vacation_delegate_user_id: z.string().uuid().nullable().optional(),
  vacation_until: z.string().datetime().nullable().optional(),
});

const segmentFiltersSchema = z
  .object({
    role: z.enum(["ADMIN", "SUPER_ADMIN", "CHAUFFEUR", "CLIENT"]).optional(),
    statut: z.string().optional(),
    minHealthScore: z.number().min(0).max(100).optional(),
    segmentId: z.string().uuid().optional(),
    location: z.string().optional(),
  })
  .partial()
  .optional();

const ADAPTIVE_CONTEXTS = [
  { id: "conduite", label: "Assistant conduite", accent: "#dc2626", focus: ["itin\u00e9raire", "alertes", "voix"] },
  { id: "bureau", label: "Mode bureau", accent: "#2563eb", focus: ["analytics", "planification"] },
  { id: "mobilite", label: "Mobilit\u00e9 active", accent: "#10b981", focus: ["gestes", "actions rapides"] },
  { id: "presentation", label: "Mode pr\u00e9sentation", accent: "#f97316", focus: ["synth\u00e8ses", "storytelling"] },
  { id: "cognitive", label: "Mode cognitif", accent: "#8b5cf6", focus: ["guidage", "pas \u00e0 pas"] },
] as const;
type AdaptiveContext = (typeof ADAPTIVE_CONTEXTS)[number];

const personalizationStateSchema = z.object({
  context: z.string().min(2).max(32).optional(),
  mode: z.string().min(2).max(32).optional(),
  profileId: z.string().min(3).optional(),
  profileName: z.string().min(2).max(64).optional(),
  triggers: z.record(z.any()).optional(),
  layout: z.any().optional(),
  theme: z.any().optional(),
  accessibility: z.any().optional(),
  presentationMode: z.boolean().optional(),
  dynamicTheme: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

const experienceProfilePayloadSchema = insertExperiencePersonalizationSchema.omit({
  user_id: true,
});
const experienceProfileUpdateSchema = experienceProfilePayloadSchema.partial();
const accessibilitySettingsPayloadSchema = insertAccessibilitySettingSchema.omit({
  user_id: true,
});
const accessibilitySettingsUpdateSchema = accessibilitySettingsPayloadSchema
  .extend({
    translation_languages: z.union([z.array(z.string().min(2)), z.string().min(2)]).optional(),
  })
  .partial();
const translationRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().min(2).default("fr-FR"),
});

const TRANSLATION_DICTIONARY: Record<string, Record<string, Record<string, string>>> = {
  fr: {
    en: {
      bonjour: "hello",
      trajet: "trip",
      trajets: "trips",
      conduite: "driving",
      mobilite: "mobility",
      presentation: "presentation",
      mode: "mode",
      notifications: "notifications",
      voix: "voice",
      gestes: "gestures",
      reservation: "booking",
      interface: "interface",
      contrastes: "contrast",
      cognitif: "cognitive",
      carte: "map",
    },
    ar: {
      bonjour: "\u0623\u0647\u0644\u0627\u064b",
      trajet: "\u0631\u062d\u0644\u0629",
      trajets: "\u0631\u062d\u0644\u0627\u062a",
      conduite: "\u0642\u064a\u0627\u062f\u0629",
      mobilite: "\u062a\u0646\u0642\u0644",
      presentation: "\u0639\u0631\u0636",
      mode: "\u0648\u0636\u0639",
      notifications: "\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
      voix: "\u0635\u0648\u062a",
      gestes: "\u0625\u064a\u0645\u0627\u0621\u0627\u062a",
      reservation: "\u062d\u062c\u0632",
      interface: "\u0648\u0627\u062c\u0647\u0629",
      contrastes: "\u062a\u0628\u0627\u064a\u0646",
      cognitif: "\u0645\u0639\u0631\u0641\u064a",
      carte: "\u062e\u0631\u064a\u0637\u0629",
    },
  },
  en: {
    fr: {
      hello: "bonjour",
      driving: "conduite",
      mobility: "mobilit\u00e9",
      presentation: "pr\u00e9sentation",
      mode: "mode",
      notifications: "notifications",
      voice: "voix",
      gestures: "gestes",
      booking: "r\u00e9servation",
      interface: "interface",
      contrast: "contraste",
      cognitive: "cognitif",
      map: "carte",
    },
    ar: {
      hello: "\u0623\u0647\u0644\u0627\u064b",
      driving: "\u0642\u064a\u0627\u062f\u0629",
      mobility: "\u062a\u0646\u0642\u0644",
      presentation: "\u0639\u0631\u0636",
      mode: "\u0648\u0636\u0639",
      notifications: "\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
      voice: "\u0635\u0648\u062a",
      gestures: "\u0625\u064a\u0645\u0627\u0621\u0627\u062a",
      booking: "\u062d\u062c\u0632",
      interface: "\u0648\u0627\u062c\u0647\u0629",
      contrast: "\u062a\u0628\u0627\u064a\u0646",
      cognitive: "\u0645\u0639\u0631\u0641\u064a",
      map: "\u062e\u0631\u064a\u0637\u0629",
    },
  },
  ar: {
    fr: {
      "\u0623\u0647\u0644\u0627\u064b": "bonjour",
      "\u0631\u062d\u0644\u0629": "trajet",
      "\u0631\u062d\u0644\u0627\u062a": "trajets",
      "\u0642\u064a\u0627\u062f\u0629": "conduite",
      "\u062a\u0646\u0642\u0644": "mobilit\u00e9",
      "\u0639\u0631\u0636": "pr\u00e9sentation",
      "\u0648\u0636\u0639": "mode",
      "\u0625\u0634\u0639\u0627\u0631\u0627\u062a": "notifications",
      "\u0635\u0648\u062a": "voix",
      "\u0625\u064a\u0645\u0627\u0621\u0627\u062a": "gestes",
      "\u062d\u062c\u0632": "r\u00e9servation",
      "\u0648\u0627\u062c\u0647\u0629": "interface",
      "\u062a\u0628\u0627\u064a\u0646": "contraste",
      "\u0645\u0639\u0631\u0641\u064a": "cognitif",
      "\u062e\u0631\u064a\u0637\u0629": "carte",
    },
    en: {
      "\u0623\u0647\u0644\u0627\u064b": "hello",
      "\u0631\u062d\u0644\u0629": "trip",
      "\u0631\u062d\u0644\u0627\u062a": "trips",
      "\u0642\u064a\u0627\u062f\u0629": "driving",
      "\u062a\u0646\u0642\u0644": "mobility",
      "\u0639\u0631\u0636": "presentation",
      "\u0648\u0636\u0639": "mode",
      "\u0625\u0634\u0639\u0627\u0631\u0627\u062a": "notifications",
      "\u0635\u0648\u062a": "voice",
      "\u0625\u064a\u0645\u0627\u0621\u0627\u062a": "gestures",
      "\u062d\u062c\u0632": "booking",
      "\u0648\u0627\u062c\u0647\u0629": "interface",
      "\u062a\u0628\u0627\u064a\u0646": "contrast",
      "\u0645\u0639\u0631\u0641\u064a": "cognitive",
      "\u062e\u0631\u064a\u0637\u0629": "map",
    },
  },
};

const recommendationStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  priority: z.number().int().min(0).optional(),
  comment: z.string().max(500).optional(),
});

const optimizationRuleInputSchema = z.object({
  name: z.string().min(3),
  route_pattern: z.string().optional(),
  threshold: z.number().min(0).max(5).optional(),
  auto_apply: z.boolean().optional(),
  enabled: z.boolean().optional(),
  min_rest_hours: z.number().int().min(0).optional(),
  service_window: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/).optional(),
  metadata: z.record(z.any()).optional(),
});
const optimizationRuleUpdateSchema = optimizationRuleInputSchema.partial();
const optimizationRuleOverrideSchema = optimizationRuleUpdateSchema.extend({
  id: z.string().optional(),
});
const optimizationRuleSaveSchema = z.object({
  rules: z.array(
    optimizationRuleInputSchema.extend({
      id: z.string().optional(),
    }),
  ),
});
const optimizationSimulationSchema = z.object({
  horizonDays: z.number().int().min(1).max(14).optional(),
  overrides: z.array(optimizationRuleOverrideSchema).optional(),
});

function applyOptimizationRuleOverrides(
  baseRules: OptimizationRule[],
  overrides?: z.infer<typeof optimizationRuleOverrideSchema>[],
) {
  if (!overrides?.length) {
    return baseRules;
  }

  const overrideById = new Map<string, z.infer<typeof optimizationRuleOverrideSchema>>();
  overrides.forEach((entry) => {
    if (entry.id) {
      overrideById.set(entry.id, entry);
    }
  });

  const merged = baseRules.map((rule) => {
    const override = overrideById.get(rule.id);
    if (!override) {
      return rule;
    }
    return {
      ...rule,
      ...override,
      threshold: override.threshold ?? rule.threshold,
      metadata: override.metadata ?? rule.metadata,
    };
  });

  const extras = overrides
    .filter((entry) => !entry.id && entry.name)
    .map((entry, index) => ({
      id: `temp-${Date.now()}-${index}`,
      name: entry.name,
      enabled: entry.enabled ?? true,
      route_pattern: entry.route_pattern ?? null,
      threshold: entry.threshold ?? 1.2,
      auto_apply: entry.auto_apply ?? false,
      min_rest_hours: entry.min_rest_hours ?? 8,
      service_window: entry.service_window ?? "05:00-23:00",
      metadata: entry.metadata ?? {},
      created_at: new Date(),
      updated_at: new Date(),
    }));

  return [...merged, ...extras];
}

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function normalizeLanguageCode(language?: string) {
  if (!language) return "fr";
  return language.toLowerCase().split("-")[0];
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "");
}

function resolveContextPreset(contextId: string): AdaptiveContext {
  return ADAPTIVE_CONTEXTS.find((ctx) => ctx.id === contextId) ?? ADAPTIVE_CONTEXTS[0];
}

function detectAdaptiveContext(req: Request): string {
  const forced = typeof req.query.context === "string" ? req.query.context : req.get("x-app-context");
  if (forced && ADAPTIVE_CONTEXTS.some((ctx) => ctx.id === forced)) {
    return forced;
  }
  const userAgent = (req.get("user-agent") || "").toLowerCase();
  const hour = req.query.hour ? Number(req.query.hour) : new Date().getHours();
  if (userAgent.includes("iphone") || userAgent.includes("android")) {
    return "mobilite";
  }
  if (hour >= 6 && hour < 9) {
    return "conduite";
  }
  if (hour >= 9 && hour < 18) {
    return "bureau";
  }
  if (hour >= 18 && hour < 22) {
    return "presentation";
  }
  return "cognitive";
}

function computeDynamicTheme(options: {
  context: string;
  baseTheme?: Record<string, unknown>;
  dynamic?: boolean;
  weather?: string;
  brightness?: string;
  environment?: string;
  hour?: number;
  presentation?: boolean;
  cognitive?: boolean;
}) {
  const preset = resolveContextPreset(options.context);
  const baseTheme = (options.baseTheme ?? {}) as Record<string, unknown>;
  const hour = options.hour ?? new Date().getHours();
  let mode: "light" | "dark" = baseTheme.base === "dark" ? "dark" : "light";
  let accent = (baseTheme.accent as string) || preset.accent;

  if (options.dynamic !== false) {
    if (options.brightness === "dark" || hour >= 19 || options.context === "conduite") {
      mode = "dark";
    }
    if (options.weather?.toLowerCase().includes("pluie") || options.weather?.toLowerCase().includes("rain")) {
      accent = "#0ea5e9";
    } else if (options.weather?.toLowerCase().includes("chaleur") || options.weather?.toLowerCase().includes("sun")) {
      accent = "#facc15";
    }
    if (options.environment === "vehicule") {
      accent = "#f97316";
    }
  }

  if (options.presentation) {
    mode = "light";
    accent = "#f97316";
  }

  const contrast = options.presentation
    ? "high"
    : options.cognitive
      ? "soft"
      : mode === "dark"
        ? "night"
        : "standard";
  const gradient =
    mode === "dark"
      ? `linear-gradient(135deg, ${accent}, #0f172a)`
      : `linear-gradient(135deg, ${accent}, #f8fafc)`;
  const fontScale = options.cognitive ? 1.15 : 1;

  return {
    mode,
    accent,
    gradient,
    contrast,
    glow: mode === "dark" ? "rgba(14,165,233,0.35)" : "rgba(37,99,235,0.25)",
    fontScale,
    preset: preset.label,
  };
}

function buildContextualSuggestions(args: {
  context: string;
  profile?: ExperiencePersonalization | null;
  accessibility?: AccessibilitySetting | null;
}) {
  const suggestions: Array<{ id: string; label: string; description: string; type: "context" | "accessibility" | "theme" }> = [];
  if (args.context === "presentation" && !args.profile?.presentation_mode) {
    suggestions.push({
      id: "presentation-mode",
      label: "Activer le mode pr\u00e9sentation",
      description: "Simplifie l'interface et met l'accent sur les KPI pour les briefings clients.",
      type: "context",
    });
  }
  if (args.context === "conduite" && !args.accessibility?.voice_enabled) {
    suggestions.push({
      id: "voice-control",
      label: "Activer l'assistant vocal",
      description: "Commandes 100% vocales et feedback audio pour conduite s\u00e9curis\u00e9e.",
      type: "accessibility",
    });
  }
  if (
    (args.accessibility?.contrast_preset ?? "standard") === "standard" &&
    (args.context === "conduite" || args.context === "mobilite")
  ) {
    suggestions.push({
      id: "high-contrast",
      label: "Augmenter le contraste",
      description: "Meilleure lisibilit\u00e9 pour l'ext\u00e9rieur, surtout en mobilit\u00e9.",
      type: "theme",
    });
  }
  if (!args.accessibility?.cognitive_mode && args.context === "cognitive") {
    suggestions.push({
      id: "cognitive-mode",
      label: "Guidage pas \u00e0 pas",
      description: "Active le mode cognitif avec accompagnement vocal et visuel.",
      type: "accessibility",
    });
  }
  if (Array.isArray(args.profile?.layout_config) && (args.profile?.layout_config as unknown[]).length < 3) {
    suggestions.push({
      id: "layout-builder",
      label: "Personnaliser la mise en page",
      description: "Ajoutez vos tuiles pr\u00e9f\u00e9r\u00e9es par glisser-d\u00e9poser.",
      type: "context",
    });
  }
  return suggestions.slice(0, 4);
}

function preserveTokenCasing(original: string, translated: string) {
  if (!original.length) return translated;
  if (original === original.toUpperCase()) {
    return translated.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
}

function translateWithDictionary(text: string, sourceLanguage?: string, targetLanguage?: string) {
  const source = normalizeLanguageCode(sourceLanguage);
  const target = normalizeLanguageCode(targetLanguage);
  if (source === target) {
    return { translatedText: text, confidence: 0.95, hits: text ? 1 : 0, source, target };
  }
  const dictionary = TRANSLATION_DICTIONARY[source]?.[target];
  if (!dictionary) {
    return { translatedText: text, confidence: 0.3, hits: 0, source, target };
  }
  const tokens = text.split(/(\s+|[,.!?;:])/g);
  let hits = 0;
  const translated = tokens.map((token) => {
    const normalized = stripAccents(token).toLowerCase();
    const replacement = dictionary[normalized];
    if (replacement) {
      hits += 1;
      return preserveTokenCasing(token, replacement);
    }
    return token;
  });
  const wordsCount = tokens.filter((token) => /\w/.test(token)).length || 1;
  const confidence = Math.min(0.95, 0.35 + hits / wordsCount);
  return {
    translatedText: translated.join(""),
    confidence,
    hits,
    source,
    target,
  };
}

const MILLIS_IN_HOUR = 1000 * 60 * 60;
const MILLIS_IN_DAY = MILLIS_IN_HOUR * 24;

type RoutePreference = {
  depart: string;
  arrivee: string;
  count: number;
  lastSeen: Date | null;
};

type ReservationAnalytics = {
  upcoming: Array<{ reservation: Reservation; trip?: Trip }>;
  past: Array<{ reservation: Reservation; trip?: Trip }>;
  favoriteRoutes: RoutePreference[];
  bookingWindowAvg: number;
  travelRhythmDays: number;
  preferredDepartureHour: number | null;
  routeDominance: number;
  dataRichness: number;
};

type LoyaltyTier = { tier: string; nextThreshold: number | null; delta: number | null };

function ensureDate(value?: string | Date | null) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function hoursBetween(a?: string | Date | null, b?: string | Date | null) {
  const first = ensureDate(a);
  const second = ensureDate(b);
  if (!first || !second) return Infinity;
  return Math.abs(second.getTime() - first.getTime()) / MILLIS_IN_HOUR;
}

function analyzeReservationPatterns(reservations: Reservation[], tripMap: Map<string, Trip>): ReservationAnalytics {
  const enriched = reservations.map((reservation) => ({
    reservation,
    trip: tripMap.get(reservation.trip_id),
  }));
  const now = Date.now();
  const upcoming: typeof enriched = [];
  const past: typeof enriched = [];
  const routeMap = new Map<string, RoutePreference>();
  const bookingWindows: number[] = [];
  const travelIntervals: number[] = [];
  const departureHours: number[] = [];
  const sortedDepartures: Date[] = [];

  for (const entry of enriched) {
    const tripDate = ensureDate(entry.trip?.heure_depart_prevue);
    if (tripDate) {
      sortedDepartures.push(tripDate);
      if (tripDate.getTime() >= now) {
        upcoming.push(entry);
      } else {
        past.push(entry);
      }
      departureHours.push(tripDate.getHours() + tripDate.getMinutes() / 60);
      const bookingDate = ensureDate(entry.reservation.date_reservation);
      if (bookingDate) {
        bookingWindows.push(Math.max(0.5, (tripDate.getTime() - bookingDate.getTime()) / MILLIS_IN_DAY));
      }
    }

    const depart = capitalize(entry.trip?.point_depart ?? "Itin\u00e9raire");
    const arrivee = capitalize(entry.trip?.point_arrivee ?? "Destination");
    const key = `${depart}__${arrivee}`;
    const existing = routeMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = tripDate && (!existing.lastSeen || tripDate > existing.lastSeen) ? tripDate : existing.lastSeen;
    } else {
      routeMap.set(key, {
        depart,
        arrivee,
        count: 1,
        lastSeen: tripDate ?? null,
      });
    }
  }

  sortedDepartures
    .sort((a, b) => a.getTime() - b.getTime())
    .forEach((date, index, array) => {
      if (index === 0) return;
      const previous = array[index - 1];
      travelIntervals.push((date.getTime() - previous.getTime()) / MILLIS_IN_DAY);
    });

  const favoriteRoutes = Array.from(routeMap.values()).sort((a, b) => b.count - a.count);
  const routeDominance = favoriteRoutes.length ? favoriteRoutes[0].count / Math.max(reservations.length, 1) : 0;
  const bookingWindowAvg = average(bookingWindows, 4);
  const travelRhythmDays = average(travelIntervals, 14);
  const preferredDepartureHour = departureHours.length ? average(departureHours) : null;
  const dataRichness = Math.min(1, reservations.length / 8);

  return {
    upcoming,
    past,
    favoriteRoutes,
    bookingWindowAvg,
    travelRhythmDays,
    preferredDepartureHour,
    routeDominance,
    dataRichness,
  };
}

function parseLanguageHeader(header?: string) {
  if (!header) {
    return ["fr-FR", "ar-TN", "en-GB"];
  }
  const parsed = header
    .split(",")
    .map((segment) => segment.split(";")[0].trim())
    .filter(Boolean);
  const normalized = Array.from(new Set([...parsed, "fr-FR", "ar-TN", "en-GB"]));
  return normalized.slice(0, 4);
}

function resolveLoyaltyTier(balance: number): LoyaltyTier {
  if (balance >= 2500) {
    return { tier: "Platine", nextThreshold: null, delta: null };
  }
  if (balance >= 1500) {
    return { tier: "Or", nextThreshold: 2500, delta: 2500 - balance };
  }
  if (balance >= 700) {
    return { tier: "Argent", nextThreshold: 1500, delta: 1500 - balance };
  }
  return { tier: "Bronze", nextThreshold: 700, delta: 700 - balance };
}

function computeBehaviorProfile(args: {
  metrics: ReservationAnalytics;
  searchRecencyHours: number;
}): {
  archetype: string;
  description: string;
  predictedIntent: string;
  probability: number;
  signals: string[];
} {
  const { metrics, searchRecencyHours } = args;
  let archetype = "Explorateur opportuniste";
  let description =
    "Habitudes encore mouvantes : l'assistant teste plusieurs sc\u00e9narios pour identifier les rituels de trajet pr\u00e9f\u00e9r\u00e9s.";

  if (metrics.routeDominance > 0.65 && metrics.travelRhythmDays <= 10) {
    archetype = "Pendulaire structur\u00e9";
    description = "Trajets tr\u00e8s r\u00e9p\u00e9titifs et rythm\u00e9s, id\u00e9al pour une anticipation automatique des besoins.";
  } else if (metrics.bookingWindowAvg >= 10 && metrics.travelRhythmDays >= 12) {
    archetype = "Planificateur strat\u00e9gique";
    description = "Pr\u00e9f\u00e8re s'organiser longtemps \u00e0 l'avance avec un haut niveau de stabilit\u00e9.";
  }

  let predictedIntent = "Explorer les prochains trajets sugg\u00e9r\u00e9s";
  if (metrics.upcoming.some((entry) => hoursBetween(new Date(), entry.trip?.heure_depart_prevue) <= 36)) {
    predictedIntent = "Finaliser la pr\u00e9paration du prochain d\u00e9part";
  } else if (searchRecencyHours < 12 && !metrics.upcoming.length) {
    predictedIntent = "Confirmer une nouvelle r\u00e9servation suite aux recherches de la journ\u00e9e";
  } else if (metrics.travelRhythmDays <= 9) {
    predictedIntent = "Planifier la prochaine navette r\u00e9currente";
  }

  const probability = Math.max(
    0.4,
    Math.min(0.92, metrics.dataRichness * 0.35 + metrics.routeDominance * 0.45 + (searchRecencyHours < 24 ? 0.2 : 0)),
  );

  const signals = [
    `Fen\u00eatre de r\u00e9servation moyenne : ${metrics.bookingWindowAvg.toFixed(1)} j`,
    `Cadence habituelle : ${metrics.travelRhythmDays.toFixed(1)} j`,
    metrics.favoriteRoutes[0]
      ? `Route dominante : ${metrics.favoriteRoutes[0].depart} → ${metrics.favoriteRoutes[0].arrivee} (${metrics.favoriteRoutes[0].count}x)`
      : "Route dominante : en cours d'apprentissage",
    searchRecencyHours !== Infinity ? `Dernier signal actif il y a ${searchRecencyHours.toFixed(1)} h` : "Pas de recherche r\u00e9cente",
  ];

  return { archetype, description, predictedIntent, probability, signals };
}

function buildNextBestActions(args: {
  metrics: ReservationAnalytics;
  loyalty: LoyaltyTier & { balance: number };
  searchRecencyHours: number;
  lastSearch?: SearchLog;
}) {
  const actions: Array<{
    id: string;
    label: string;
    description: string;
    impact: "low" | "medium" | "high";
    deadline?: string;
    dataPoints?: string[];
  }> = [];
  const now = new Date();
  const nextTrip = args.metrics.upcoming
    .map((entry) => entry.trip)
    .filter((trip): trip is Trip => Boolean(trip))
    .sort((a, b) => ensureDate(a.heure_depart_prevue)!.getTime() - ensureDate(b.heure_depart_prevue)!.getTime())[0];

  if (nextTrip) {
    const departureDate = ensureDate(nextTrip.heure_depart_prevue);
    const hoursUntilDeparture = departureDate ? (departureDate.getTime() - now.getTime()) / MILLIS_IN_HOUR : null;
    if (hoursUntilDeparture !== null && hoursUntilDeparture <= 48) {
      actions.push({
        id: "preflight-check",
        label: "Briefing d\u00e9part + check-in",
        description: "V\u00e9rifiez l'itin\u00e9raire, pr\u00e9parez la check-list bagages et activez le mode conduite s\u00e9curis\u00e9.",
        impact: "high",
        deadline: departureDate?.toISOString(),
        dataPoints: [`Temps restant : ${Math.round(hoursUntilDeparture)} h`],
      });
    }
  }

  if (args.loyalty.nextThreshold && args.loyalty.delta !== null && args.loyalty.delta <= 150) {
    actions.push({
      id: "loyalty-push",
      label: `Passez en ${args.loyalty.tier === "Or" ? "Platine" : "niveau sup\u00e9rieur"}`,
      description: "Encore quelques trajets ou missions r\u00e9currentes avant de d\u00e9bloquer les avantages prioritaires.",
      impact: "medium",
      dataPoints: [`Points actuels : ${args.loyalty.balance}`, `Manque ${args.loyalty.delta} pts`],
    });
  }

  if (!args.metrics.upcoming.length && args.metrics.favoriteRoutes[0]) {
    actions.push({
      id: "predictive-slot",
      label: `Ouvrir un nouveau slot ${args.metrics.favoriteRoutes[0].depart} → ${args.metrics.favoriteRoutes[0].arrivee}`,
      description: "La fen\u00eatre optimale se situe dans " + `${Math.round(args.metrics.bookingWindowAvg)} jours.`,
      impact: "high",
      dataPoints: [`Fen\\u00eatre type : ${args.metrics.bookingWindowAvg.toFixed(1)} j`],
    });
  }

  if (args.searchRecencyHours < 6 && args.lastSearch) {
    actions.push({
      id: "search-followup",
      label: "Relancer la recherche inachev\u00e9e",
      description: `Vous avez cherch\u00e9 ${args.lastSearch.depart ?? "un trajet"} → ${args.lastSearch.arrivee ?? ""}. Souhaitez-vous finaliser ?`,
      impact: "medium",
      dataPoints: [
        args.lastSearch.date_recherche ? new Date(args.lastSearch.date_recherche).toLocaleTimeString("fr-FR") : undefined,
      ].filter(Boolean) as string[],
    });
  }

  return actions.slice(0, 4);
}

function buildRouteOutlook(metrics: ReservationAnalytics) {
  return metrics.favoriteRoutes.slice(0, 2).map((route) => {
    const confidence = Math.min(0.9, Math.max(0.35, metrics.routeDominance + metrics.dataRichness * 0.5));
    return {
      route: `${route.depart} → ${route.arrivee}`,
      demandScore: Math.round((route.count / Math.max(1, metrics.upcoming.length + metrics.past.length)) * 100),
      recommendedWindowDays: Math.round(metrics.bookingWindowAvg),
      nextBestPeriod: route.lastSeen
        ? new Date(route.lastSeen.getTime() + metrics.travelRhythmDays * MILLIS_IN_DAY).toISOString()
        : null,
      confidence,
    };
  });
}

function buildProactiveSuggestions(args: { metrics: ReservationAnalytics; searchHistory: SearchLog[] }) {
  const suggestions: Array<{
    id: string;
    title: string;
    description: string;
    rationale: string;
    channels: string[];
  }> = [];

  if (args.metrics.favoriteRoutes[0]) {
    suggestions.push({
      id: "auto-plan",
      title: "Planification intelligente",
      description: `Programmer automatiquement les navettes ${args.metrics.favoriteRoutes[0].depart} → ${args.metrics.favoriteRoutes[0].arrivee}`,
      rationale: "R\u00e9p\u00e9tition forte et cadence stable d\u00e9tect\u00e9e",
      channels: ["Siri", "Google Assistant"],
    });
  }

  const recentSearch = args.searchHistory[0];
  if (recentSearch) {
    suggestions.push({
      id: "contextual-agent",
      title: "Agent contextualis\u00e9",
      description: "Cr\u00e9er un rappel vocal 2h avant la prochaine recherche programm\u00e9e.",
      rationale: "Interaction r\u00e9cente avec le moteur de recherche",
      channels: ["Notifications dynamiques"],
    });
  }

  suggestions.push({
    id: "habit-optimizer",
    title: "Optimisation proactive",
    description: "Proposer des variantes plus rapides lors des pics trafic sur votre route dominante.",
    rationale: "Anticipation automatique des perturbations",
    channels: ["Alertes IA"],
  });

  return suggestions.slice(0, 3);
}

function buildIntegrationStatus(userAgent?: string) {
  const agent = (userAgent || "").toLowerCase();
  const isIOS = agent.includes("iphone") || agent.includes("ipad");
  const isAndroid = agent.includes("android");
  const isDesktop = agent.includes("macintosh") || agent.includes("windows");

  return [
    {
      provider: "Siri",
      status: isIOS ? "connect\u00e9" : "disponible",
      capabilities: ["Commandes vocales contextuelles", "Rappels trajets"],
      lastSync: isIOS ? new Date().toISOString() : null,
    },
    {
      provider: "Google Assistant",
      status: isAndroid || isDesktop ? "connect\u00e9" : "disponible",
      capabilities: ["Briefings quotidiens", "Actions rapides"],
      lastSync: (isAndroid || isDesktop) ? new Date().toISOString() : null,
    },
    {
      provider: "Alexa",
      status: "pr\u00eat \u00e0 l'activation",
      capabilities: ["Mode maison connect\u00e9e", "Annonce vocale multi-pi\u00e8ces"],
      lastSync: null,
    },
  ];
}

function buildAssistantResponse(args: {
  user: TransportUser;
  reservations: Reservation[];
  searchHistory: SearchLog[];
  loyaltyBalance: number;
  tripMap: Map<string, Trip>;
  headers: { userAgent?: string; acceptLanguage?: string };
}) {
  const metrics = analyzeReservationPatterns(args.reservations, args.tripMap);
  const languages = parseLanguageHeader(args.headers.acceptLanguage);
  const loyaltyTier = resolveLoyaltyTier(args.loyaltyBalance);
  const lastSearch = args.searchHistory[0];
  const searchRecencyHours =
    lastSearch?.date_recherche !== undefined ? hoursBetween(lastSearch.date_recherche, new Date()) : Infinity;
  const behaviorProfile = computeBehaviorProfile({ metrics, searchRecencyHours });
  const nextBestActions = buildNextBestActions({
    metrics,
    loyalty: { ...loyaltyTier, balance: args.loyaltyBalance },
    searchRecencyHours,
    lastSearch,
  });
  const proactiveSuggestions = buildProactiveSuggestions({ metrics, searchHistory: args.searchHistory });
  const routeOutlook = buildRouteOutlook(metrics);
  const integrations = buildIntegrationStatus(args.headers.userAgent);

  const learningConfidence = Math.min(
    0.95,
    Math.max(0.35, metrics.dataRichness * 0.5 + (args.searchHistory.length > 4 ? 0.25 : 0)),
  );

  return {
    generatedAt: new Date().toISOString(),
    persona: {
      codename: "Atlas 4.1",
      version: "4.1",
      specialities: [
        "Profilage comportemental temps r\u00e9el",
        "Pr\u00e9diction d'itin\u00e9raires et d'anomalies",
        "Orchestration multi-assistants (Siri, Google, Alexa)",
      ],
      languages,
      proactiveMode: {
        enabled: true,
        confidence: learningConfidence,
        lastReview: metrics.favoriteRoutes[0]?.lastSeen ?? null,
      },
    },
    learningSignals: {
      favoriteRoute: metrics.favoriteRoutes[0]
        ? `${metrics.favoriteRoutes[0].depart} → ${metrics.favoriteRoutes[0].arrivee}`
        : null,
      bookingWindowDays: Number(metrics.bookingWindowAvg.toFixed(1)),
      travelRhythmDays: Number(metrics.travelRhythmDays.toFixed(1)),
      preferredDepartureHour: metrics.preferredDepartureHour
        ? Number(metrics.preferredDepartureHour.toFixed(1))
        : null,
      loyalty: {
        tier: loyaltyTier.tier,
        balance: args.loyaltyBalance,
        nextTierDelta: loyaltyTier.delta,
      },
      searchSignal:
        searchRecencyHours === Infinity
          ? null
          : { lastQuery: `${lastSearch?.depart ?? "?"} → ${lastSearch?.arrivee ?? "?"}`, hoursAgo: Number(searchRecencyHours.toFixed(1)) },
      modelConfidence: learningConfidence,
    },
    behaviorProfile,
    nextBestActions,
    proactiveSuggestions,
    routeOutlook,
    integrations,
    conversation: {
      preferredLanguages: languages,
      tone: "Empathique proactif",
      emotionalContext: metrics.upcoming.length
        ? { label: "Anticipation positive", confidence: 0.72 }
        : { label: "Exploration calme", confidence: 0.54 },
      contextSummary:
        metrics.favoriteRoutes[0]
          ? `Focus sur ${metrics.favoriteRoutes[0].depart} → ${metrics.favoriteRoutes[0].arrivee}, cadence ${metrics.travelRhythmDays.toFixed(1)} j`
          : "Profil g\u00e9n\u00e9rique : collecte de signaux en cours",
    },
    timeline: {
      upcoming: metrics.upcoming.slice(0, 3).map((entry) => ({
        tripId: entry.trip?.id,
        depart: entry.trip?.point_depart,
        arrivee: entry.trip?.point_arrivee,
        departure: ensureDate(entry.trip?.heure_depart_prevue)?.toISOString() ?? null,
        statut: entry.trip?.statut ?? entry.reservation.statut,
      })),
      recent: metrics.past.slice(0, 3).map((entry) => ({
        tripId: entry.trip?.id,
        depart: entry.trip?.point_depart,
        arrivee: entry.trip?.point_arrivee,
        departure: ensureDate(entry.trip?.heure_depart_prevue)?.toISOString() ?? null,
        statut: entry.trip?.statut ?? entry.reservation.statut,
      })),
    },
  };
}



const createSegmentSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  filters: segmentFiltersSchema,
});

const createCampaignSchema = z.object({
  segment_id: z.string().uuid().optional(),
  title: z.string().min(3),
  body: z.string().min(5),
  channel: z.enum(["push", "email", "sms"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  scheduled_for: z.string().datetime().optional(),
});

const sendCampaignSchema = z.object({
  filters: segmentFiltersSchema,
  dryRun: z.boolean().optional(),
});

const feedbackSchema = z.object({
  category: z.string().max(64).optional(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

const surveySchema = z.object({
  title: z.string().min(3),
  description: z.string().max(500).optional(),
  questions: z
    .array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        type: z.string().default("text"),
        choices: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  active: z.boolean().optional(),
});

const surveyResponseSchema = z.object({
  answers: z.record(z.any()),
  sentiment_score: z.number().min(-1).max(1).optional(),
});

const supportTicketCreateSchema = z.object({
  subject: z.string().min(5),
  message: z.string().min(5),
  priority: z.enum(["low", "normal", "high"]).optional(),
  channel: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const supportTicketMessageSchema = z.object({
  message: z.string().min(2),
});

const supportTicketResolveSchema = z.object({
  resolution_summary: z.string().min(5),
  satisfaction_score: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  create_article: z.boolean().optional(),
  article_title: z.string().min(3).optional(),
  article_content: z.string().min(10).optional(),
});

const knowledgeArticleInputSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  tags: z.array(z.string()).optional(),
  source_ticket_id: z.string().uuid().optional(),
});

const assistantQuerySchema = z.object({
  question: z.string().min(5),
});

const assistantReplySchema = z.object({
  message: z.string().min(2),
  ticketId: z.string().uuid().optional(),
});

const notificationRuleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  criteria: z
    .object({
      filters: segmentFiltersSchema,
      context: z.record(z.any()).optional(),
      windowMinutes: z.number().int().positive().optional(),
    })
    .optional(),
  channels: z.array(z.enum(["push", "email", "sms"])).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  enabled: z.boolean().optional(),
});

const contextualNotificationSchema = z.object({
  title: z.string().min(3),
  message: z.string().min(3),
  channel: z.enum(["push", "email", "sms"]).optional(),
  category: z.string().optional(),
  context: z.record(z.any()).optional(),
  filters: segmentFiltersSchema,
  priority: z.enum(["low", "normal", "high"]).optional(),
  actions: z.array(notificationActionSchema).optional(),
  collaborators: z.array(z.string().uuid()).optional(),
  bypassPreferences: z.boolean().optional(),
  cohortSegmentId: z.string().uuid().optional(),
});

const ruleDispatchSchema = z.object({
  title: z.string().min(3),
  message: z.string().min(3),
  context: z.record(z.any()).optional(),
  actions: z.array(notificationActionSchema).optional(),
  bypassPreferences: z.boolean().optional(),
});

const notificationActionPayloadSchema = z.object({
  actionId: z.string().min(2),
  metadata: z.record(z.any()).optional(),
});

const digestRunSchema = z.object({
  before: z.string().datetime().optional(),
});

const delegationSchema = z.object({
  delegate_user_id: z.string().uuid(),
  end_at: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
});

const loyaltyTransferSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().int().positive(),
  note: z.string().max(255).optional(),
});

const badgeSchema = z.object({
  userId: z.string().uuid(),
  badge: z.string().min(3),
  description: z.string().optional(),
  awarded_for: z.string().optional(),
});

const missionAdjustmentSchema = z.object({
  userId: z.string().uuid(),
  delta: z.number().int(),
});

async function resolveUsersForFilters(filters?: SegmentFilters | null): Promise<TransportUser[]> {
  let effectiveFilters = filters;
  if (filters?.segmentId) {
    const segment = await storage.getNotificationSegment(filters.segmentId);
    if (segment?.filters) {
      effectiveFilters = {
        ...(segment.filters as SegmentFilters),
        ...filters,
        segmentId: filters.segmentId,
      };
    }
  }

  const allUsers = await storage.getAllUsers();
  if (!effectiveFilters) {
    return allUsers;
  }

  const locationFilter = effectiveFilters.location;
  const preferenceCache = new Map<string, Awaited<ReturnType<typeof storage.getNotificationPreferences>>>();

  const healthCache = new Map<string, number>();
  const ensureHealthScore = async (userId: string) => {
    if (healthCache.has(userId)) {
      return healthCache.get(userId)!;
    }
    const metrics = await storage.getUserHealth(userId);
    const score = metrics?.healthScore ?? 0;
    healthCache.set(userId, score);
    return score;
  };

  const results: TransportUser[] = [];
  for (const user of allUsers) {
    if (effectiveFilters.role && user.role !== effectiveFilters.role) {
      continue;
    }
    if (effectiveFilters.statut && user.statut !== effectiveFilters.statut) {
      continue;
    }
    if (typeof effectiveFilters.minHealthScore === "number") {
      const score = await ensureHealthScore(user.id);
      if (score < effectiveFilters.minHealthScore) {
        continue;
      }
    }

    if (locationFilter) {
      let prefs = preferenceCache.get(user.id);
      if (!prefs) {
        prefs = await storage.getNotificationPreferences(user.id);
        preferenceCache.set(user.id, prefs);
      }
      const lastLocation = (prefs.context_filters as any)?.location;
      if (!lastLocation || String(lastLocation).toLowerCase() !== locationFilter.toLowerCase()) {
        continue;
      }
    }
    results.push(user);
  }
  return results;
}

type NotificationDispatchPayload = {
  title: string;
  message: string;
  channel?: "push" | "email" | "sms";
  category?: string;
  type?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actions?: UserNotificationAction[];
};

type NotificationDispatchOptions = {
  priority?: "low" | "normal" | "high";
  bypassPreferences?: boolean;
  collaborators?: string[];
  visited?: Set<string>;
  sourceUserId?: string;
};

function parseQuietWindow(quietHours?: string | null) {
  if (!quietHours) return null;
  const [startRaw, endRaw] = quietHours.split("-");
  if (!startRaw || !endRaw) return null;
  const clean = (value: string) => value.replace(/[^\d:]/g, "");
  const parse = (value: string) => {
    const [h, m] = clean(value).split(":");
    return { hours: Number(h ?? 0), minutes: Number(m ?? 0) };
  };
  return { start: parse(startRaw), end: parse(endRaw) };
}

function computeNextDigestDate(quietHours?: string | null) {
  const now = new Date();
  const window = parseQuietWindow(quietHours);
  if (!window) {
    const fallback = new Date(now);
    fallback.setHours(fallback.getHours() + 1);
    return fallback;
  }
  const start = new Date(now);
  start.setHours(window.start.hours, window.start.minutes, 0, 0);
  const end = new Date(start);
  end.setHours(window.end.hours, window.end.minutes, 0, 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  if (now <= end) {
    return end;
  }
  end.setDate(end.getDate() + 1);
  return end;
}

async function dispatchNotificationToUser(
  userId: string,
  payload: NotificationDispatchPayload,
  options: NotificationDispatchOptions = {},
): Promise<{ notificationId?: string; queuedDigest?: boolean; skipped?: boolean; reason?: string }> {
  const visited = options.visited ?? new Set<string>();
  if (visited.has(userId)) {
    return { skipped: true, reason: "delegation_loop" };
  }
  visited.add(userId);

  const user = await storage.getUser(userId);
  if (!user) {
    return { skipped: true, reason: "user_not_found" };
  }

  // Respect simple profil-level notification toggles
  if (!options.bypassPreferences) {
    const category = payload.category ?? "";
    // Notifications par email d\u00e9sactiv\u00e9es
    if (payload.channel === "email" && user.notifications_email === false) {
      return { skipped: true, reason: "email_pref_disabled" };
    }
    // Notifications li\u00e9es aux r\u00e9servations
    if (category === "reservation" && user.notifications_reservations === false) {
      return { skipped: true, reason: "reservation_pref_disabled" };
    }
    // Alertes / urgences critiques
    if (category === "alert" && user.notifications_alertes === false) {
      return { skipped: true, reason: "alert_pref_disabled" };
    }
  }

  if (!options.bypassPreferences) {
    const delegation = await storage.getActiveDelegation(user.id);
    if (delegation) {
      return dispatchNotificationToUser(delegation.delegate_user_id, payload, {
        ...options,
        visited,
      });
    }
  }

  const priority = options.priority ?? "normal";
  const prefs = await storage.getNotificationPreferences(user.id);

  if (!options.bypassPreferences && prefs.vacation_mode && prefs.vacation_delegate_user_id) {
    return dispatchNotificationToUser(prefs.vacation_delegate_user_id, payload, {
      ...options,
      visited,
    });
  }

  const thresholdLevel = PRIORITY_LEVELS[prefs.priority_threshold as keyof typeof PRIORITY_LEVELS] ?? 1;
  if (!options.bypassPreferences && PRIORITY_LEVELS[priority] < thresholdLevel) {
    return { skipped: true, reason: "below_threshold" };
  }

  if (!options.bypassPreferences && prefs.quiet_mode && priority !== "high") {
    const digestEntry = {
      title: payload.title,
      message: payload.message,
      created_at: new Date().toISOString(),
      category: payload.category,
    };
    const existing = await storage.getOpenDigestForUser(user.id);
    if (existing) {
      const currentPayload = Array.isArray(existing.payload) ? existing.payload : [];
      currentPayload.push(digestEntry);
      await storage.updateNotificationDigestPayload(existing.id, currentPayload);
      return { queuedDigest: true };
    }
    await storage.queueNotificationDigest({
      user_id: user.id,
      scheduled_for: computeNextDigestDate(prefs.quiet_hours),
      payload: [digestEntry],
    });
    return { queuedDigest: true };
  }

  const notification = await storage.createNotification({
    user_id: user.id,
    title: payload.title,
    message: payload.message,
    channel: payload.channel ?? "push",
    priority,
    type: payload.type,
    category: payload.category,
    context: payload.context ?? {},
    metadata: {
      ...(payload.metadata ?? {}),
      sourceUserId: options.sourceUserId,
    },
    actions: payload.actions,
  });
  await storage.logNotificationEngagement({
    notification_id: notification.id,
    user_id: user.id,
    event: "delivered",
    metadata: payload.context,
  });

  if (options.collaborators?.length) {
    await storage.addNotificationCollaborators(notification.id, options.collaborators);
  }

  return { notificationId: notification.id };
}


export function registerRoutes(app: Express) {
  // ==================== AUTH ROUTES ====================
  
  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("🔐 Login attempt:", email);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("❌ User not found:", email);
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log("❌ Invalid password for:", email);
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      // Update last login
      await storage.updateUser(user.id, { last_login: new Date() });

      req.session.userId = user.id;
      console.log("✅ Login successful:", email, "session.userId:", req.session.userId);
      
      await storage.logUserActivity({
        user_id: user.id,
        event: "login",
        ip: req.ip,
        device: req.get("user-agent") || undefined,
        metadata: { provider: "local" },
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=google" }),
    async (req, res) => {
      if (req.user) {
        req.session.userId = req.user.id;
        await storage.logUserActivity({
          user_id: req.user.id,
          event: "login",
          ip: req.ip,
          device: req.get("user-agent") || undefined,
          metadata: { provider: "google" },
        });
      }
      res.redirect("/");
    }
  );

  // Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Cet email est déjà utilisé" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user with CLIENT role by default
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        role: data.role || "CLIENT",
        statut: "actif"
      });

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la déconnexion" });
      }
      if (userId) {
        void storage.logUserActivity({
          user_id: userId,
          event: "logout",
          ip: req.ip,
          device: req.get("user-agent") || undefined,
        });
      }
      res.json({ message: "Déconnexion réussie" });
    });
  });

  // ==================== PROFILE ROUTES ====================
  app.get("/api/profile", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    const { password, ...safe } = user;
    res.json(safe);
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const allowed = (({
        nom,
        prenom,
        telephone,
        adresse,
        photo_profil,
        langue_preferee,
        fuseau_horaire,
        notifications_email,
        notifications_reservations,
        notifications_alertes,
      }) => ({
        nom,
        prenom,
        telephone,
        adresse,
        photo_profil,
        langue_preferee,
        fuseau_horaire,
        notifications_email,
        notifications_reservations,
        notifications_alertes,
      }))(req.body);

      const clean: Record<string, any> = {};
      Object.entries(allowed).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === "string" || typeof value === "boolean") {
            clean[key] = value;
          }
        }
      });

      const current = await storage.getUser(req.session.userId!);
      if (!current) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      await storage.logProfileVersion(current.id, current);
      const updated = await storage.updateUser(current.id, clean);
      if (!updated) {
        return res.status(500).json({ error: "Impossible de mettre à jour" });
      }
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Changer le mot de passe
  app.post("/api/profile/change-password", requireAuth, async (req, res) => {
    try {
      const { ancien_mot_de_passe, nouveau_mot_de_passe, confirmation } = req.body;

      if (!ancien_mot_de_passe || !nouveau_mot_de_passe || !confirmation) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
      }

      if (nouveau_mot_de_passe !== confirmation) {
        return res.status(400).json({ error: "Les mots de passe ne correspondent pas" });
      }

      if (nouveau_mot_de_passe.length < 8) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const validPassword = await bcrypt.compare(ancien_mot_de_passe, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Mot de passe actuel incorrect" });
      }

      const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ success: true, message: "Mot de passe mis à jour avec succès" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Moyens de paiement
  app.get("/api/profile/payment-methods", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const methods = (user.moyens_paiement as any[]) || [];
      res.json(methods);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/profile/payment-methods", requireAuth, async (req, res) => {
    try {
      const { type, nom, derniersChiffres, estParDefaut } = req.body;

      if (!type || !nom) {
        return res.status(400).json({ error: "Type et nom sont requis" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const methods = (user.moyens_paiement as any[]) || [];
      const newMethod = {
        id: crypto.randomUUID(),
        type,
        nom,
        derniersChiffres,
        estParDefaut: estParDefaut || false,
      };

      if (estParDefaut) {
        methods.forEach((m) => (m.estParDefaut = false));
      }

      methods.push(newMethod);

      await storage.updateUser(user.id, { moyens_paiement: methods });
      res.json(newMethod);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/profile/payment-methods/:id", requireAuth, async (req, res) => {
    try {
      const paymentMethodId = req.params.id;
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const methods = ((user.moyens_paiement as any[]) || []).filter((m) => m.id !== paymentMethodId);
      await storage.updateUser(user.id, { moyens_paiement: methods });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Exporter les données personnelles (RGPD)
  app.get("/api/profile/export-data", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const { password, ...safe } = user;
      const exportData = {
        exportDate: new Date().toISOString(),
        profile: safe,
        // Ajouter d'autres données personnelles selon les besoins
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="donnees-personnelles-${new Date().toISOString().split("T")[0]}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Demander la suppression du compte
  app.post("/api/profile/request-deletion", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      // Marquer la demande de suppression
      await storage.updateUser(user.id, {
        donnees_suppression_demandee: new Date(),
      });

      // TODO: Envoyer un email de confirmation à l'utilisateur
      // TODO: Implémenter un processus de suppression après 30 jours

      res.json({
        success: true,
        message: "Demande de suppression enregistrée. Votre compte sera supprimé après 30 jours.",
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/profile/export", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    const { password, ...safe } = user;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="profil-${user.id}.json"`);
    res.send(JSON.stringify(safe, null, 2));
  });

  app.get("/api/profile/history", requireAuth, async (req, res) => {
    const versions = await storage.getProfileVersions(req.session.userId!, 10);
    res.json(versions);
  });

  // ==================== PERSONALISATION & ACCESSIBILIT\u00c9 ====================
  app.get("/api/personalization/state", requireAuth, async (req, res) => {
    try {
      const rawContext = typeof req.query.context === "string" ? req.query.context : undefined;
      const context =
        rawContext && ADAPTIVE_CONTEXTS.some((ctx) => ctx.id === rawContext) ? rawContext : detectAdaptiveContext(req);
      const userId = req.session.userId!;
      let profile = await storage.getPersonalizationState(userId, context);
      if (!profile) {
        profile = await storage.savePersonalizationState(userId, {
          context,
          profileName: resolveContextPreset(context).label,
        });
      }
      const accessibility = await storage.getAccessibilitySettings(userId);
      const brightnessParam = typeof req.query.brightness === "string" ? req.query.brightness : undefined;
      const theme = computeDynamicTheme({
        context,
        baseTheme: (profile.theme_config as Record<string, unknown>) ?? {},
        dynamic: profile.dynamic_theme ?? undefined,
        weather: typeof req.query.weather === "string" ? req.query.weather : undefined,
        brightness: brightnessParam ?? (accessibility.brightness_mode ?? undefined) ?? undefined,
        environment: typeof req.query.environment === "string" ? req.query.environment : undefined,
        hour: req.query.hour ? Number(req.query.hour) : undefined,
        presentation: Boolean(profile.presentation_mode || accessibility.presentation_mode),
        cognitive: Boolean(accessibility.cognitive_mode),
      });
      const suggestions = buildContextualSuggestions({
        context,
        profile,
        accessibility,
      });
      res.json({
        context,
        preset: resolveContextPreset(context),
        profile,
        layout: profile.layout_config ?? [],
        accessibility,
        theme,
        presentationMode: Boolean(profile.presentation_mode || accessibility.presentation_mode),
        cognitiveMode: Boolean(accessibility.cognitive_mode),
        dynamicTheme: profile.dynamic_theme ?? true,
        suggestions,
        availableContexts: ADAPTIVE_CONTEXTS,
        timestamp: new Date().toISOString(),
        cloud: {
          lastSync: profile.cloud_synced_at,
        },
      });
    } catch (error) {
      console.error("Personalization state error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/personalization/state", requireAuth, async (req, res) => {
    try {
      const payload = personalizationStateSchema.parse(req.body);
      const state = await storage.savePersonalizationState(req.session.userId!, {
        context: payload.context,
        mode: payload.mode,
        profileId: payload.profileId,
        profileName: payload.profileName,
        triggers: payload.triggers,
        layoutConfig: payload.layout,
        themeConfig: payload.theme,
        accessibilityConfig: payload.accessibility,
        presentationMode: payload.presentationMode,
        dynamicTheme: payload.dynamicTheme,
        metadata: payload.metadata,
        priority: payload.priority,
      });
      res.json(state);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/personalization/profiles", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getExperienceProfiles(req.session.userId!);
      res.json({
        profiles,
        availableContexts: ADAPTIVE_CONTEXTS,
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/personalization/profiles", requireAuth, async (req, res) => {
    try {
      const payload = experienceProfilePayloadSchema.parse(req.body);
      const profile = await storage.createExperienceProfile({
        ...payload,
        user_id: req.session.userId!,
      });
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.put("/api/personalization/profiles/:profileId", requireAuth, async (req, res) => {
    try {
      const payload = experienceProfileUpdateSchema.parse(req.body);
      const profile = await storage.updateExperienceProfile(req.params.profileId, req.session.userId!, payload);
      if (!profile) {
        return res.status(404).json({ error: "Profil introuvable" });
      }
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/accessibility/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAccessibilitySettings(req.session.userId!);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.put("/api/accessibility/settings", requireAuth, async (req, res) => {
    try {
      const raw = accessibilitySettingsUpdateSchema.parse(req.body);
      const normalizedLanguages = raw.translation_languages
        ? (Array.isArray(raw.translation_languages)
            ? raw.translation_languages
            : raw.translation_languages.split(","))
            .map((lang) => lang.trim())
            .filter(Boolean)
        : undefined;
      const sanitizedFontScale =
        typeof raw.font_scale === "number" ? Math.max(60, Math.min(200, Math.round(raw.font_scale))) : undefined;
      const payload: typeof raw & { translation_languages?: string[]; font_scale?: number } = {
        ...raw,
        translation_languages: normalizedLanguages,
        font_scale: sanitizedFontScale,
      };
      if (sanitizedFontScale === undefined) {
        delete payload.font_scale;
      }
      const settings = await storage.saveAccessibilitySettings(req.session.userId!, payload);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/accessibility/translate", requireAuth, (req, res) => {
    try {
      const payload = translationRequestSchema.parse(req.body);
      const translation = translateWithDictionary(payload.text, payload.sourceLanguage, payload.targetLanguage);
      res.json({
        sourceLanguage: translation.source,
        targetLanguage: translation.target,
        translatedText: translation.translatedText,
        confidence: translation.confidence,
        dictionaryHits: translation.hits,
        fallback: translation.hits === 0,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== IA AVANC\u00c9E ====================
  app.get("/api/ai/assistant", requireAuth, async (req, res) => {
    try {
      const user = req.user ?? (await storage.getUser(req.session.userId!));
      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }
      const [reservations, searchHistory, loyalty] = await Promise.all([
        storage.getReservationsByClient(user.id),
        storage.getSearchHistoryByUser(user.id, 25),
        storage.getLoyaltyBalance(user.id),
      ]);
      const tripIds = Array.from(new Set(reservations.map((reservation) => reservation.trip_id)));
      const trips = tripIds.length ? await storage.getTripsByIds(tripIds) : [];
      const tripMap = new Map(trips.map((trip) => [trip.id, trip]));
      const payload = buildAssistantResponse({
        user,
        reservations,
        searchHistory,
        loyaltyBalance: Number(loyalty.balance ?? 0),
        tripMap,
        headers: {
          userAgent: req.get("user-agent") ?? undefined,
          acceptLanguage: req.get("accept-language") ?? undefined,
        },
      });
      res.json(payload);
    } catch (error) {
      console.error("AI assistant error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/ai/predictive-insights", requireRole("ADMIN"), async (req, res) => {
    try {
      const requestedHorizon = typeof req.query.horizon === "string" ? Number(req.query.horizon) : undefined;
      const safeHorizon = Number.isFinite(requestedHorizon) ? Math.max(5, Math.min(14, requestedHorizon!)) : 7;
      const report = await computePredictiveAnalytics({ horizonDays: safeHorizon });
      res.json(report);
    } catch (error) {
      console.error("Predictive insights error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/optimization/recommendations", requireRole("ADMIN"), async (req, res) => {
    try {
      const statusQuery = typeof req.query.status === "string" ? req.query.status : undefined;
      const filters = {
        status: statusQuery ? statusQuery.split(",").map((status) => status.trim()).filter(Boolean) : undefined,
        route: typeof req.query.route === "string" ? req.query.route : undefined,
      };
      const horizonParam = typeof req.query.horizonDays === "string" ? Number(req.query.horizonDays) : undefined;
      const horizonDays = Number.isFinite(horizonParam) ? Math.max(3, Math.min(14, horizonParam)) : 7;

      const [ctx, storedRecommendations, rules] = await Promise.all([
        assembleOptimizationContext(horizonDays),
        storage.listOptimizationRecommendations(filters),
        storage.listOptimizationRules(),
      ]);

      const heatmap = buildHeatmapData(ctx);
      const kpis = computeBalanceKPIs(ctx);
      const suggestions = generateOperationalRecommendations(ctx, rules);

      res.json({
        horizonDays,
        heatmap,
        kpis,
        demandForecast: ctx.demandForecast,
        loadFactors: ctx.loadFactors,
        rules,
        suggestions,
        storedRecommendations,
      });
    } catch (error) {
      console.error("Optimization recommendations error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/optimization/simulate", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = optimizationSimulationSchema.parse(req.body);
      const horizon = payload.horizonDays ?? 7;
      const horizonDays = Math.max(3, Math.min(14, horizon));
      const [ctx, rules] = await Promise.all([
        assembleOptimizationContext(horizonDays),
        storage.listOptimizationRules(),
      ]);
      const effectiveRules = applyOptimizationRuleOverrides(rules, payload.overrides);
      const suggestions = generateOperationalRecommendations(ctx, effectiveRules);
      const heatmap = buildHeatmapData(ctx);
      const kpis = computeBalanceKPIs(ctx);

      res.json({
        horizonDays,
        suggestions,
        heatmap,
        kpis,
        demandForecast: ctx.demandForecast,
        loadFactors: ctx.loadFactors,
        rules: effectiveRules,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      console.error("Optimization simulation error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/optimization/apply", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = optimizationRuleSaveSchema.parse(req.body);
      const savedRules = [];
      for (const ruleInput of payload.rules) {
        const { id, ...rest } = ruleInput;
        if (id) {
          const updated = await storage.updateOptimizationRule(id, rest);
          if (updated) {
            savedRules.push(updated);
            continue;
          }
        }
        const created = await storage.createOptimizationRule(rest);
        savedRules.push(created);
      }
      res.json({ rules: savedRules });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      console.error("Optimization orchestration save error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/optimization/recommendations/:id/status", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = recommendationStatusSchema.parse(req.body);
      const updated = await storage.updateOptimizationRecommendation(req.params.id, {
        status: payload.status,
        priority: payload.priority,
        metadata: payload.comment ? { comment: payload.comment, updatedBy: req.user?.id } : undefined,
      });
      if (!updated) {
        return res.status(404).json({ error: "Recommandation introuvable" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      console.error("Update recommendation error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/optimization/run", requireRole("ADMIN"), async (req, res) => {
    try {
      const horizon = typeof req.body?.horizonDays === "number" ? req.body.horizonDays : undefined;
      const report = await runResourceOptimizationCycle({ horizonDays: horizon });
      res.json(report);
    } catch (error) {
      console.error("Manual optimization run failed", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== NOTIFICATION CENTER ====================
  app.get("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await storage.getNotificationPreferences(req.session.userId!);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.put("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const payload = notificationPreferenceSchema.parse(req.body);
      const normalized = {
        ...payload,
        quiet_hours: payload.quiet_hours ?? null,
        vacation_delegate_user_id: payload.vacation_delegate_user_id ?? null,
        vacation_until: payload.vacation_until ? new Date(payload.vacation_until) : null,
      };
      const prefs = await storage.saveNotificationPreferences(req.session.userId!, normalized);
      res.json(prefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const includeRead = req.query.includeRead === "true";
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const notifications = await storage.listNotifications(req.session.userId!, { includeRead, limit });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const updated = await storage.markNotificationRead(req.params.id, req.session.userId!);
      if (!updated) {
        return res.status(404).json({ error: "Notification introuvable" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/notifications/:id/action", requireAuth, async (req, res) => {
    try {
      const payload = notificationActionPayloadSchema.parse(req.body);
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification introuvable" });
      }
      const userId = req.session.userId!;
      if (notification.user_id !== userId) {
        const collaborators = await storage.getNotificationCollaborators(notification.id);
        const allowed = collaborators.some((collab) => collab.collaborator_user_id === userId);
        if (!allowed) {
          return res.status(403).json({ error: "Accès interdit" });
        }
      }

      await storage.markNotificationRead(notification.id, userId);
      const newMetadata = {
        ...(notification.metadata ?? {}),
        lastAction: payload.actionId,
        lastActionMeta: payload.metadata,
      };
      await storage.updateNotification(notification.id, {
        metadata: newMetadata,
        action_taken_at: new Date(),
      });
      await storage.logNotificationEngagement({
        notification_id: notification.id,
        user_id: userId,
        event: "action",
        metadata: {
          actionId: payload.actionId,
          payload: payload.metadata,
        },
      });
      res.json({ status: "ok" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/notifications/delegations", requireAuth, async (req, res) => {
    try {
      const payload = delegationSchema.parse(req.body);
      const record = await storage.upsertNotificationDelegation({
        user_id: req.session.userId!,
        delegate_user_id: payload.delegate_user_id,
        end_at: payload.end_at ? new Date(payload.end_at) : undefined,
        active: payload.active ?? true,
      });
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/users/:userId/health", requireRole("ADMIN"), async (req, res) => {
    const metrics = await storage.getUserHealth(req.params.userId);
    if (!metrics) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    res.json(metrics);
  });

  app.post("/api/share/preview", requireAuth, (req, res) => {
    const { title, description, imageUrl, targetUrl } = req.body;
    const safeTitle = sanitizeMetaInput(title);
    const safeDescription = sanitizeMetaInput(description);
    const safeImage = sanitizeMetaInput(imageUrl);
    const safeUrl = sanitizeMetaInput(targetUrl || "https://transportpro.local/share");

    const tags = [
      `<meta property="og:title" content="${safeTitle || "TransportPro"}" />`,
      `<meta property="og:description" content="${safeDescription || "Réservez votre prochain trajet"}" />`,
      `<meta property="og:image" content="${safeImage || "https://transportpro.local/cover.png"}" />`,
      `<meta property="og:url" content="${safeUrl}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ].join("\n");

    res.json({ tags, title: safeTitle, description: safeDescription, imageUrl: safeImage, targetUrl: safeUrl });
  });

  // ==================== NOTIFICATION RULES / CONTEXTUAL ENGINE ====================
  app.get("/api/admin/notification-rules", requireRole("ADMIN"), async (_req, res) => {
    try {
      const rules = await storage.listNotificationRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/notification-rules", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = notificationRuleSchema.parse(req.body);
      const rule = await storage.createNotificationRule({
        name: payload.name,
        description: payload.description,
        criteria: payload.criteria ?? {},
        channels: payload.channels ?? ["push"],
        priority: payload.priority ?? "normal",
        enabled: payload.enabled ?? true,
        created_by: req.session.userId!,
      });
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/notification-rules/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = notificationRuleSchema.partial().parse(req.body);
      const updated = await storage.updateNotificationRule(req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ error: "Règle introuvable" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/notification-rules/:id/test", requireRole("ADMIN"), async (req, res) => {
    try {
      const rule = await storage.getNotificationRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Règle introuvable" });
      }
      const filters = (rule.criteria as any)?.filters as SegmentFilters | undefined;
      const recipients = await resolveUsersForFilters(filters);
      res.json({
        total: recipients.length,
        sample: recipients.slice(0, 25).map((user) => ({ id: user.id, email: user.email, role: user.role })),
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/notification-rules/:id/dispatch", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = ruleDispatchSchema.parse(req.body);
      const rule = await storage.getNotificationRule(req.params.id);
      if (!rule) {
        return res.status(404).json({ error: "Règle introuvable" });
      }
      const filters = (rule.criteria as any)?.filters as SegmentFilters | undefined;
      const recipients = await resolveUsersForFilters(filters);
      const dispatchPriority = (rule.priority ?? "normal") as "low" | "normal" | "high";
      const results = await Promise.all(
        recipients.map((user) =>
          dispatchNotificationToUser(
            user.id,
            {
              title: payload.title,
              message: payload.message,
              context: payload.context,
              actions: payload.actions,
              category: "rule",
            },
            {
              priority: dispatchPriority,
              bypassPreferences: payload.bypassPreferences,
              sourceUserId: req.session.userId!,
            },
          ),
        ),
      );
      const summary = results.reduce(
        (acc, result) => {
          if (result.notificationId) acc.delivered += 1;
          if (result.queuedDigest) acc.digest += 1;
          if (result.skipped) acc.skipped += 1;
          return acc;
        },
        { delivered: 0, digest: 0, skipped: 0 },
      );
      await storage.logNotificationRule({
        rule_id: rule.id,
        event: "dispatch",
        payload: payload.context ?? {},
        result: summary,
      });
      res.json({ recipients: recipients.length, ...summary });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/notifications/contextual", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = contextualNotificationSchema.parse(req.body);
      let mergedFilters: SegmentFilters | undefined = payload.filters
        ? { ...(payload.filters as SegmentFilters) }
        : undefined;
      if (payload.cohortSegmentId) {
        if (mergedFilters) {
          mergedFilters.segmentId = payload.cohortSegmentId;
        } else {
          mergedFilters = { segmentId: payload.cohortSegmentId };
        }
      }
      const recipients = await resolveUsersForFilters(mergedFilters);
      const contextualPriority = (payload.priority ?? "normal") as "low" | "normal" | "high";
      const results = await Promise.all(
        recipients.map((user) =>
          dispatchNotificationToUser(
            user.id,
            {
              title: payload.title,
              message: payload.message,
              context: payload.context,
              actions: payload.actions,
              category: payload.category ?? "contextual",
              channel: payload.channel,
            },
            {
              priority: contextualPriority,
              bypassPreferences: payload.bypassPreferences,
              collaborators: payload.collaborators,
              sourceUserId: req.session.userId!,
            },
          ),
        ),
      );
      const summary = results.reduce(
        (acc, result) => {
          if (result.notificationId) acc.delivered += 1;
          if (result.queuedDigest) acc.digest += 1;
          if (result.skipped) acc.skipped += 1;
          return acc;
        },
        { delivered: 0, digest: 0, skipped: 0 },
      );
      res.json({ recipients: recipients.length, ...summary });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/notifications/analytics", requireRole("ADMIN"), async (req, res) => {
    try {
      const days = req.query.days ? Number(req.query.days) : 7;
      const stats = await storage.getNotificationEngagementStats(days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/notifications/digests/run", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = digestRunSchema.parse(req.body ?? {});
      const before = payload.before ? new Date(payload.before) : new Date();
      const digests = await storage.listPendingDigests(before);
      for (const digest of digests) {
        const entries = Array.isArray(digest.payload) ? digest.payload : [];
        const message =
          entries
            .map((entry: any, index: number) => `${index + 1}. ${entry.title ?? "Notification"}`)
            .join("\n") || "Aucune notification durant cette période.";
        await dispatchNotificationToUser(
          digest.user_id,
          {
            title: `Résumé quotidien (${entries.length})`,
            message,
            category: "digest",
          },
          { bypassPreferences: true },
        );
        await storage.markDigestSent(digest.id);
      }
      res.json({ processed: digests.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== SUPPORT CENTER / KNOWLEDGE ====================
  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const payload = supportTicketCreateSchema.parse(req.body);
      const ticket = await storage.createSupportTicket({
        user_id: req.session.userId!,
        subject: payload.subject,
        priority: payload.priority ?? "normal",
        channel: payload.channel ?? "in_app",
        metadata: payload.metadata ?? {},
      });
      await storage.addTicketMessage({
        ticket_id: ticket.id,
        sender_id: req.session.userId!,
        role: "user",
        message: payload.message,
      });
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const current = req.user ?? (await storage.getUser(req.session.userId!));
      if (!current) {
        return res.status(401).json({ error: "Session invalide" });
      }
      const isAdmin = isAdminRole(current.role);
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const tickets = await storage.listSupportTickets({
        userId: isAdmin ? undefined : current.id,
        status,
        limit,
      });
      disableCache(res);
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/support/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket introuvable" });
      }
      const current = req.user ?? (await storage.getUser(req.session.userId!));
      if (!current) {
        return res.status(401).json({ error: "Session invalide" });
      }
      const isAdmin = isAdminRole(current.role);
      if (!isAdmin && ticket.user_id !== current.id) {
        return res.status(403).json({ error: "Accès interdit" });
      }
      const messages = await storage.listTicketMessages(ticket.id);
      disableCache(res);
      res.json({ ticket, messages });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/support/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket introuvable" });
      }
      const payload = supportTicketMessageSchema.parse(req.body);
      const current = req.user ?? (await storage.getUser(req.session.userId!));
      if (!current) {
        return res.status(401).json({ error: "Session invalide" });
      }
      const isAdmin = isAdminRole(current.role);
      if (!isAdmin && ticket.user_id !== current.id) {
        return res.status(403).json({ error: "Accès interdit" });
      }
      const message = await storage.addTicketMessage({
        ticket_id: ticket.id,
        sender_id: current.id,
        role: isAdmin ? "agent" : "user",
        message: payload.message,
      });
      await storage.updateSupportTicket(ticket.id, { statut: isAdmin ? "pending" : "open" });
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/support/tickets/:id/resolve", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = supportTicketResolveSchema.parse(req.body);
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket introuvable" });
      }
      await storage.updateSupportTicket(ticket.id, {
        statut: "resolved",
        satisfaction_score: payload.satisfaction_score ?? ticket.satisfaction_score,
        resolution_summary: payload.resolution_summary,
        resolved_at: new Date(),
      });
      await storage.addTicketMessage({
        ticket_id: ticket.id,
        sender_id: req.session.userId!,
        role: "agent",
        message: payload.resolution_summary,
      });

      if (payload.create_article) {
        await storage.createKnowledgeArticle({
          title: payload.article_title ?? `Résolution: ${ticket.subject}`,
          content: payload.article_content ?? payload.resolution_summary,
          tags: payload.tags ?? [],
          source: "ticket",
          ticket_id: ticket.id,
        });
      }

      res.json({ status: "resolved" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/support/knowledge", requireAuth, async (req, res) => {
    try {
      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const articles = await storage.listKnowledgeArticles({ search, limit: 30 });
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/support/knowledge", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = knowledgeArticleInputSchema.parse(req.body);
      const article = await storage.createKnowledgeArticle({
        title: payload.title,
        content: payload.content,
        tags: payload.tags ?? [],
        source: payload.source_ticket_id ? "ticket" : "manual",
        ticket_id: payload.source_ticket_id,
      });
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/support/knowledge/:id/helpful", requireAuth, async (req, res) => {
    try {
      await storage.incrementKnowledgeHelpful(req.params.id);
      res.json({ status: "merci" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/support/assistant", requireAuth, async (req, res) => {
    try {
      const payload = assistantQuerySchema.parse(req.body);
      const articles = await storage.listKnowledgeArticles({ search: payload.question, limit: 3 });
      let answer: string;
      if (articles.length > 0) {
        const [top] = articles;
        const snippet = top.content.length > 280 ? `${top.content.slice(0, 280)}...` : top.content;
        answer = `Voici ce que j'ai trouvé dans notre base de connaissances : ${snippet}`;
      } else {
        answer =
          "Je n'ai pas trouvé de réponse automatique. Un agent prendra contact prochainement, ou vous pouvez créer un ticket.";
      }
      res.json({
        answer,
        sources: articles.map((article) => ({
          id: article.id,
          title: article.title,
          helpful_count: article.helpful_count,
        })),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Question invalide", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/support/assistant-reply", requireAuth, async (req, res) => {
    try {
      const payload = assistantReplySchema.parse(req.body);
      const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3.2",
          prompt: `Tu es le dispatch d'une société de transport. Réponds brièvement, professionnellement. Message: ${payload.message}`,
          stream: false,
        }),
      });

      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        return res.status(502).json({ error: "Ollama indisponible", details: errorText });
      }

      const data = await ollamaResponse.json();
      const reply =
        (typeof data.response === "string" && data.response.trim()) ||
        (typeof data.message === "string" && data.message.trim()) ||
        "";

      if (payload.ticketId && reply) {
        await storage.addTicketMessage({
          ticket_id: payload.ticketId,
          sender_id: null,
          role: "assistant",
          message: reply,
        });
        await storage.updateSupportTicket(payload.ticketId, { statut: "pending" });
      }

      res.json({ reply });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Message invalide", details: error.errors });
      }
      console.error("assistant-reply error", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== ADMIN COMMUNICATION ====================
  app.get("/api/admin/segments", requireRole("ADMIN"), async (_req, res) => {
    try {
      const segments = await storage.listNotificationSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/segments", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = createSegmentSchema.parse(req.body);
      const segment = await storage.createNotificationSegment({
        name: payload.name,
        description: payload.description,
        filters: payload.filters ?? {},
      });
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/campaigns", requireRole("ADMIN"), async (_req, res) => {
    try {
      const campaigns = await storage.listNotificationCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/campaigns", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = createCampaignSchema.parse(req.body);
      if (payload.segment_id) {
        const segment = await storage.getNotificationSegment(payload.segment_id);
        if (!segment) {
          return res.status(404).json({ error: "Segment introuvable" });
        }
      }
      const campaign = await storage.createNotificationCampaign({
        segment_id: payload.segment_id,
        title: payload.title,
        body: payload.body,
        channel: payload.channel,
        priority: payload.priority,
        status: payload.scheduled_for ? "scheduled" : "draft",
        scheduled_for: payload.scheduled_for ? new Date(payload.scheduled_for) : null,
      });
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/campaigns/:id/send", requireRole("ADMIN"), async (req, res) => {
    try {
      const campaign = await storage.getNotificationCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campagne introuvable" });
      }
      const payload = sendCampaignSchema.parse(req.body ?? {});
      let filters = payload.filters ?? null;
      if (!filters && campaign.segment_id) {
        const segment = await storage.getNotificationSegment(campaign.segment_id);
        filters = (segment?.filters as SegmentFilters | undefined) ?? null;
      }
      const recipients = await resolveUsersForFilters(filters);
      if (payload.dryRun) {
        return res.json({
          dryRun: true,
          recipients: recipients.map((user) => ({ id: user.id, email: user.email })),
          total: recipients.length,
        });
      }
      if (recipients.length === 0) {
        return res.json({ sent: 0, message: "Aucun utilisateur cible" });
      }
      await Promise.all(
        recipients.map((user) =>
          storage.createNotification({
            user_id: user.id,
            title: campaign.title,
            message: campaign.body,
            channel: campaign.channel ?? "push",
            priority: campaign.priority ?? "normal",
            metadata: { campaignId: campaign.id },
          }),
        ),
      );
      await storage.updateNotificationCampaignStatus(campaign.id, "sent");
      res.json({ sent: recipients.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== FEEDBACK & SURVEYS ====================
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const payload = feedbackSchema.parse(req.body);
      const entry = await storage.createFeedback({
        ...payload,
        user_id: req.session.userId!,
      });
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/feedback", requireRole("ADMIN"), async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const entries = await storage.listFeedback(limit);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/surveys", requireAuth, async (_req, res) => {
    try {
      const surveys = await storage.listSurveys(true);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/surveys", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = surveySchema.parse(req.body);
      const survey = await storage.createSurvey({
        title: payload.title,
        description: payload.description,
        questions: payload.questions ?? [],
        active: payload.active ?? true,
      });
      res.status(201).json(survey);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/surveys/:id/responses", requireAuth, async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey || survey.active === false) {
        return res.status(404).json({ error: "Sondage introuvable" });
      }
      const payload = surveyResponseSchema.parse(req.body);
      const response = await storage.saveSurveyResponse({
        survey_id: survey.id,
        user_id: req.session.userId!,
        answers: payload.answers,
        sentiment_score: payload.sentiment_score !== undefined ? payload.sentiment_score.toString() : undefined,
      });
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/surveys/:id/responses", requireRole("ADMIN"), async (req, res) => {
    try {
      const responses = await storage.getSurveyResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== USER ROUTES ====================
  
  // Get all users (admin only)
  app.get("/api/users", requireRole("ADMIN"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/users/:id/maintenance", requireRole("ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      const { until, reason } = req.body;
      const user = await storage.updateUser(id, {
        maintenance_until: until ? new Date(until) : null,
        maintenance_reason: reason,
        statut: until ? "maintenance" : "actif",
      });
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      res.json({ message: until ? "Compte en maintenance" : "Maintenance désactivée" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Update user
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = await storage.getUser(req.session.userId!);
      
      // Only admin or the user themselves can update
      if (!isAdminRole(currentUser?.role) && currentUser?.id !== id) {
        return res.status(403).json({ error: "Accès interdit" });
      }

      const updates = req.body;
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "Utilisateur supprimé" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== VEHICLE ROUTES ====================
  
  // Get all vehicles
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get vehicle by ID
  app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Véhicule non trouvé" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Create vehicle (admin only)
  app.post("/api/vehicles", requireRole("ADMIN"), async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.status(201).json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Update vehicle (admin only)
  app.patch("/api/vehicles/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      const vehicle = await storage.updateVehicle(req.params.id, req.body);
      if (!vehicle) {
        return res.status(404).json({ error: "Véhicule non trouvé" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Delete vehicle (admin only)
  app.delete("/api/vehicles/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      await storage.deleteVehicle(req.params.id);
      res.json({ message: "Véhicule supprimé" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== TRIP ROUTES ====================

  const tripCategorySchema = z.enum(["scolaire", "medical", "prive", "livraison", "autre"]);
  /**
   * Admin-facing statut "métier" du trajet.
   * Ces valeurs décrivent le workflow d'affectation chauffeur, distinct du champ `statut`
   * utilisé pour l'état opérationnel (planifie | en_cours | termine | annule).
   *
   * waiting_chauffeur_confirmation  -> client payé, mission en attente de validation chauffeur
   * confirmed                       -> chauffeur a accepté la mission
   * to_reassign                     -> chauffeur a refusé, le dispatch doit réassigner
   * completed                       -> mission terminée
   */
  const tripStatusSchema = z.enum([
    "waiting_chauffeur_confirmation",
    "confirmed",
    "to_reassign",
    "completed",
  ]);

  const adminTripPayloadBaseSchema = z.object({
    chauffeur_id: z.string().uuid(),
    vehicle_id: z.string().uuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    start_location: z.string().min(1),
    end_location: z.string().min(1),
    category: tripCategorySchema,
    status: tripStatusSchema,
    notes: z.string().max(2000).optional(),
    prix: z.union([z.string(), z.number()]).optional(),
    places_disponibles: z.number().int().positive().optional(),
    distance_km: z.number().int().nonnegative().optional(),
  });

  const adminTripCreateSchema = adminTripPayloadBaseSchema;
  const adminTripUpdateSchema = adminTripPayloadBaseSchema.partial();

  const mapAdminStatusToTripStatut = (status: z.infer<typeof tripStatusSchema>): string => {
    switch (status) {
      case "completed":
        return "termine";
      case "confirmed":
        // Mission confirmée par le chauffeur : on la considère comme en cours
        return "en_cours";
      case "waiting_chauffeur_confirmation":
      case "to_reassign":
      default:
        // Missions à confirmer ou à réassigner restent dans les trajets planifiés
        return "planifie";
    }
  };

  const buildInsertTripFromAdminPayload = (payload: z.infer<typeof adminTripCreateSchema>): InsertTrip => {
    const departure = new Date(`${payload.date}T${payload.start_time}:00`);
    const arrival = new Date(`${payload.date}T${payload.end_time}:00`);

    const base: InsertTrip = {
      point_depart: payload.start_location,
      point_arrivee: payload.end_location,
      heure_depart_prevue: departure,
      heure_arrivee_prevue: arrival,
      prix: payload.prix !== undefined ? String(payload.prix) : "0",
      chauffeur_id: payload.chauffeur_id,
      vehicle_id: payload.vehicle_id,
      statut: mapAdminStatusToTripStatut(payload.status),
      places_disponibles: payload.places_disponibles ?? 4,
      distance_km: payload.distance_km ?? 0,
      trip_date: payload.date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      start_location: payload.start_location,
      end_location: payload.end_location,
      category: payload.category,
      status: payload.status,
      notes: payload.notes,
    };

    return base;
  };
  
  // Admin trip management
  app.get("/api/admin/trips", requireRole("ADMIN"), async (req, res) => {
    try {
      const { chauffeurId, date, status } = req.query;

      const filters = {
        chauffeurId: (chauffeurId as string) || undefined,
        status: (status as string) || undefined,
        date: date ? new Date(date as string) : undefined,
      };

      const trips = await storage.searchAdminTrips(filters);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/trips/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trajet non trouv\u00e9" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/trips", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = adminTripCreateSchema.parse(req.body);
      const insertTrip = buildInsertTripFromAdminPayload(payload);
      const trip = await storage.createTrip(insertTrip);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/trips/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = adminTripUpdateSchema.parse(req.body);
      const existing = await storage.getTrip(req.params.id);

      if (!existing) {
        return res.status(404).json({ error: "Trajet non trouv\u00e9" });
      }

      const patch: Partial<InsertTrip> = {};

      if (payload.chauffeur_id !== undefined) {
        patch.chauffeur_id = payload.chauffeur_id;
      }
      if (payload.vehicle_id !== undefined) {
        patch.vehicle_id = payload.vehicle_id;
      }
      if (payload.start_location !== undefined) {
        patch.point_depart = payload.start_location;
        patch.start_location = payload.start_location;
      }
      if (payload.end_location !== undefined) {
        patch.point_arrivee = payload.end_location;
        patch.end_location = payload.end_location;
      }
      if (payload.category !== undefined) {
        patch.category = payload.category;
      }
      if (payload.status !== undefined) {
        patch.status = payload.status;
        patch.statut = mapAdminStatusToTripStatut(payload.status);
      }
      if (payload.notes !== undefined) {
        patch.notes = payload.notes;
      }
      if (payload.prix !== undefined) {
        patch.prix = String(payload.prix);
      }
      if (payload.places_disponibles !== undefined) {
        patch.places_disponibles = payload.places_disponibles;
      }
      if (payload.distance_km !== undefined) {
        patch.distance_km = payload.distance_km;
      }

      if (payload.date !== undefined || payload.start_time !== undefined || payload.end_time !== undefined) {
        const currentDate =
          payload.date ||
          new Date(existing.heure_depart_prevue!).toISOString().slice(0, 10);

        const existingStartTime =
          existing.start_time ||
          (existing.heure_depart_prevue ? new Date(existing.heure_depart_prevue).toISOString().slice(11, 16) : "08:00");
        const existingEndTime =
          existing.end_time ||
          (existing.heure_arrivee_prevue ? new Date(existing.heure_arrivee_prevue).toISOString().slice(11, 16) : "09:00");

        const startTime = payload.start_time || existingStartTime;
        const endTime = payload.end_time || existingEndTime;

        patch.trip_date = currentDate as any;
        patch.start_time = startTime as any;
        patch.end_time = endTime as any;
        patch.heure_depart_prevue = new Date(`${currentDate}T${startTime}:00`);
        patch.heure_arrivee_prevue = new Date(`${currentDate}T${endTime}:00`);
      }

      const updated = await storage.updateTrip(req.params.id, patch);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Donn\u00e9es invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/admin/trips/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      await storage.deleteTrip(req.params.id);
      res.json({ message: "Trajet supprim\u00e9" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Search/Get all trips
  app.get("/api/trips", async (req, res) => {
    try {
      const { depart, arrivee, date } = req.query;
      
      const trips = await storage.searchTrips({
        depart: depart as string | undefined,
        arrivee: arrivee as string | undefined,
        date: date ? new Date(date as string) : undefined
      });
      // log searches (don't block response)
      const requestedDate = date ? new Date(date as string) : undefined;
      const userId = req.session.userId;
      const logPayload = insertSearchLogSchema.safeParse({
        user_id: userId,
        depart,
        arrivee,
        trajet_date: requestedDate,
        resultat_compte: trips.length,
        source: "web",
      });
      if (logPayload.success) {
        void storage.logSearch(logPayload.data);
      }

      res.json(trips);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/search/nlp", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) {
        return res.status(400).json({ error: "Requête vide" });
      }

      const lower = q.toLowerCase();
      const cityPattern = /de\s+([a-zàâçéèêëîïôûùüÿñ\- ]+)\s+(?:à|vers)\s+([a-zàâçéèêëîïôûùüÿñ\- ]+)/;
      const datePattern = /(aujourd'hui|demain|après[- ]demain|\d{1,2}\s+\w+)/;

      let depart: string | undefined;
      let arrivee: string | undefined;
      let date: Date | undefined;

      const cityMatch = lower.match(cityPattern);
      if (cityMatch) {
        depart = capitalize(cityMatch[1]);
        arrivee = capitalize(cityMatch[2]);
      }

      const dateMatch = lower.match(datePattern);
      if (dateMatch) {
        const token = dateMatch[1];
        const today = new Date();
        if (token === "aujourd'hui") {
          date = today;
        } else if (token === "demain") {
          date = new Date(today);
          date.setDate(today.getDate() + 1);
        } else if (token.startsWith("après")) {
          date = new Date(today);
          date.setDate(today.getDate() + 2);
        } else {
          // try parse dd month
          date = new Date(`${token} ${today.getFullYear()}`);
        }
      }

      const trips = await storage.searchTrips({ depart, arrivee, date });
      res.json({
        query: q,
        detected: {
          depart,
          arrivee,
          date: date?.toISOString(),
        },
        results: trips,
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur NLP" });
    }
  });

  // Get trip by ID
  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Trajet non trouvé" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get trips by chauffeur
  app.get("/api/chauffeur/trips", requireRole("CHAUFFEUR", "ADMIN"), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Session invalide" });
      }
      // Montrer les trajets assignés + les trajets disponibles (chauffeur non encore affecté)
      const trips = await storage.searchAdminTrips({ chauffeurId: user.id, includeUnassigned: true });
      res.json(trips);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Chauffeur calendar (grouped view)
  app.get("/api/chauffeur/calendar", requireRole("CHAUFFEUR", "ADMIN"), async (req, res) => {
    try {
      const chauffeurId = req.user!.id;
      const trips = await storage.searchAdminTrips({ chauffeurId, includeUnassigned: true });
      const now = new Date();

      const byDate: Record<string, Trip[]> = {};
      let upcoming = 0;
      let completed = 0;

      for (const trip of trips) {
        const departure = new Date(trip.heure_depart_prevue);
        const key = departure.toISOString().slice(0, 10);
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(trip);

        if (trip.statut === "termine" || departure < now) {
          completed += 1;
        } else {
          upcoming += 1;
        }
      }

      res.json({
        trips,
        byDate,
        counts: {
          total: trips.length,
          upcoming,
          completed,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Create trip (admin only)
  app.post("/api/trips", requireRole("ADMIN"), async (req, res) => {
    try {
      const data = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(data);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Update trip
  app.patch("/api/trips/:id", requireRole("ADMIN", "CHAUFFEUR"), async (req, res) => {
    try {
      const patch = { ...(req.body as Partial<InsertTrip>) };

      // Normaliser le workflow chauffeur côté serveur
      const rawStatus = (patch as any).status as string | undefined;
      if (rawStatus === "to_reassign") {
        (patch as any).status = "to_reassign";
        (patch as any).chauffeur_id = null;
        if (!patch.statut) {
          patch.statut = "planifie" as any;
        }
      } else if (rawStatus === "confirmed") {
        (patch as any).status = "confirmed";
        if (!patch.statut) {
          patch.statut = "en_cours" as any;
        }
      } else if (rawStatus === "waiting_chauffeur_confirmation") {
        (patch as any).status = "waiting_chauffeur_confirmation";
        if (!patch.statut) {
          patch.statut = "planifie" as any;
        }
      }

      const trip = await storage.updateTrip(req.params.id, patch);
      if (!trip) {
        return res.status(404).json({ error: "Trajet non trouvé" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Delete trip (admin only)
  app.delete("/api/trips/:id", requireRole("ADMIN"), async (req, res) => {
    try {
      await storage.deleteTrip(req.params.id);
      res.json({ message: "Trajet supprimé" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== RESERVATION ROUTES ====================
  
  // Get reservations for current user
  app.get("/api/reservations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (isAdminRole(user?.role)) {
        // Admin gets all reservations - we'll implement this if needed
        return res.json([]);
      }
      
      const reservations = await storage.getReservationsByClient(user!.id);

      // Attach a short HMAC token for QR generation for each reservation (no DB changes)
      const secret = process.env.SESSION_SECRET || "dev-secret";
      const enriched = reservations.map((r) => {
        try {
          const token = crypto.createHmac("sha256", secret).update(r.id).digest("hex").slice(0, 32);
          return {
            ...r,
            qr: { text: JSON.stringify({ reservationId: r.id, token }) },
          };
        } catch (err) {
          return r;
        }
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get single reservation (owner or admin)
  app.get("/api/reservations/:id", requireAuth, async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) return res.status(404).json({ error: "Réservation non trouvée" });

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Non authentifié" });

      if (reservation.client_id !== user.id && !isAdminRole(user.role)) {
        return res.status(403).json({ error: "Accès interdit" });
      }

      res.json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Get reservations for a specific trip
  app.get("/api/trips/:tripId/reservations", requireRole("ADMIN", "CHAUFFEUR"), async (req, res) => {
    try {
      const reservations = await storage.getReservationsByTrip(req.params.tripId);
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Create reservation
  app.post("/api/reservations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const data = insertReservationSchema.parse({
        ...req.body,
        client_id: user!.id,
        // Toute nouvelle réservation démarre en attente de paiement.
        // Le passage à "paid" déclenchera ensuite l'affectation chauffeur.
        statut: "pending_payment",
      });

      // Check if trip has enough places
      const trip = await storage.getTrip(data.trip_id);
      if (!trip) {
        return res.status(404).json({ error: "Trajet non trouvé" });
      }
      
      if (trip.places_disponibles < data.nombre_places) {
        return res.status(400).json({ error: "Pas assez de places disponibles" });
      }

      const reservation = await storage.createReservation(data);

      // Generate a simple HMAC-based token for QR validation (no DB schema changes)
      const secret = process.env.SESSION_SECRET || "dev-secret";
      const hmac = crypto.createHmac("sha256", secret).update(reservation.id).digest("hex");
      const token = hmac.slice(0, 32);

      // Include a qr object in the response so the client can render a QR code
      const reservationWithQr = {
        ...reservation,
        qr: {
          // The client will encode this text into a QR code. It contains reservation id and token.
          text: JSON.stringify({ reservationId: reservation.id, token }),
        },
      };

      const totalAmount = Number(data.montant_total);
      if (!Number.isNaN(totalAmount) && totalAmount > 0) {
        const points = Math.max(1, Math.round(totalAmount));
        await storage.addLoyaltyTransaction({
          user_id: user!.id,
          type: "credit",
          amount: points,
          source: "reservation",
          metadata: { reservationId: reservation.id, tripId: reservation.trip_id },
        });
      }

      // Notification r\u00e9elle li\u00e9e \u00e0 la r\u00e9servation (respecte les pr\u00e9f\u00e9rences utilisateur)
      await dispatchNotificationToUser(
        user!.id,
        {
          title: "R\u00e9servation cr\u00e9\u00e9e",
          message: `Votre r\u00e9servation pour le trajet ${trip.point_depart} \u2192 ${trip.point_arrivee} a bien \u00e9t\u00e9 enregistr\u00e9e.`,
          category: "reservation",
          type: "reservation_created",
          context: {
            reservationId: reservation.id,
            tripId: reservation.trip_id,
            montant_total: data.montant_total,
          },
        },
        { priority: "normal", sourceUserId: user!.id },
      );

      res.status(201).json(reservationWithQr);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Cancel reservation
  // Marquer une réservation comme payée (paiement CB / QR / justificatif)
  app.post("/api/reservations/:id/pay", requireAuth, async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: "RǸservation non trouvǸe" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Non authentifiǸ" });
      }

      const isAdmin = isAdminRole(user.role);
      if (!isAdmin && reservation.client_id !== user.id) {
        return res.status(403).json({ error: "Acc��s interdit" });
      }

      if (reservation.statut === "paid") {
        return res.status(400).json({ error: "RǸservation dǸj�� payǸe" });
      }

      const updatedReservation = await storage.updateReservation(reservation.id, {
        ...(req.body && typeof req.body === "object" ? req.body : {}),
        statut: "paid",
      });

      // Dès que la réservation est payée, on place le trajet associé en attente
      // de confirmation chauffeur (workflow métier).
      const trip = await storage.getTrip(reservation.trip_id);
      if (trip) {
        const tripPatch: Partial<InsertTrip> = {};
        if (!trip.status || trip.status === "waiting_chauffeur_confirmation") {
          (tripPatch as any).status = "waiting_chauffeur_confirmation";
        }
        if (!trip.statut || trip.statut === "planifie") {
          tripPatch.statut = "planifie" as any;
        }
        if (Object.keys(tripPatch).length > 0) {
          await storage.updateTrip(trip.id, tripPatch);
        }
      }

      // Notification confirmant le paiement de la r\xE9servation
      await dispatchNotificationToUser(
        reservation.client_id,
        {
          title: "R\xE9servation pay\xE9e",
          message: trip
            ? `Votre r\xE9servation pour le trajet ${trip.point_depart} \u2192 ${trip.point_arrivee} est maintenant marqu\xE9e comme pay\xE9e.`
            : "Votre r\xE9servation est maintenant marqu\xE9e comme pay\xE9e.",
          category: "reservation",
          type: "reservation_paid",
          context: {
            reservationId: reservation.id,
            tripId: reservation.trip_id,
          },
        },
        { priority: "normal", sourceUserId: user.id },
      );

      res.json(updatedReservation);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/reservations/:id/cancel", requireAuth, async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }

      const user = await storage.getUser(req.session.userId!);
      
      // Only the client or admin can cancel
      if (!isAdminRole(user?.role) && reservation.client_id !== user?.id) {
        return res.status(403).json({ error: "Accès interdit" });
      }

      await storage.cancelReservation(req.params.id);
      res.json({ message: "Réservation annulée" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Mark reservation as checked in (used by admin scanner)
  app.post("/api/reservations/:id/checkin", requireRole("ADMIN", "CHAUFFEUR"), async (req, res) => {
    try {
      const admin = req.user!;
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) return res.status(404).json({ error: "Réservation non trouvée" });

      const updated = await storage.markReservationChecked(req.params.id, admin.id);
      res.json({ success: true, reservation: updated });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Validate ticket (used by scanning QR). Accepts query params `reservationId` and `token`.
  app.get("/api/tickets/validate", async (req, res) => {
    try {
      const { reservationId, token } = req.query as Record<string, string | undefined>;
      if (!reservationId || !token) {
        return res.status(400).json({ error: "Paramètres manquants" });
      }

      const reservation = await storage.getReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ error: "Réservation introuvable" });
      }

      const secret = process.env.SESSION_SECRET || "dev-secret";
      const expected = crypto.createHmac("sha256", secret).update(reservation.id).digest("hex").slice(0, 32);
      if (token !== expected) {
        return res.status(403).json({ valid: false, error: "Jeton invalide" });
      }

      // Optionally, you can check if reservation is cancelled or expired.
      res.json({ valid: true, reservation });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== LOYALTY & GAMIFICATION ====================
  app.get("/api/loyalty/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [balanceRecord, transactions, missions, progress, tiers, badges] = await Promise.all([
        storage.getLoyaltyBalance(userId),
        storage.listLoyaltyTransactions(userId, 20),
        storage.listMissions(true),
        storage.getMissionProgressForUser(userId),
        storage.listRewardTiers(),
        storage.listUserBadges(userId),
      ]);
      const balanceValue = Number(balanceRecord.balance ?? 0);
      const progressMap = new Map(progress.map((entry) => [entry.mission_id, entry]));
      const missionsWithProgress = missions.map((mission) => {
        const stats = progressMap.get(mission.id);
        const target = mission.points ?? 0;
        const current = stats?.progress ?? 0;
        return {
          ...mission,
          progress: current,
          completed: stats?.completed ?? current >= target,
        };
      });
      const currentTier =
        tiers
          .filter((tier) => balanceValue >= Number(tier.min_points ?? 0))
          .sort((a, b) => Number(b.min_points ?? 0) - Number(a.min_points ?? 0))[0] ?? null;
      res.json({
        balance: balanceValue,
        transactions,
        missions: missionsWithProgress,
        badges,
        tiers,
        currentTier,
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/loyalty/transfer", requireAuth, async (req, res) => {
    try {
      const payload = loyaltyTransferSchema.parse(req.body);
      const senderId = req.session.userId!;
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(401).json({ error: "Utilisateur introuvable" });
      }
      const recipient = await storage.getUserByEmail(payload.recipientEmail.toLowerCase());
      if (!recipient) {
        return res.status(404).json({ error: "Destinataire introuvable" });
      }
      if (recipient.id === senderId) {
        return res.status(400).json({ error: "Impossible de se transférer des points" });
      }
      const senderBalance = await storage.getLoyaltyBalance(senderId);
      const senderBalanceValue = Number(senderBalance.balance ?? 0);
      if (senderBalanceValue < payload.amount) {
        return res.status(400).json({ error: "Solde insuffisant" });
      }
      const debit = await storage.addLoyaltyTransaction({
        user_id: senderId,
        type: "debit",
        amount: payload.amount,
        source: "transfer",
        metadata: { to: recipient.id, note: payload.note },
      });
      await storage.addLoyaltyTransaction({
        user_id: recipient.id,
        type: "credit",
        amount: payload.amount,
        source: "transfer",
        metadata: { from: senderId, note: payload.note },
      });
      res.json({ balance: debit.balance, recipientId: recipient.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/loyalty/badges", requireAuth, async (req, res) => {
    try {
      const badges = await storage.listUserBadges(req.session.userId!);
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/loyalty/badges", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = badgeSchema.parse(req.body);
      const badge = await storage.grantBadge({
        user_id: payload.userId,
        badge: payload.badge,
        description: payload.description,
        awarded_for: payload.awarded_for,
      });
      res.status(201).json(badge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/missions/:id/progress", requireRole("ADMIN"), async (req, res) => {
    try {
      const payload = missionAdjustmentSchema.parse(req.body);
      const progress = await storage.updateMissionProgress(payload.userId, req.params.id, payload.delta);
      res.json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== STATS ROUTES (Admin only) ====================

  app.get("/api/stats", requireRole("ADMIN"), async (_req, res) => {
    try {
      const [ctx, users] = await Promise.all([
        assembleOptimizationContext(7),
        storage.getAllUsers(),
      ]);

      const snapshot = ctx.snapshot;

      const totalTrips = snapshot.totals.trips;
      const activeTrips = snapshot.activeTrips;

      const completedTrips = ctx.loadFactors.filter(
        (trip) => trip.statut === "termine",
      ).length;

      const trends = ctx.trends ?? [];

      const lateIncidents = ctx.incidents.filter((incident) => {
        const type = (incident.type || "").toLowerCase();
        return ["trafic", "retard", "accident", "urgence"].some((keyword) =>
          type.includes(keyword),
        );
      });

      const criticalIncidents = ctx.incidents.filter(
        (incident) => incident.gravite === "critique",
      );

      const punctualityValue =
        completedTrips > 0
          ? Math.max(0, 100 - (lateIncidents.length / completedTrips) * 100)
          : 100;

      const occupancyRates = ctx.loadFactors.map((factor) => {
        if (!factor.capacity || factor.capacity <= 0) {
          return 0;
        }
        return Math.min(1, factor.reserved / factor.capacity);
      });
      const averageOccupancy =
        occupancyRates.length > 0
          ? occupancyRates.reduce((sum, value) => sum + value, 0) / occupancyRates.length
          : 0;

      const fillRateValue = Number((averageOccupancy * 100).toFixed(1));
      const fillRateTarget = 80;
      const punctualityTarget = 95;
      const criticalAlertsBaseline = 3;

      const activity = trends
        .slice(-7)
        .map((entry) => ({
          day: entry.day,
          reservations: Number(entry.reservations ?? 0),
        }));

      const revenueSeries = trends.map((entry) => ({
        day: entry.day,
        revenue: Number(entry.revenue ?? 0),
      }));

      const occupancySource = ctx.loadFactors.filter((factor) => factor.capacity > 0);
      const occupancyBucketsConfig = [
        { id: "low", label: "0-50%", from: 0, to: 0.5 },
        { id: "medium", label: "50-80%", from: 0.5, to: 0.8 },
        { id: "high", label: "80-100%", from: 0.8, to: 1.01 },
      ] as const;

      const occupancyBuckets = occupancyBucketsConfig.map((bucket) => {
        const count = occupancySource.filter((factor) => {
          const ratio = factor.capacity ? factor.reserved / factor.capacity : 0;
          return ratio >= bucket.from && ratio < bucket.to;
        }).length;
        return {
          id: bucket.id,
          label: bucket.label,
          count,
        };
      });

      const vehicleStatusCountsMap = new Map<string, number>();
      for (const vehicle of ctx.vehicles) {
        const key = vehicle.statut || "inconnu";
        vehicleStatusCountsMap.set(key, (vehicleStatusCountsMap.get(key) ?? 0) + 1);
      }
      const vehicleStatusCounts = Array.from(vehicleStatusCountsMap.entries()).map(
        ([status, count]) => ({
          status,
          count,
        }),
      );

      const incidentTypeCountsMap = new Map<string, number>();
      for (const incident of ctx.incidents) {
        const key = incident.type || "autre";
        incidentTypeCountsMap.set(key, (incidentTypeCountsMap.get(key) ?? 0) + 1);
      }
      const incidentTypeCounts = Array.from(incidentTypeCountsMap.entries()).map(
        ([type, count]) => ({
          type,
          count,
        }),
      );

      let trendDelta = 0;
      if (trends.length >= 2) {
        const last = Number(trends[trends.length - 1].reservations ?? 0);
        const baseline =
          trends.slice(0, -1).reduce((sum, t) => sum + Number(t.reservations ?? 0), 0) /
          Math.max(trends.length - 1, 1);
        trendDelta = baseline > 0 ? ((last - baseline) / baseline) * 100 : 0;
      }

      const systemAlerts: Array<{
        id: string;
        message: string;
        severity: "info" | "warning" | "critical";
      }> = [];

      if (criticalIncidents.length === 0) {
        systemAlerts.push({
          id: "no-critical-incidents",
          message: "Aucun incident critique enregistr\u00e9 aujourd'hui.",
          severity: "info",
        });
      } else {
        systemAlerts.push({
          id: "critical-incidents",
          message: `${criticalIncidents.length} incident(s) critiques en cours.`,
          severity: "critical",
        });
      }

      if (snapshot.reservationsToday === 0) {
        systemAlerts.push({
          id: "no-reservations-today",
          message: "Aucune r\u00e9servation enregistr\u00e9e aujourd'hui.",
          severity: "warning",
        });
      }

      if (fillRateValue < fillRateTarget - 10) {
        systemAlerts.push({
          id: "low-occupancy",
          message: "Taux de remplissage en dessous de la cible r\u00e9seau.",
          severity: "warning",
        });
      }

      res.json({
        // Backward-compatible summary fields
        totalUsers: users.length,
        totalVehicles: ctx.vehicles.length,
        activeTrips,
        totalTrips,
        // Detailed snapshot and computed metrics
        snapshot,
        kpis: {
          fillRate: {
            value: Number(fillRateValue.toFixed(1)),
            trend: Number((fillRateValue - fillRateTarget).toFixed(1)),
          },
          punctuality: {
            value: Number(punctualityValue.toFixed(1)),
            trend: Number((punctualityValue - punctualityTarget).toFixed(1)),
          },
          criticalAlerts: {
            value: criticalIncidents.length,
            trend: criticalIncidents.length - criticalAlertsBaseline,
          },
        },
        activity,
        revenueSeries,
        occupancyBuckets,
        vehicleStatusCounts,
        incidentTypeCounts,
        trend: {
          deltaPercent: Number(trendDelta.toFixed(1)),
          direction: trendDelta > 5 ? "up" : trendDelta < -5 ? "down" : "flat",
        },
        systemAlerts,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== SEARCH ANALYTICS (Admin) ====================
  app.get("/api/search-analytics/recent", requireRole("ADMIN"), async (_req, res) => {
    try {
      const logs = await storage.getRecentSearches();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/search-analytics/top", requireRole("ADMIN"), async (_req, res) => {
    try {
      const stats = await storage.getSearchStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== GEO ROUTES ====================
  app.get("/api/geo/tunisia-routes", async (_req, res) => {
    res.json(tunisiaRoutes);
  });

  // ==================== CHAUFFEUR INCIDENTS / STATS ====================
  app.get("/api/chauffeur/incidents", requireRole("CHAUFFEUR", "ADMIN"), async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByChauffeur(req.user!.id);
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/chauffeur/incidents", requireRole("CHAUFFEUR", "ADMIN"), async (req, res) => {
    try {
      const data = insertIncidentSchema.parse({
        ...req.body,
        chauffeur_id: req.user!.id,
      });
      const incident = await storage.createIncident(data);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/chauffeur/stats", requireRole("CHAUFFEUR", "ADMIN"), async (req, res) => {
    try {
      const stats = await storage.getChauffeurStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // ==================== ADMIN DASHBOARD ====================
  app.get("/api/admin/dashboard", requireRole("ADMIN"), async (req, res) => {
    try {
      const entityId = (req.query.entity as string) || "national";
      const entity = ENTITIES.find((e) => e.id === entityId) || ENTITIES[0];

      const [snapshot, trends, incidents] = await Promise.all([
        storage.getDashboardSnapshot(),
        storage.getReservationTrends(7),
        storage.getRecentIncidents(5),
      ]);

      const alerts = [];
      if (snapshot.incidentsOpen > 0) {
        alerts.push({
          type: "incident",
          message: `${snapshot.incidentsOpen} incident(s) en attente`,
          severity: "high",
        });
      }
      if (snapshot.reservationsToday === 0) {
        alerts.push({
          type: "demand",
          message: "Aucune réservation enregistrée aujourd'hui",
          severity: "medium",
        });
      }

      const predictedTrend = trends.map((point) => ({
        ...point,
        forecast: Math.round(Number(point.reservations) * (1 + 0.05 * entity.factor)),
      }));

      const avgReservations =
        trends.reduce((sum, t) => sum + Number(t.reservations), 0) / Math.max(trends.length, 1);
      const anomalyAlerts = trends
        .filter((t) => Number(t.reservations) > avgReservations * 1.4)
        .map((t) => ({
          date: t.day,
          message: `Demande exceptionnelle détectée le ${t.day}`,
        }));

      const multiEntities = ENTITIES.map((ent) => ({
        id: ent.id,
        name: ent.name,
        reservationsToday: Math.round((snapshot.reservationsToday || 0) * ent.factor),
        incidents: Math.round(snapshot.incidentsOpen * ent.factor * 0.5),
      }));

      const mode = snapshot.incidentsOpen > 5 ? "crisis" : "normal";
      const crisisActions =
        mode === "crisis"
          ? [
              "Activer cellule d'urgence",
              "Réassigner les bus vers les zones critiques",
              "Notifier les équipes terrain",
            ]
          : [];

      res.json({
        entity,
        snapshot,
        trends,
        predictions: predictedTrend,
        anomalyAlerts,
        multiEntities,
        mode,
        crisisActions,
        alerts,
        incidents,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
}
