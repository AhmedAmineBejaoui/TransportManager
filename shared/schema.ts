import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  role: text("role").notNull().default("CLIENT"), // ADMIN | CHAUFFEUR | CLIENT
  telephone: text("telephone"),
  permis_num: text("permis_num"),
  statut: text("statut").default("actif"), // actif | inactif
  maintenance_until: timestamp("maintenance_until"),
  maintenance_reason: text("maintenance_reason"),
  mfa_enabled: boolean("mfa_enabled").default(false),
  auth_provider: text("auth_provider").default("local"), // local | google
  provider_id: text("provider_id"),
  created_at: timestamp("created_at").defaultNow(),
  last_login: timestamp("last_login"),
  // Profil utilisateur
  photo_profil: text("photo_profil"), // URL de la photo de profil
  langue_preferee: text("langue_preferee").default("fr"), // fr | en | ar
  fuseau_horaire: text("fuseau_horaire").default("Africa/Tunis"),
  adresse: text("adresse"),
  // Notifications
  notifications_email: boolean("notifications_email").default(true),
  notifications_reservations: boolean("notifications_reservations").default(true),
  notifications_alertes: boolean("notifications_alertes").default(true),
  // Moyens de paiement
  moyens_paiement: jsonb("moyens_paiement"), // Array de moyens de paiement
  // RGPD
  donnees_suppression_demandee: timestamp("donnees_suppression_demandee"),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  immatriculation: text("immatriculation").notNull().unique(),
  marque: text("marque").notNull(),
  modele: text("modele").notNull(),
  capacite: integer("capacite").notNull(),
  statut: text("statut").default("disponible"), // disponible | en_route | en_maintenance
  chauffeur_id: varchar("chauffeur_id").references(() => users.id),
});

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  point_depart: text("point_depart").notNull(),
  point_arrivee: text("point_arrivee").notNull(),
  heure_depart_prevue: timestamp("heure_depart_prevue").notNull(),
  heure_arrivee_prevue: timestamp("heure_arrivee_prevue").notNull(),
  prix: decimal("prix", { precision: 10, scale: 2 }).notNull(),
  chauffeur_id: varchar("chauffeur_id").references(() => users.id),
  vehicle_id: varchar("vehicle_id").references(() => vehicles.id),
  statut: text("statut").default("planifie"), // planifie | en_cours | termine | annule
  places_disponibles: integer("places_disponibles").notNull(),
  distance_km: integer("distance_km").default(0),
});

export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  client_id: varchar("client_id").notNull().references(() => users.id),
  trip_id: varchar("trip_id").notNull().references(() => trips.id),
  nombre_places: integer("nombre_places").notNull(),
  numero_siege: text("numero_siege"),
  statut: text("statut").default("en_attente"), // en_attente | confirme | annule | termine
  date_reservation: timestamp("date_reservation").defaultNow(),
  montant_total: decimal("montant_total", { precision: 10, scale: 2 }).notNull(),
  checked: boolean("checked").default(false),
  checked_in_at: timestamp("checked_in_at"),
  checked_by_admin_id: varchar("checked_by_admin_id").references(() => users.id),
});

export const reservationOptions = pgTable("reservation_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservation_id: varchar("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  flex: boolean("flex").default(false),
  annulation_gratuite: boolean("annulation_gratuite").default(false),
  bagages_sup: boolean("bagages_sup").default(false),
  notes: text("notes"),
});

export const reservationGuests = pgTable("reservation_guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservation_id: varchar("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  status: text("status").default("pending"),
  amount_due: decimal("amount_due", { precision: 10, scale: 2 }).default("0"),
  paid: boolean("paid").default(false),
});
export const searchLogs = pgTable("search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  depart: text("depart"),
  arrivee: text("arrivee"),
  date_recherche: timestamp("date_recherche").defaultNow(),
  trajet_date: timestamp("trajet_date"),
  resultat_compte: integer("resultat_compte"),
  source: text("source").default("web"), // web | mobile | api
});

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chauffeur_id: varchar("chauffeur_id").notNull().references(() => users.id),
  trip_id: varchar("trip_id").references(() => trips.id),
  type: text("type").notNull(), // trafic | panne | accident | urgence | autre
  description: text("description").notNull(),
  gravite: text("gravite").default("modere"), // mineur | modere | critique
  statut: text("statut").default("ouvert"), // ouvert | en_cours | resolu
  created_at: timestamp("created_at").defaultNow(),
});

export const profileVersions = pgTable("profile_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  payload: jsonb("payload").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const searchAlerts = pgTable("search_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  depart: text("depart"),
  arrivee: text("arrivee"),
  date: timestamp("date"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const missions = pgTable("missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  points: integer("points").default(50),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  user_id: varchar("user_id").primaryKey().references(() => users.id),
  channels: jsonb("channels").default(sql`'{"email":true,"push":true,"sms":false}'::jsonb`),
  priority_threshold: text("priority_threshold").default("normal"),
  quiet_mode: boolean("quiet_mode").default(false),
  quiet_hours: text("quiet_hours"),
  context_filters: jsonb("context_filters").default(sql`'{}'::jsonb`),
  vacation_mode: boolean("vacation_mode").default(false),
  vacation_delegate_user_id: varchar("vacation_delegate_user_id").references(() => users.id),
  vacation_until: timestamp("vacation_until"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const notificationSegments = pgTable("notification_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  filters: jsonb("filters").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationCampaigns = pgTable("notification_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  segment_id: varchar("segment_id").references(() => notificationSegments.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  channel: text("channel").default("push"),
  priority: text("priority").default("normal"),
  status: text("status").default("draft"),
  scheduled_for: timestamp("scheduled_for"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"),
  channel: text("channel").default("push"),
  priority: text("priority").default("normal"),
  category: text("category"),
  context: jsonb("context").default(sql`'{}'::jsonb`),
  actions: jsonb("actions"),
  read: boolean("read").default(false),
  read_at: timestamp("read_at"),
  action_taken_at: timestamp("action_taken_at"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationRules = pgTable("notification_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").default(sql`'{}'::jsonb`),
  channels: jsonb("channels").default(sql`'["push"]'::jsonb`),
  priority: text("priority").default("normal"),
  enabled: boolean("enabled").default(true),
  created_by: varchar("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationRuleLogs = pgTable("notification_rule_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rule_id: varchar("rule_id").references(() => notificationRules.id),
  event: text("event").notNull(),
  payload: jsonb("payload"),
  result: jsonb("result"),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationEngagements = pgTable("notification_engagements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notification_id: varchar("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // delivered | read | clicked | action
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationCollaborators = pgTable("notification_collaborators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notification_id: varchar("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  collaborator_user_id: varchar("collaborator_user_id").notNull().references(() => users.id),
  role: text("role").default("viewer"),
  created_at: timestamp("created_at").defaultNow(),
});

export const notificationDigests = pgTable("notification_digests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  scheduled_for: timestamp("scheduled_for").notNull(),
  payload: jsonb("payload").default(sql`'[]'::jsonb`),
  sent: boolean("sent").default(false),
  sent_at: timestamp("sent_at"),
});

export const notificationDelegations = pgTable("notification_delegations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  delegate_user_id: varchar("delegate_user_id").notNull().references(() => users.id),
  start_at: timestamp("start_at").defaultNow(),
  end_at: timestamp("end_at"),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  statut: text("statut").default("open"), // open | pending | resolved | escalated
  priority: text("priority").default("normal"), // low | normal | high
  channel: text("channel").default("in_app"), // in_app | email | phone | social
  metadata: jsonb("metadata"),
  assigned_agent_id: varchar("assigned_agent_id").references(() => users.id),
  satisfaction_score: integer("satisfaction_score"),
  resolution_summary: text("resolution_summary"),
  resolved_at: timestamp("resolved_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticket_id: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  sender_id: varchar("sender_id").references(() => users.id),
  role: text("role").default("user"), // user | agent | assistant
  message: text("message").notNull(),
  attachments: jsonb("attachments"),
  created_at: timestamp("created_at").defaultNow(),
});

export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  source: text("source").default("manual"), // manual | ticket
  ticket_id: varchar("ticket_id").references(() => supportTickets.id),
  helpful_count: integer("helpful_count").default(0),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const knowledgeEmbeddings = pgTable("knowledge_embeddings", {
  article_id: varchar("article_id").primaryKey().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  vector: jsonb("vector"),
  model: text("model").default("text-embedding-ada-002"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const cobrowsingSessions = pgTable("cobrowsing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  owner_user_id: varchar("owner_user_id").notNull().references(() => users.id),
  support_agent_id: varchar("support_agent_id").references(() => users.id),
  ticket_id: varchar("ticket_id").references(() => supportTickets.id),
  status: text("status").default("pending"), // pending | active | ended
  token: varchar("token").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  ended_at: timestamp("ended_at"),
});

export const cobrowsingSignals = pgTable("cobrowsing_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: varchar("session_id").notNull().references(() => cobrowsingSessions.id, { onDelete: "cascade" }),
  sender_id: varchar("sender_id").references(() => users.id),
  type: text("type").notNull(), // offer | answer | ice | control
  payload: jsonb("payload").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const feedbackEntries = pgTable("feedback_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id),
  category: text("category").default("general"),
  rating: integer("rating"),
  comment: text("comment"),
  sentiment_score: decimal("sentiment_score", { precision: 4, scale: 2 }).default("0"),
  channel: text("channel").default("in_app"),
  created_at: timestamp("created_at").defaultNow(),
});

export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").default(sql`'[]'::jsonb`),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  survey_id: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  user_id: varchar("user_id").references(() => users.id),
  answers: jsonb("answers").default(sql`'{}'::jsonb`),
  sentiment_score: decimal("sentiment_score", { precision: 4, scale: 2 }).default("0"),
  submitted_at: timestamp("submitted_at").defaultNow(),
});

export const loyaltyPoints = pgTable("loyalty_points", {
  user_id: varchar("user_id").primaryKey().references(() => users.id),
  balance: integer("balance").default(0),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // credit | debit
  amount: integer("amount").notNull(),
  source: text("source").default("reservation"), // reservation | mission | transfer
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

export const missionProgress = pgTable("mission_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mission_id: varchar("mission_id").notNull().references(() => missions.id, { onDelete: "cascade" }),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completed_at: timestamp("completed_at"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const rewardTiers = pgTable("reward_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  min_points: integer("min_points").default(0),
  perks: jsonb("perks").default(sql`'{}'::jsonb`),
  badge: text("badge"),
  created_at: timestamp("created_at").defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badge: text("badge").notNull(),
  description: text("description"),
  awarded_for: text("awarded_for"),
  awarded_at: timestamp("awarded_at").defaultNow(),
});

export const tripReviews = pgTable("trip_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trip_id: varchar("trip_id").notNull().references(() => trips.id),
  client_id: varchar("client_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  sentiment_score: decimal("sentiment_score", { precision: 4, scale: 2 }).default("0"),
  created_at: timestamp("created_at").defaultNow(),
});

export const reviewMedia = pgTable("review_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  review_id: varchar("review_id").notNull().references(() => tripReviews.id, { onDelete: "cascade" }),
  media_type: text("media_type").default("photo"),
  url: text("url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  metadata: jsonb("metadata"),
});

export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  event: text("event").notNull(), // login, logout, reservation, update_profile ...
  metadata: jsonb("metadata"),
  ip: text("ip"),
  device: text("device"),
  created_at: timestamp("created_at").defaultNow(),
});

export const securityThresholds = pgTable("security_thresholds", {
  key: text("key").primaryKey(),
  value: integer("value").notNull(),
  description: text("description"),
});

export const userApprovals = pgTable("user_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // create | update | role_change
  payload: jsonb("payload"),
  status: text("status").default("pending"), // pending | approved | rejected
  approver_level: integer("approver_level").default(1),
  reason: text("reason"),
  created_at: timestamp("created_at").defaultNow(),
  decided_at: timestamp("decided_at"),
});

export const roleContexts = pgTable("role_contexts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(),
  allowed_hours: text("allowed_hours").default("0-23"),
  allowed_zones: text("allowed_zones"), // e.g. "NORD,CENTRE"
  permissions: jsonb("permissions").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
});

export const experiencePersonalizations = pgTable("experience_personalizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  profile_name: text("profile_name").notNull(),
  context: text("context").default("bureau"),
  mode: text("mode").default("standard"),
  triggers: jsonb("triggers").default(
    sql`'{"schedule":{"from":"08:00","to":"18:00"},"activity":"bureau"}'::jsonb`,
  ),
  layout_config: jsonb("layout_config").default(sql`'[]'::jsonb`),
  theme_config: jsonb("theme_config").default(
    sql`'{"base":"light","accent":"#2563eb","dynamic":true}'::jsonb`,
  ),
  accessibility_config: jsonb("accessibility_config").default(
    sql`'{"voice":false,"gestures":false}'::jsonb`,
  ),
  presentation_mode: boolean("presentation_mode").default(false),
  dynamic_theme: boolean("dynamic_theme").default(true),
  is_active: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  cloud_synced_at: timestamp("cloud_synced_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const accessibilitySettings = pgTable("accessibility_settings", {
  user_id: varchar("user_id").primaryKey().references(() => users.id),
  voice_enabled: boolean("voice_enabled").default(false),
  gestures_enabled: boolean("gestures_enabled").default(false),
  voice_feedback: boolean("voice_feedback").default(true),
  cognitive_mode: boolean("cognitive_mode").default(false),
  presentation_mode: boolean("presentation_mode").default(false),
  contrast_preset: text("contrast_preset").default("standard"),
  font_scale: integer("font_scale").default(100),
  color_blind_preset: text("color_blind_preset").default("none"),
  translation_languages: jsonb("translation_languages").default(sql`'["fr-FR","en-US"]'::jsonb`),
  speech_language: text("speech_language").default("fr-FR"),
  last_voice_command: text("last_voice_command"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  brightness_mode: text("brightness_mode").default("auto"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const optimizationRecommendations = pgTable("optimization_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  route_from: text("route_from").notNull(),
  route_to: text("route_to").notNull(),
  recommended_start: timestamp("recommended_start").notNull(),
  narrative: text("narrative").notNull(),
  reason: text("reason").notNull(),
  priority: integer("priority").default(0),
  confidence: decimal("confidence", { precision: 4, scale: 2 }).default("0.5"),
  recommended_bus_id: varchar("recommended_bus_id").references(() => vehicles.id),
  recommended_chauffeur_id: varchar("recommended_chauffeur_id").references(() => users.id),
  status: text("status").default("pending"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  created_by: varchar("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const optimizationRules = pgTable("optimization_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true),
  route_pattern: text("route_pattern"),
  threshold: decimal("threshold", { precision: 5, scale: 2 }).default("1.2"),
  auto_apply: boolean("auto_apply").default(false),
  min_rest_hours: integer("min_rest_hours").default(8),
  service_window: text("service_window").default("05:00-23:00"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Insert schemas
const baseInsertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  last_login: true,
});

export const insertUserSchema = baseInsertUserSchema.extend({
  role: z.enum(["ADMIN", "SUPER_ADMIN", "CHAUFFEUR", "CLIENT"]).optional(),
  auth_provider: z.enum(["local", "google"]).optional(),
  provider_id: z.string().optional(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
}).extend({
  heure_depart_prevue: z.union([z.date(), z.string().datetime()]).pipe(z.coerce.date()),
  heure_arrivee_prevue: z.union([z.date(), z.string().datetime()]).pipe(z.coerce.date()),
  prix: z.union([z.string(), z.number()]).pipe(z.coerce.string()),
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  date_reservation: true,
});
export const insertSearchLogSchema = createInsertSchema(searchLogs).omit({
  id: true,
  date_recherche: true,
});
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  created_at: true,
});
export const insertProfileVersionSchema = createInsertSchema(profileVersions).omit({
  id: true,
  created_at: true,
});
export const insertSearchAlertSchema = createInsertSchema(searchAlerts).omit({
  id: true,
  created_at: true,
});
export const insertTripReviewSchema = createInsertSchema(tripReviews).omit({
  id: true,
  created_at: true,
  sentiment_score: true,
});
export const insertReviewMediaSchema = createInsertSchema(reviewMedia).omit({
  id: true,
});
export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
  created_at: true,
});
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  updated_at: true,
});
export const insertNotificationSegmentSchema = createInsertSchema(notificationSegments).omit({
  id: true,
  created_at: true,
});
export const insertNotificationCampaignSchema = createInsertSchema(notificationCampaigns).omit({
  id: true,
  created_at: true,
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  created_at: true,
  read_at: true,
  action_taken_at: true,
});
export const insertFeedbackEntrySchema = createInsertSchema(feedbackEntries).omit({
  id: true,
  created_at: true,
});
export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  created_at: true,
});
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submitted_at: true,
});
export const insertNotificationRuleSchema = createInsertSchema(notificationRules).omit({
  id: true,
  created_at: true,
});
export const insertNotificationRuleLogSchema = createInsertSchema(notificationRuleLogs).omit({
  id: true,
  created_at: true,
});
export const insertNotificationEngagementSchema = createInsertSchema(notificationEngagements).omit({
  id: true,
  created_at: true,
});
export const insertNotificationCollaboratorSchema = createInsertSchema(notificationCollaborators).omit({
  id: true,
  created_at: true,
});
export const insertNotificationDigestSchema = createInsertSchema(notificationDigests).omit({
  id: true,
  sent: true,
  sent_at: true,
});
export const insertNotificationDelegationSchema = createInsertSchema(notificationDelegations).omit({
  id: true,
  created_at: true,
});
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  created_at: true,
  updated_at: true,
  resolved_at: true,
});
export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  created_at: true,
});
export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({
  id: true,
  helpful_count: true,
  created_at: true,
  updated_at: true,
});
export const insertKnowledgeEmbeddingSchema = createInsertSchema(knowledgeEmbeddings).omit({
  article_id: true,
  updated_at: true,
});
export const insertCobrowsingSessionSchema = createInsertSchema(cobrowsingSessions).omit({
  id: true,
  support_agent_id: true,
  created_at: true,
  ended_at: true,
});
export const insertCobrowsingSignalSchema = createInsertSchema(cobrowsingSignals).omit({
  id: true,
  created_at: true,
});
export const insertLoyaltyPointSchema = createInsertSchema(loyaltyPoints).omit({
  updated_at: true,
});
export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({
  id: true,
  created_at: true,
});
export const insertMissionProgressSchema = createInsertSchema(missionProgress).omit({
  id: true,
  updated_at: true,
});
export const insertRewardTierSchema = createInsertSchema(rewardTiers).omit({
  id: true,
  created_at: true,
});
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  awarded_at: true,
});
export const insertUserApprovalSchema = createInsertSchema(userApprovals).omit({
  id: true,
  created_at: true,
  decided_at: true,
});
export const insertRoleContextSchema = createInsertSchema(roleContexts).omit({
  id: true,
  created_at: true,
});
export const insertExperiencePersonalizationSchema = createInsertSchema(experiencePersonalizations).omit({
  id: true,
  created_at: true,
  updated_at: true,
  cloud_synced_at: true,
});
export const insertAccessibilitySettingSchema = createInsertSchema(accessibilitySettings).omit({
  created_at: true,
  updated_at: true,
});
export const insertOptimizationRecommendationSchema = createInsertSchema(optimizationRecommendations).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const insertOptimizationRuleSchema = createInsertSchema(optimizationRules).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  created_at: true,
});
export const insertSecurityThresholdSchema = createInsertSchema(securityThresholds).omit({});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservationOptions = z.infer<typeof insertReservationOptionsSchema>;
export type ReservationOptions = typeof reservationOptions.$inferSelect;
export type InsertReservationGuest = z.infer<typeof insertReservationGuestSchema>;
export type ReservationGuest = typeof reservationGuests.$inferSelect;

export type InsertSearchLog = z.infer<typeof insertSearchLogSchema>;
export type SearchLog = typeof searchLogs.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertProfileVersion = z.infer<typeof insertProfileVersionSchema>;
export type ProfileVersion = typeof profileVersions.$inferSelect;
export type InsertSearchAlert = z.infer<typeof insertSearchAlertSchema>;
export type SearchAlert = typeof searchAlerts.$inferSelect;
export type InsertTripReview = z.infer<typeof insertTripReviewSchema>;
export type TripReview = typeof tripReviews.$inferSelect;
export type InsertReviewMedia = z.infer<typeof insertReviewMediaSchema>;
export type ReviewMedia = typeof reviewMedia.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missions.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationSegment = z.infer<typeof insertNotificationSegmentSchema>;
export type NotificationSegment = typeof notificationSegments.$inferSelect;
export type InsertNotificationCampaign = z.infer<typeof insertNotificationCampaignSchema>;
export type NotificationCampaign = typeof notificationCampaigns.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotificationRule = z.infer<typeof insertNotificationRuleSchema>;
export type NotificationRule = typeof notificationRules.$inferSelect;
export type InsertNotificationRuleLog = z.infer<typeof insertNotificationRuleLogSchema>;
export type NotificationRuleLog = typeof notificationRuleLogs.$inferSelect;
export type InsertNotificationEngagement = z.infer<typeof insertNotificationEngagementSchema>;
export type NotificationEngagement = typeof notificationEngagements.$inferSelect;
export type InsertNotificationCollaborator = z.infer<typeof insertNotificationCollaboratorSchema>;
export type NotificationCollaborator = typeof notificationCollaborators.$inferSelect;
export type InsertNotificationDigest = z.infer<typeof insertNotificationDigestSchema>;
export type NotificationDigest = typeof notificationDigests.$inferSelect;
export type InsertNotificationDelegation = z.infer<typeof insertNotificationDelegationSchema>;
export type NotificationDelegation = typeof notificationDelegations.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type InsertKnowledgeEmbedding = z.infer<typeof insertKnowledgeEmbeddingSchema>;
export type KnowledgeEmbedding = typeof knowledgeEmbeddings.$inferSelect;
export type InsertCobrowsingSession = z.infer<typeof insertCobrowsingSessionSchema>;
export type CobrowsingSession = typeof cobrowsingSessions.$inferSelect;
export type InsertCobrowsingSignal = z.infer<typeof insertCobrowsingSignalSchema>;
export type CobrowsingSignal = typeof cobrowsingSignals.$inferSelect;
export type InsertFeedbackEntry = z.infer<typeof insertFeedbackEntrySchema>;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertLoyaltyPoint = z.infer<typeof insertLoyaltyPointSchema>;
export type LoyaltyPoint = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertMissionProgress = z.infer<typeof insertMissionProgressSchema>;
export type MissionProgress = typeof missionProgress.$inferSelect;
export type InsertRewardTier = z.infer<typeof insertRewardTierSchema>;
export type RewardTier = typeof rewardTiers.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserApproval = z.infer<typeof insertUserApprovalSchema>;
export type UserApproval = typeof userApprovals.$inferSelect;
export type InsertRoleContext = z.infer<typeof insertRoleContextSchema>;
export type RoleContext = typeof roleContexts.$inferSelect;
export type InsertExperiencePersonalization = z.infer<typeof insertExperiencePersonalizationSchema>;
export type ExperiencePersonalization = typeof experiencePersonalizations.$inferSelect;
export type InsertAccessibilitySetting = z.infer<typeof insertAccessibilitySettingSchema>;
export type AccessibilitySetting = typeof accessibilitySettings.$inferSelect;
export type InsertOptimizationRecommendation = z.infer<typeof insertOptimizationRecommendationSchema>;
export type OptimizationRecommendation = typeof optimizationRecommendations.$inferSelect;
export type InsertOptimizationRule = z.infer<typeof insertOptimizationRuleSchema>;
export type OptimizationRule = typeof optimizationRules.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertSecurityThreshold = z.infer<typeof insertSecurityThresholdSchema>;
export type SecurityThreshold = typeof securityThresholds.$inferSelect;
export const insertReservationOptionsSchema = createInsertSchema(reservationOptions).omit({
  id: true,
});
export const insertReservationGuestSchema = createInsertSchema(reservationGuests).omit({
  id: true,
});
