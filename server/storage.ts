import { db } from "@db";
import {
  users,
  vehicles,
  trips,
  reservations,
  searchLogs,
  incidents,
  profileVersions,
  experiencePersonalizations,
  accessibilitySettings,
  optimizationRecommendations,
  optimizationRules,
  reservationOptions,
  reservationGuests,
  userActivity,
  securityThresholds,
  missions,
  notificationPreferences,
  notificationSegments,
  notificationCampaigns,
  notifications,
  feedbackEntries,
  surveys,
  surveyResponses,
  loyaltyPoints,
  loyaltyTransactions,
  missionProgress,
  rewardTiers,
  userBadges,
  notificationRules,
  notificationRuleLogs,
  notificationEngagements,
  notificationCollaborators,
  notificationDigests,
  notificationDelegations,
  supportTickets,
  ticketMessages,
  knowledgeArticles,
  knowledgeEmbeddings,
  cobrowsingSessions,
  cobrowsingSignals,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Vehicle,
  InsertVehicle,
  Trip,
  InsertTrip,
  Reservation,
  InsertReservation,
  SearchLog,
  InsertSearchLog,
  Incident,
  InsertIncident,
  ProfileVersion,
  InsertProfileVersion,
  ExperiencePersonalization,
  InsertExperiencePersonalization,
  AccessibilitySetting,
  InsertAccessibilitySetting,
  ReservationOptions,
  InsertReservationOptions,
  ReservationGuest,
  InsertReservationGuest,
  InsertUserActivity,
  SecurityThreshold,
  Mission,
  NotificationPreference,
  InsertNotificationPreference,
  NotificationSegment,
  InsertNotificationSegment,
  NotificationCampaign,
  InsertNotificationCampaign,
  Notification,
  InsertNotification,
  FeedbackEntry,
  InsertFeedbackEntry,
  Survey,
  InsertSurvey,
  SurveyResponse,
  InsertSurveyResponse,
  LoyaltyPoint,
  LoyaltyTransaction,
  InsertLoyaltyTransaction,
  MissionProgress,
  InsertMissionProgress,
  RewardTier,
  UserBadge,
  InsertUserBadge,
  NotificationRule,
  InsertNotificationRule,
  NotificationRuleLog,
  InsertNotificationRuleLog,
  NotificationEngagement,
  InsertNotificationEngagement,
  NotificationCollaborator,
  InsertNotificationCollaborator,
  NotificationDigest,
  InsertNotificationDigest,
  NotificationDelegation,
  InsertNotificationDelegation,
  OptimizationRecommendation,
  InsertOptimizationRecommendation,
  OptimizationRule,
  InsertOptimizationRule,
  SupportTicket,
  InsertSupportTicket,
  TicketMessage,
  InsertTicketMessage,
  KnowledgeArticle,
  InsertKnowledgeArticle,
  KnowledgeEmbedding,
  InsertKnowledgeEmbedding,
  CobrowsingSession,
  InsertCobrowsingSession,
  CobrowsingSignal,
  InsertCobrowsingSignal,
} from "@shared/schema";
import { eq, and, gte, lte, desc, or, like, ilike, sql, inArray } from "drizzle-orm";

type UpdateUser = Partial<InsertUser> & { last_login?: Date | null };
type PersonalizationStateInput = {
  context?: string;
  mode?: string;
  profileName?: string;
  profileId?: string;
  triggers?: Record<string, unknown>;
  layoutConfig?: unknown;
  themeConfig?: Record<string, unknown>;
  accessibilityConfig?: Record<string, unknown>;
  presentationMode?: boolean;
  dynamicTheme?: boolean;
  metadata?: Record<string, unknown>;
  priority?: number;
};
type ExperiencePersonalizationInsert = typeof experiencePersonalizations.$inferInsert;
export type TripLoadFactor = {
  tripId: string;
  depart: string;
  arrivee: string;
  departure: Date | null;
  capacity: number;
  reserved: number;
  price: number;
  statut: string | null;
  vehicleId: string | null;
  chauffeurId: string | null;
  vehicleStatus: string | null;
  vehicleImmatriculation: string | null;
};

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Vehicle methods
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<void>;

  // Trip methods
  getTrip(id: string): Promise<Trip | undefined>;
  getAllTrips(): Promise<Trip[]>;
  getTripsByIds(ids: string[]): Promise<Trip[]>;
  searchTrips(params: { depart?: string; arrivee?: string; date?: Date }): Promise<Trip[]>;
  searchAdminTrips(params: { chauffeurId?: string; date?: Date; status?: string }): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<void>;
  getTripsByChauffeur(chauffeurId: string): Promise<Trip[]>;
  getTripLoadFactors(windowDays?: number): Promise<TripLoadFactor[]>;

  // Reservation methods
  getReservation(id: string): Promise<Reservation | undefined>;
  getReservationsByClient(clientId: string): Promise<Reservation[]>;
  getReservationsByTrip(tripId: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation | undefined>;
  cancelReservation(id: string): Promise<void>;
  markReservationChecked(id: string, adminId: string): Promise<Reservation | undefined>;
  saveReservationOptions(options: InsertReservationOptions): Promise<ReservationOptions>;
  addReservationGuest(entry: InsertReservationGuest): Promise<ReservationGuest>;
  getGuestsByReservation(reservationId: string): Promise<ReservationGuest[]>;
  logUserActivity(activity: InsertUserActivity): Promise<void>;
  getUserHealth(userId: string): Promise<UserHealthMetrics | null>;
  // Search logs
  logSearch(entry: InsertSearchLog): Promise<SearchLog>;
  getRecentSearches(limit?: number): Promise<SearchLog[]>;
  getSearchHistoryByUser(userId: string, limit?: number): Promise<SearchLog[]>;
  getSearchStats(): Promise<{ depart: string | null; arrivee: string | null; total: number }[]>;
  listOptimizationRecommendations(filters?: { status?: string[]; route?: string }): Promise<OptimizationRecommendation[]>;
  createOptimizationRecommendation(entry: InsertOptimizationRecommendation): Promise<OptimizationRecommendation>;
  updateOptimizationRecommendation(
    id: string,
    patch: Partial<InsertOptimizationRecommendation> & { status?: string },
  ): Promise<OptimizationRecommendation | undefined>;
  listOptimizationRules(): Promise<OptimizationRule[]>;
  createOptimizationRule(entry: InsertOptimizationRule): Promise<OptimizationRule>;
  updateOptimizationRule(id: string, patch: Partial<InsertOptimizationRule>): Promise<OptimizationRule | undefined>;
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
  getReservationTrends(days: number): Promise<Array<{ day: string; reservations: number; revenue: number }>>;
  getRecentIncidents(limit?: number): Promise<Incident[]>;
  // Incident / Chauffeur operations
  getIncidentsByChauffeur(chauffeurId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  getChauffeurStats(chauffeurId: string): Promise<{
    totalTrips: number;
    upcomingTrips: number;
    completedTrips: number;
    distanceKm: number;
  }>;
  logProfileVersion(userId: string, payload: Record<string, unknown>): Promise<ProfileVersion>;
  getProfileVersions(userId: string, limit?: number): Promise<ProfileVersion[]>;
  getExperienceProfiles(userId: string): Promise<ExperiencePersonalization[]>;
  getPersonalizationState(userId: string, context?: string): Promise<ExperiencePersonalization | null>;
  savePersonalizationState(userId: string, payload: PersonalizationStateInput): Promise<ExperiencePersonalization>;
  createExperienceProfile(profile: InsertExperiencePersonalization): Promise<ExperiencePersonalization>;
  updateExperienceProfile(
    profileId: string,
    userId: string,
    patch: Partial<InsertExperiencePersonalization>,
  ): Promise<ExperiencePersonalization | undefined>;
  getAccessibilitySettings(userId: string): Promise<AccessibilitySetting>;
  saveAccessibilitySettings(
    userId: string,
    patch: Partial<InsertAccessibilitySetting>,
  ): Promise<AccessibilitySetting>;
  getNotificationPreferences(userId: string): Promise<NotificationPreference>;
  saveNotificationPreferences(
    userId: string,
    prefs: Partial<InsertNotificationPreference>,
  ): Promise<NotificationPreference>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(notificationId: string): Promise<Notification | undefined>;
  updateNotification(
    notificationId: string,
    patch: Partial<Notification>,
  ): Promise<Notification | undefined>;
  listNotifications(
    userId: string,
    options?: { includeRead?: boolean; limit?: number },
  ): Promise<Notification[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<Notification | undefined>;
  createNotificationSegment(segment: InsertNotificationSegment): Promise<NotificationSegment>;
  getNotificationSegment(id: string): Promise<NotificationSegment | undefined>;
  listNotificationSegments(): Promise<NotificationSegment[]>;
  createNotificationCampaign(campaign: InsertNotificationCampaign): Promise<NotificationCampaign>;
  getNotificationCampaign(id: string): Promise<NotificationCampaign | undefined>;
  listNotificationCampaigns(): Promise<NotificationCampaign[]>;
  updateNotificationCampaignStatus(id: string, status: string): Promise<NotificationCampaign | undefined>;
  getNotificationRule(id: string): Promise<NotificationRule | undefined>;
  createNotificationRule(rule: InsertNotificationRule): Promise<NotificationRule>;
  listNotificationRules(): Promise<NotificationRule[]>;
  updateNotificationRule(
    id: string,
    patch: Partial<InsertNotificationRule>,
  ): Promise<NotificationRule | undefined>;
  logNotificationRule(entry: InsertNotificationRuleLog): Promise<void>;
  logNotificationEngagement(entry: InsertNotificationEngagement): Promise<void>;
  getNotificationEngagementStats(
    windowDays?: number,
  ): Promise<Array<{ category: string | null; total: number; read: number; interactions: number }>>;
  addNotificationCollaborators(notificationId: string, collaboratorIds: string[]): Promise<void>;
  getNotificationCollaborators(notificationId: string): Promise<NotificationCollaborator[]>;
  queueNotificationDigest(entry: InsertNotificationDigest): Promise<NotificationDigest>;
  updateNotificationDigestPayload(id: string, payload: unknown): Promise<void>;
  listPendingDigests(before: Date): Promise<NotificationDigest[]>;
  markDigestSent(id: string): Promise<void>;
  getOpenDigestForUser(userId: string): Promise<NotificationDigest | undefined>;
  upsertNotificationDelegation(entry: InsertNotificationDelegation): Promise<NotificationDelegation>;
  getActiveDelegation(userId: string): Promise<NotificationDelegation | undefined>;

  createCobrowsingSession(entry: InsertCobrowsingSession): Promise<CobrowsingSession>;
  assignCobrowsingAgent(sessionId: string, agentId: string): Promise<CobrowsingSession | undefined>;
  endCobrowsingSession(sessionId: string): Promise<void>;
  getCobrowsingSession(sessionId: string): Promise<CobrowsingSession | undefined>;
  getCobrowsingSessionByToken(token: string): Promise<CobrowsingSession | undefined>;
  createCobrowsingSignal(entry: InsertCobrowsingSignal): Promise<CobrowsingSignal>;
  listCobrowsingSignals(sessionId: string): Promise<CobrowsingSignal[]>;
  createFeedback(entry: InsertFeedbackEntry): Promise<FeedbackEntry>;
  listFeedback(limit?: number): Promise<FeedbackEntry[]>;
  createSurvey(entry: InsertSurvey): Promise<Survey>;
  listSurveys(activeOnly?: boolean): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | undefined>;
  saveSurveyResponse(entry: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponses(surveyId: string): Promise<SurveyResponse[]>;
  getLoyaltyBalance(userId: string): Promise<LoyaltyPoint>;
  addLoyaltyTransaction(
    tx: InsertLoyaltyTransaction,
  ): Promise<{ transaction: LoyaltyTransaction; balance: number }>;
  listLoyaltyTransactions(userId: string, limit?: number): Promise<LoyaltyTransaction[]>;
  listMissions(activeOnly?: boolean): Promise<Mission[]>;
  getMissionProgressForUser(userId: string): Promise<MissionProgress[]>;
  updateMissionProgress(userId: string, missionId: string, delta: number): Promise<MissionProgress>;
  listRewardTiers(): Promise<RewardTier[]>;
  grantBadge(entry: InsertUserBadge): Promise<UserBadge>;
  listUserBadges(userId: string): Promise<UserBadge[]>;
  createKnowledgeArticle(entry: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  listKnowledgeArticles(params?: { search?: string; limit?: number }): Promise<KnowledgeArticle[]>;
  incrementKnowledgeHelpful(articleId: string): Promise<void>;
  createCobrowsingSession(entry: InsertCobrowsingSession): Promise<CobrowsingSession>;
  assignCobrowsingAgent(sessionId: string, agentId: string): Promise<CobrowsingSession | undefined>;
  endCobrowsingSession(sessionId: string): Promise<void>;
  getCobrowsingSession(sessionId: string): Promise<CobrowsingSession | undefined>;
  getCobrowsingSessionByToken(token: string): Promise<CobrowsingSession | undefined>;
  createCobrowsingSignal(entry: InsertCobrowsingSignal): Promise<CobrowsingSignal>;
  listCobrowsingSignals(sessionId: string): Promise<CobrowsingSignal[]>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: UpdateUser): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.created_at));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Vehicle methods
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: string, updateData: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .update(vehicles)
      .set(updateData)
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Trip methods
  async getTrip(id: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async getAllTrips(): Promise<Trip[]> {
    return await db.select().from(trips).orderBy(desc(trips.heure_depart_prevue));
  }

  async getTripsByIds(ids: string[]): Promise<Trip[]> {
    if (!ids.length) {
      return [];
    }
    return await db.select().from(trips).where(inArray(trips.id, ids));
  }

  async searchTrips(params: { depart?: string; arrivee?: string; date?: Date }): Promise<Trip[]> {
    const conditions = [];
    
    if (params.depart) {
      conditions.push(like(trips.point_depart, `%${params.depart}%`));
    }
    
    if (params.arrivee) {
      conditions.push(like(trips.point_arrivee, `%${params.arrivee}%`));
    }
    
    if (params.date) {
      const startOfDay = new Date(params.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(params.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      conditions.push(
        and(
          gte(trips.heure_depart_prevue, startOfDay),
          sql`${trips.heure_depart_prevue} <= ${endOfDay}`
        )
      );
    }

    if (conditions.length === 0) {
      return await this.getAllTrips();
    }

    return await db
      .select()
      .from(trips)
      .where(and(...conditions))
      .orderBy(trips.heure_depart_prevue);
  }

  async searchAdminTrips(params: { chauffeurId?: string; date?: Date; status?: string }): Promise<Trip[]> {
    const conditions = [];

    if (params.chauffeurId) {
      conditions.push(eq(trips.chauffeur_id, params.chauffeurId));
    }

    if (params.status) {
      conditions.push(eq(trips.status, params.status));
    }

    if (params.date) {
      const startOfDay = new Date(params.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(params.date);
      endOfDay.setHours(23, 59, 59, 999);

      conditions.push(
        and(
          gte(trips.heure_depart_prevue, startOfDay),
          sql`${trips.heure_depart_prevue} <= ${endOfDay}`,
        ),
      );
    }

    if (conditions.length === 0) {
      return await this.getAllTrips();
    }

    return await db
      .select()
      .from(trips)
      .where(and(...conditions))
      .orderBy(trips.heure_depart_prevue);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db.insert(trips).values(insertTrip).returning();
    return trip;
  }

  async updateTrip(id: string, updateData: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set(updateData)
      .where(eq(trips.id, id))
      .returning();
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    await db.delete(trips).where(eq(trips.id, id));
  }

  async getTripsByChauffeur(chauffeurId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.chauffeur_id, chauffeurId))
      .orderBy(trips.heure_depart_prevue);
  }

  async getTripLoadFactors(windowDays = 7): Promise<TripLoadFactor[]> {
    const horizon = Math.max(1, windowDays);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + horizon);

    const rows = await db
      .select({
        tripId: trips.id,
        depart: trips.point_depart,
        arrivee: trips.point_arrivee,
        departure: trips.heure_depart_prevue,
        capacity: trips.places_disponibles,
        reserved: sql<number>`coalesce(sum(${reservations.nombre_places}), 0)`,
        price: trips.prix,
        statut: trips.statut,
        vehicleId: trips.vehicle_id,
        chauffeurId: trips.chauffeur_id,
        vehicleStatus: vehicles.statut,
        vehicleImmatriculation: vehicles.immatriculation,
      })
      .from(trips)
      .leftJoin(reservations, eq(reservations.trip_id, trips.id))
      .leftJoin(vehicles, eq(vehicles.id, trips.vehicle_id))
      .where(
        and(
          gte(trips.heure_depart_prevue, start),
          lte(trips.heure_depart_prevue, end),
        ),
      )
      .groupBy(
        trips.id,
        trips.point_depart,
        trips.point_arrivee,
        trips.heure_depart_prevue,
        trips.places_disponibles,
        trips.prix,
        trips.statut,
        trips.vehicle_id,
        trips.chauffeur_id,
        vehicles.statut,
        vehicles.immatriculation,
      )
      .orderBy(trips.heure_depart_prevue);

    return rows.map((row) => ({
      tripId: row.tripId,
      depart: row.depart,
      arrivee: row.arrivee,
      departure: row.departure,
      capacity: Number(row.capacity ?? 0),
      reserved: Number(row.reserved ?? 0),
      price: Number(row.price ?? 0),
      statut: row.statut ?? null,
      vehicleId: row.vehicleId ?? null,
      chauffeurId: row.chauffeurId ?? null,
      vehicleStatus: row.vehicleStatus ?? null,
      vehicleImmatriculation: row.vehicleImmatriculation ?? null,
    }));
  }

  // Reservation methods
  async getReservation(id: string): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
    return reservation;
  }

  async getReservationsByClient(clientId: string): Promise<Reservation[]> {
    return await db
      .select()
      .from(reservations)
      .where(eq(reservations.client_id, clientId))
      .orderBy(desc(reservations.date_reservation));
  }

  async getReservationsByTrip(tripId: string): Promise<Reservation[]> {
    return await db
      .select()
      .from(reservations)
      .where(eq(reservations.trip_id, tripId));
  }

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const [reservation] = await db.insert(reservations).values(insertReservation).returning();
    
    // Update available places on trip
    const trip = await this.getTrip(insertReservation.trip_id);
    if (trip) {
      await this.updateTrip(insertReservation.trip_id, {
        places_disponibles: trip.places_disponibles - insertReservation.nombre_places
      });
    }
    
    return reservation;
  }

  async updateReservation(id: string, updateData: Partial<InsertReservation>): Promise<Reservation | undefined> {
    const [reservation] = await db
      .update(reservations)
      .set(updateData)
      .where(eq(reservations.id, id))
      .returning();
    return reservation;
  }

  async markReservationChecked(id: string, adminId: string): Promise<Reservation | undefined> {
    const [reservation] = await db
      .update(reservations)
      .set({ checked: true, checked_in_at: new Date(), checked_by_admin_id: adminId })
      .where(eq(reservations.id, id))
      .returning();
    return reservation;
  }

  async cancelReservation(id: string): Promise<void> {
    const reservation = await this.getReservation(id);
    if (reservation) {
      // Update status to cancelled
      await this.updateReservation(id, { statut: "annule" });
      
      // Return places to trip
      const trip = await this.getTrip(reservation.trip_id);
      if (trip) {
        await this.updateTrip(reservation.trip_id, {
          places_disponibles: trip.places_disponibles + reservation.nombre_places
        });
      }
    }
  }

  async saveReservationOptions(options: InsertReservationOptions): Promise<ReservationOptions> {
    const [saved] = await db
      .insert(reservationOptions)
      .values(options)
      .onConflictDoUpdate({
        target: reservationOptions.reservation_id,
        set: options,
      })
      .returning();
    return saved;
  }

  async addReservationGuest(entry: InsertReservationGuest): Promise<ReservationGuest> {
    const [guest] = await db.insert(reservationGuests).values(entry).returning();
    return guest;
  }

  async getGuestsByReservation(reservationId: string): Promise<ReservationGuest[]> {
    return await db.select().from(reservationGuests).where(eq(reservationGuests.reservation_id, reservationId));
  }

  async logUserActivity(activity: InsertUserActivity): Promise<void> {
    await db.insert(userActivity).values(activity);
  }

  async getUserHealth(userId: string): Promise<UserHealthMetrics | null> {
    const user = await this.getUser(userId);
    if (!user) {
      return null;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [loginStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.user_id, userId),
          eq(userActivity.event, "login"),
          gte(userActivity.created_at, sevenDaysAgo),
        ),
      );

    const [ipStats] = await db
      .select({ uniqueIps: sql<number>`count(distinct ${userActivity.ip})` })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.user_id, userId),
          gte(userActivity.created_at, twentyFourHoursAgo),
          sql`${userActivity.ip} is not null`,
        ),
      );

    const lastActivity = await db
      .select({
        created_at: userActivity.created_at,
        event: userActivity.event,
      })
      .from(userActivity)
      .where(eq(userActivity.user_id, userId))
      .orderBy(desc(userActivity.created_at))
      .limit(1);

    const ipThreshold = await this.getSecurityThresholdValue("max_ips_24h", 3);
    const minLoginsTarget = await this.getSecurityThresholdValue("min_logins_7d", 5);

    const anomalies: string[] = [];
    const uniqueIpsLast24h = Number(ipStats?.uniqueIps || 0);
    if (uniqueIpsLast24h > ipThreshold) {
      anomalies.push(`Connexions depuis ${uniqueIpsLast24h} IP sur 24h (seuil ${ipThreshold})`);
    }
    const loginsLast7Days = Number(loginStats?.total || 0);
    if (loginsLast7Days < minLoginsTarget / 2) {
      anomalies.push("Activité hebdomadaire très faible");
    }

    const baseScore = 60;
    const loginScore = Math.min((loginsLast7Days / Math.max(minLoginsTarget, 1)) * 30, 30);
    const mfaScore = user.mfa_enabled ? 10 : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(baseScore + loginScore + mfaScore - anomalies.length * 10)));

    return {
      loginsLast7Days,
      uniqueIpsLast24h,
      lastActivity: lastActivity[0]?.created_at ?? null,
      mfaEnabled: !!user.mfa_enabled,
      anomalies,
      healthScore,
    };
  }

  // Search logs
  async logSearch(entry: InsertSearchLog): Promise<SearchLog> {
    const [log] = await db.insert(searchLogs).values(entry).returning();
    return log;
  }

  async getRecentSearches(limit = 50): Promise<SearchLog[]> {
    return await db.select().from(searchLogs).orderBy(desc(searchLogs.date_recherche)).limit(limit);
  }

  async getSearchHistoryByUser(userId: string, limit = 20): Promise<SearchLog[]> {
    if (!userId) {
      return [];
    }
    return await db
      .select()
      .from(searchLogs)
      .where(eq(searchLogs.user_id, userId))
      .orderBy(desc(searchLogs.date_recherche))
      .limit(limit);
  }

  async getSearchStats(): Promise<{ depart: string | null; arrivee: string | null; total: number }[]> {
    return await db
      .select({
        depart: searchLogs.depart,
        arrivee: searchLogs.arrivee,
        total: sql<number>`count(*)`,
      })
      .from(searchLogs)
      .groupBy(searchLogs.depart, searchLogs.arrivee)
      .orderBy(desc(sql<number>`count(*)`));
  }

  async listOptimizationRecommendations(filters?: { status?: string[]; route?: string }) {
    const statuses = filters?.status?.map((status) => status?.trim()).filter(Boolean);
    const routeFilter = typeof filters?.route === "string" ? filters.route.trim() : undefined;
    const statusCondition =
      statuses && statuses.length > 0
        ? inArray(optimizationRecommendations.status, statuses)
        : undefined;
    const routeCondition = routeFilter
      ? or(
          like(optimizationRecommendations.route_from, `%${routeFilter}%`),
          like(optimizationRecommendations.route_to, `%${routeFilter}%`),
        )
      : undefined;
    const whereClause =
      statusCondition && routeCondition
        ? and(statusCondition, routeCondition)
        : statusCondition ?? routeCondition;
    const query = whereClause
      ? db.select().from(optimizationRecommendations).where(whereClause)
      : db.select().from(optimizationRecommendations);
    return await query.orderBy(desc(optimizationRecommendations.created_at));
  }

  async createOptimizationRecommendation(entry: InsertOptimizationRecommendation): Promise<OptimizationRecommendation> {
    const [record] = await db.insert(optimizationRecommendations).values(entry).returning();
    return record;
  }

  async updateOptimizationRecommendation(
    id: string,
    patch: Partial<InsertOptimizationRecommendation> & { status?: string },
  ): Promise<OptimizationRecommendation | undefined> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    sanitized.updated_at = new Date();
    const [record] = await db
      .update(optimizationRecommendations)
      .set(sanitized)
      .where(eq(optimizationRecommendations.id, id))
      .returning();
    return record;
  }

  async getIncidentsByChauffeur(chauffeurId: string): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .where(eq(incidents.chauffeur_id, chauffeurId))
      .orderBy(desc(incidents.created_at));
  }

  async createIncident(entry: InsertIncident): Promise<Incident> {
    const [incident] = await db.insert(incidents).values(entry).returning();
    return incident;
  }

  async getChauffeurStats(chauffeurId: string) {
    const driverTrips = await this.getTripsByChauffeur(chauffeurId);
    const now = new Date();
    let distanceKm = 0;
    let upcomingTrips = 0;
    let completedTrips = 0;

    for (const trip of driverTrips) {
      distanceKm += trip.distance_km ?? 0;
      if (trip.statut === "termine") {
        completedTrips += 1;
      } else if (new Date(trip.heure_depart_prevue) > now) {
        upcomingTrips += 1;
      }
    }

    return {
      totalTrips: driverTrips.length,
      upcomingTrips,
      completedTrips,
      distanceKm,
    };
  }

  async logProfileVersion(userId: string, payload: Record<string, unknown>): Promise<ProfileVersion> {
    const [version] = await db
      .insert(profileVersions)
      .values({
        user_id: userId,
        payload,
      } satisfies InsertProfileVersion)
      .returning();
    return version;
  }

  async getProfileVersions(userId: string, limit = 10): Promise<ProfileVersion[]> {
    return await db
      .select()
      .from(profileVersions)
      .where(eq(profileVersions.user_id, userId))
      .orderBy(desc(profileVersions.created_at))
      .limit(limit);
  }

  async getExperienceProfiles(userId: string): Promise<ExperiencePersonalization[]> {
    return await db
      .select()
      .from(experiencePersonalizations)
      .where(eq(experiencePersonalizations.user_id, userId))
      .orderBy(
        desc(experiencePersonalizations.is_active),
        desc(experiencePersonalizations.priority),
        desc(experiencePersonalizations.updated_at),
      );
  }

  async getPersonalizationState(userId: string, context?: string): Promise<ExperiencePersonalization | null> {
    const condition = context
      ? and(
          eq(experiencePersonalizations.user_id, userId),
          eq(experiencePersonalizations.context, context),
        )
      : eq(experiencePersonalizations.user_id, userId);

    const [profile] = await db
      .select()
      .from(experiencePersonalizations)
      .where(condition)
      .orderBy(
        desc(experiencePersonalizations.is_active),
        desc(experiencePersonalizations.priority),
        desc(experiencePersonalizations.updated_at),
      )
      .limit(1);
    return profile ?? null;
  }

  async savePersonalizationState(userId: string, payload: PersonalizationStateInput): Promise<ExperiencePersonalization> {
    const context = payload.context ?? "bureau";
    const now = new Date();
    let existing: ExperiencePersonalization | null = null;

    if (payload.profileId) {
      const [byId] = await db
        .select()
        .from(experiencePersonalizations)
        .where(
          and(
            eq(experiencePersonalizations.id, payload.profileId),
            eq(experiencePersonalizations.user_id, userId),
          ),
        );
      existing = byId ?? null;
    } else {
      existing = await this.getPersonalizationState(userId, context);
    }

    const metadata = payload.metadata ?? ((existing?.metadata as Record<string, unknown>) ?? {});
    const layout = payload.layoutConfig ?? existing?.layout_config ?? [];
    const theme = payload.themeConfig ?? existing?.theme_config ?? {};
    const accessibility = payload.accessibilityConfig ?? existing?.accessibility_config ?? {};
    const triggers = payload.triggers ?? (existing?.triggers as Record<string, unknown> | undefined);

    const updatePayload: Record<string, unknown> = {
      context,
      mode: payload.mode ?? existing?.mode ?? "standard",
      profile_name: payload.profileName ?? existing?.profile_name ?? context,
      layout_config: layout,
      theme_config: theme,
      accessibility_config: accessibility,
      presentation_mode: payload.presentationMode ?? existing?.presentation_mode ?? false,
      dynamic_theme: payload.dynamicTheme ?? existing?.dynamic_theme ?? true,
      metadata,
      priority: payload.priority ?? existing?.priority ?? 0,
      updated_at: now,
      cloud_synced_at: now,
    };

    if (triggers !== undefined) {
      updatePayload.triggers = triggers;
    }

    if (existing) {
      const [updated] = await db
        .update(experiencePersonalizations)
        .set(updatePayload)
        .where(eq(experiencePersonalizations.id, existing.id))
        .returning();
      return updated;
    }

    const insertValues: Record<string, unknown> = {
      user_id: userId,
      profile_name: updatePayload.profile_name,
      context,
      mode: updatePayload.mode,
      layout_config: layout,
      theme_config: theme,
      accessibility_config: accessibility,
      presentation_mode: updatePayload.presentation_mode,
      dynamic_theme: updatePayload.dynamic_theme,
      metadata,
      priority: updatePayload.priority,
      cloud_synced_at: now,
    };

    if (triggers !== undefined) {
      insertValues.triggers = triggers;
    }

    const [created] = await db
      .insert(experiencePersonalizations)
      .values(insertValues as typeof experiencePersonalizations.$inferInsert)
      .returning();
    return created;
  }

  async createExperienceProfile(profile: InsertExperiencePersonalization): Promise<ExperiencePersonalization> {
    const insertValues: Record<string, unknown> = {
      ...profile,
      cloud_synced_at: new Date(),
      updated_at: new Date(),
    };
    const [created] = await db
      .insert(experiencePersonalizations)
      .values(insertValues as typeof experiencePersonalizations.$inferInsert)
      .returning();
    return created;
  }

  async updateExperienceProfile(
    profileId: string,
    userId: string,
    patch: Partial<InsertExperiencePersonalization>,
  ): Promise<ExperiencePersonalization | undefined> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    sanitized.updated_at = new Date();
    sanitized["cloud_synced_at"] = new Date();

    const [updated] = await db
      .update(experiencePersonalizations)
      .set(sanitized)
      .where(
        and(
          eq(experiencePersonalizations.id, profileId),
          eq(experiencePersonalizations.user_id, userId),
        ),
      )
      .returning();
    return updated;
  }

  async getAccessibilitySettings(userId: string): Promise<AccessibilitySetting> {
    const [settings] = await db.select().from(accessibilitySettings).where(eq(accessibilitySettings.user_id, userId));
    if (settings) {
      return settings;
    }
    const [created] = await db
      .insert(accessibilitySettings)
      .values({
        user_id: userId,
      })
      .returning();
    return created;
  }

  async saveAccessibilitySettings(
    userId: string,
    patch: Partial<InsertAccessibilitySetting>,
  ): Promise<AccessibilitySetting> {
    await this.getAccessibilitySettings(userId);
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    sanitized.updated_at = new Date();

    const [updated] = await db
      .update(accessibilitySettings)
      .set(sanitized)
      .where(eq(accessibilitySettings.user_id, userId))
      .returning();
    return updated ?? (await this.getAccessibilitySettings(userId));
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.user_id, userId));
    if (prefs) {
      return prefs;
    }
    return {
      user_id: userId,
      channels: { email: true, push: true, sms: false },
      priority_threshold: "normal",
      quiet_mode: false,
      quiet_hours: null,
      updated_at: new Date(0),
    } as NotificationPreference;
  }

  async saveNotificationPreferences(
    userId: string,
    prefs: Partial<InsertNotificationPreference>,
  ): Promise<NotificationPreference> {
    const now = new Date();
    const values: InsertNotificationPreference = { user_id: userId };
    const updateSet: Record<string, unknown> = { updated_at: now };

    if (prefs.channels !== undefined) {
      values.channels = prefs.channels;
      updateSet.channels = prefs.channels;
    }
    if (prefs.priority_threshold !== undefined) {
      values.priority_threshold = prefs.priority_threshold;
      updateSet.priority_threshold = prefs.priority_threshold;
    }
    if (prefs.quiet_mode !== undefined) {
      values.quiet_mode = prefs.quiet_mode;
      updateSet.quiet_mode = prefs.quiet_mode;
    }
    if (prefs.quiet_hours !== undefined) {
      values.quiet_hours = prefs.quiet_hours;
      updateSet.quiet_hours = prefs.quiet_hours;
    }

    if (prefs.context_filters !== undefined) {
      values.context_filters = prefs.context_filters;
      updateSet.context_filters = prefs.context_filters;
    }

    if (prefs.vacation_mode !== undefined) {
      values.vacation_mode = prefs.vacation_mode;
      updateSet.vacation_mode = prefs.vacation_mode;
    }

    if (prefs.vacation_delegate_user_id !== undefined) {
      values.vacation_delegate_user_id = prefs.vacation_delegate_user_id;
      updateSet.vacation_delegate_user_id = prefs.vacation_delegate_user_id;
    }

    if (prefs.vacation_until !== undefined) {
      values.vacation_until = prefs.vacation_until;
      updateSet.vacation_until = prefs.vacation_until;
    }

    const [saved] = await db
      .insert(notificationPreferences)
      .values(values)
      .onConflictDoUpdate({
        target: notificationPreferences.user_id,
        set: updateSet,
      })
      .returning();
    return saved;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [entry] = await db.insert(notifications).values(notification).returning();
    return entry;
  }

  async getNotification(notificationId: string): Promise<Notification | undefined> {
    const [entry] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
    return entry;
  }

  async updateNotification(
    notificationId: string,
    patch: Partial<Notification>,
  ): Promise<Notification | undefined> {
    const [entry] = await db
      .update(notifications)
      .set(patch)
      .where(eq(notifications.id, notificationId))
      .returning();
    return entry;
  }

  async listNotifications(
    userId: string,
    options: { includeRead?: boolean; limit?: number } = {},
  ): Promise<Notification[]> {
    const condition = options.includeRead
      ? eq(notifications.user_id, userId)
      : and(eq(notifications.user_id, userId), eq(notifications.read, false));

    return await db
      .select()
      .from(notifications)
      .where(condition)
      .orderBy(desc(notifications.created_at))
      .limit(options.limit ?? 25);
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ read: true, read_at: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.user_id, userId)))
      .returning();
    return updated;
  }

  async getNotificationRule(id: string): Promise<NotificationRule | undefined> {
    const [rule] = await db.select().from(notificationRules).where(eq(notificationRules.id, id));
    return rule;
  }

  async createNotificationRule(rule: InsertNotificationRule): Promise<NotificationRule> {
    const [entry] = await db.insert(notificationRules).values(rule).returning();
    return entry;
  }

  async listNotificationRules(): Promise<NotificationRule[]> {
    return await db.select().from(notificationRules).orderBy(desc(notificationRules.created_at));
  }

  async updateNotificationRule(
    id: string,
    patch: Partial<InsertNotificationRule>,
  ): Promise<NotificationRule | undefined> {
    const [entry] = await db
      .update(notificationRules)
      .set(patch)
      .where(eq(notificationRules.id, id))
      .returning();
    return entry;
  }

  async logNotificationRule(entry: InsertNotificationRuleLog): Promise<void> {
    await db.insert(notificationRuleLogs).values(entry);
  }

  async logNotificationEngagement(entry: InsertNotificationEngagement): Promise<void> {
    await db.insert(notificationEngagements).values(entry);
  }

  async getNotificationEngagementStats(windowDays = 7) {
    const start = new Date();
    start.setDate(start.getDate() - Math.max(windowDays, 1));

    const rows = await db
      .select({
        category: notifications.category,
        total: sql<number>`count(distinct ${notifications.id})`,
        read: sql<number>`count(*) filter (where ${notifications.read} = true)`,
        interactions: sql<number>`count(*) filter (where ${notificationEngagements.event} in ('clicked','action'))`,
      })
      .from(notifications)
      .leftJoin(
        notificationEngagements,
        eq(notifications.id, notificationEngagements.notification_id),
      )
      .where(gte(notifications.created_at, start))
      .groupBy(notifications.category);

    return rows;
  }

  async addNotificationCollaborators(notificationId: string, collaboratorIds: string[]): Promise<void> {
    if (collaboratorIds.length === 0) return;
    await db
      .insert(notificationCollaborators)
      .values(
        collaboratorIds.map(
          (collaborator_user_id) =>
            ({
              notification_id: notificationId,
              collaborator_user_id,
            }) satisfies InsertNotificationCollaborator,
        ),
      )
      .onConflictDoNothing();
  }

  async getNotificationCollaborators(notificationId: string): Promise<NotificationCollaborator[]> {
    return await db
      .select()
      .from(notificationCollaborators)
      .where(eq(notificationCollaborators.notification_id, notificationId));
  }

  async queueNotificationDigest(entry: InsertNotificationDigest): Promise<NotificationDigest> {
    const [digest] = await db.insert(notificationDigests).values(entry).returning();
    return digest;
  }

  async updateNotificationDigestPayload(id: string, payload: unknown): Promise<void> {
    await db.update(notificationDigests).set({ payload }).where(eq(notificationDigests.id, id));
  }

  async getOpenDigestForUser(userId: string): Promise<NotificationDigest | undefined> {
    const now = new Date();
    const [digest] = await db
      .select()
      .from(notificationDigests)
      .where(
        and(
          eq(notificationDigests.user_id, userId),
          eq(notificationDigests.sent, false),
          gte(notificationDigests.scheduled_for, now),
        ),
      )
      .orderBy(notificationDigests.scheduled_for);
    return digest;
  }

  async listPendingDigests(before: Date): Promise<NotificationDigest[]> {
    return await db
      .select()
      .from(notificationDigests)
      .where(and(eq(notificationDigests.sent, false), lte(notificationDigests.scheduled_for, before)));
  }

  async markDigestSent(id: string): Promise<void> {
    await db
      .update(notificationDigests)
      .set({ sent: true, sent_at: new Date() })
      .where(eq(notificationDigests.id, id));
  }

  async upsertNotificationDelegation(entry: InsertNotificationDelegation): Promise<NotificationDelegation> {
    const [record] = await db
      .insert(notificationDelegations)
      .values(entry)
      .onConflictDoUpdate({
        target: notificationDelegations.user_id,
        set: {
          delegate_user_id: entry.delegate_user_id,
          start_at: entry.start_at ?? new Date(),
          end_at: entry.end_at,
          active: entry.active ?? true,
        },
      })
      .returning();
    return record;
  }

  async getActiveDelegation(userId: string): Promise<NotificationDelegation | undefined> {
    const now = new Date();
    const [delegation] = await db
      .select()
      .from(notificationDelegations)
      .where(
        and(
          eq(notificationDelegations.user_id, userId),
          eq(notificationDelegations.active, true),
          or(
            sql`${notificationDelegations.end_at} is null`,
            gte(notificationDelegations.end_at, now),
          ),
        ),
      );
    if (!delegation) return undefined;
    return delegation;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [record] = await db.insert(supportTickets).values(ticket).returning();
    return record;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [record] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return record;
  }

  async listSupportTickets(options: { userId?: string; status?: string; limit?: number }): Promise<SupportTicket[]> {
    const whereClauses: any[] = [];
    if (options.userId) {
      whereClauses.push(eq(supportTickets.user_id, options.userId));
    }
    if (options.status) {
      whereClauses.push(eq(supportTickets.statut, options.status));
    }

    const condition =
      whereClauses.length === 0
        ? null
        : whereClauses.length === 1
          ? whereClauses[0]
          : and(...whereClauses);

    const query = condition
      ? db.select().from(supportTickets).where(condition)
      : db.select().from(supportTickets);

    return await query.orderBy(desc(supportTickets.created_at)).limit(options.limit ?? 50);
  }

  async updateSupportTicket(id: string, patch: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const [record] = await db
      .update(supportTickets)
      .set({ ...patch, updated_at: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return record;
  }

  async addTicketMessage(entry: InsertTicketMessage): Promise<TicketMessage> {
    const [message] = await db.insert(ticketMessages).values(entry).returning();
    return message;
  }

  async listTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticket_id, ticketId))
      .orderBy(ticketMessages.created_at);
  }

  async createKnowledgeArticle(entry: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [article] = await db.insert(knowledgeArticles).values(entry).returning();
    return article;
  }

  async listKnowledgeArticles(params: { search?: string; limit?: number } = {}): Promise<KnowledgeArticle[]> {
    const { search, limit } = params;
    if (search) {
      const pattern = `%${search}%`;
      return await db
        .select()
        .from(knowledgeArticles)
        .where(or(ilike(knowledgeArticles.title, pattern), ilike(knowledgeArticles.content, pattern)))
        .orderBy(desc(knowledgeArticles.updated_at))
        .limit(limit ?? 20);
    }
    return await db
      .select()
      .from(knowledgeArticles)
      .orderBy(desc(knowledgeArticles.updated_at))
      .limit(limit ?? 20);
  }

  async incrementKnowledgeHelpful(articleId: string): Promise<void> {
    await db
      .update(knowledgeArticles)
      .set({ helpful_count: sql<number>`${knowledgeArticles.helpful_count} + 1` })
      .where(eq(knowledgeArticles.id, articleId));
  }

  async createNotificationSegment(segment: InsertNotificationSegment): Promise<NotificationSegment> {
    const [entry] = await db.insert(notificationSegments).values(segment).returning();
    return entry;
  }

  async getNotificationSegment(id: string): Promise<NotificationSegment | undefined> {
    const [segment] = await db.select().from(notificationSegments).where(eq(notificationSegments.id, id));
    return segment;
  }

  async listNotificationSegments(): Promise<NotificationSegment[]> {
    return await db.select().from(notificationSegments).orderBy(desc(notificationSegments.created_at));
  }

  async createNotificationCampaign(campaign: InsertNotificationCampaign): Promise<NotificationCampaign> {
    const [entry] = await db.insert(notificationCampaigns).values(campaign).returning();
    return entry;
  }

  async getNotificationCampaign(id: string): Promise<NotificationCampaign | undefined> {
    const [campaign] = await db.select().from(notificationCampaigns).where(eq(notificationCampaigns.id, id));
    return campaign;
  }

  async listNotificationCampaigns(): Promise<NotificationCampaign[]> {
    return await db.select().from(notificationCampaigns).orderBy(desc(notificationCampaigns.created_at));
  }

  async updateNotificationCampaignStatus(
    id: string,
    status: string,
  ): Promise<NotificationCampaign | undefined> {
    const [entry] = await db
      .update(notificationCampaigns)
      .set({ status })
      .where(eq(notificationCampaigns.id, id))
      .returning();
    return entry;
  }

  async createCobrowsingSession(entry: InsertCobrowsingSession): Promise<CobrowsingSession> {
    const [session] = await db.insert(cobrowsingSessions).values(entry).returning();
    return session;
  }

  async assignCobrowsingAgent(sessionId: string, agentId: string): Promise<CobrowsingSession | undefined> {
    const [session] = await db
      .update(cobrowsingSessions)
      .set({ support_agent_id: agentId, status: "active" })
      .where(eq(cobrowsingSessions.id, sessionId))
      .returning();
    return session;
  }

  async endCobrowsingSession(sessionId: string): Promise<void> {
    await db
      .update(cobrowsingSessions)
      .set({ status: "ended", ended_at: new Date() })
      .where(eq(cobrowsingSessions.id, sessionId));
  }

  async getCobrowsingSession(sessionId: string): Promise<CobrowsingSession | undefined> {
    const [session] = await db.select().from(cobrowsingSessions).where(eq(cobrowsingSessions.id, sessionId));
    return session;
  }

  async getCobrowsingSessionByToken(token: string): Promise<CobrowsingSession | undefined> {
    const [session] = await db.select().from(cobrowsingSessions).where(eq(cobrowsingSessions.token, token));
    return session;
  }

  async createCobrowsingSignal(entry: InsertCobrowsingSignal): Promise<CobrowsingSignal> {
    const [signal] = await db.insert(cobrowsingSignals).values(entry).returning();
    return signal;
  }

  async listCobrowsingSignals(sessionId: string): Promise<CobrowsingSignal[]> {
    return await db
      .select()
      .from(cobrowsingSignals)
      .where(eq(cobrowsingSignals.session_id, sessionId))
      .orderBy(desc(cobrowsingSignals.created_at));
  }

  async createFeedback(entry: InsertFeedbackEntry): Promise<FeedbackEntry> {
    const [feedback] = await db.insert(feedbackEntries).values(entry).returning();
    return feedback;
  }

  async listFeedback(limit = 50): Promise<FeedbackEntry[]> {
    return await db.select().from(feedbackEntries).orderBy(desc(feedbackEntries.created_at)).limit(limit);
  }

  async createSurvey(entry: InsertSurvey): Promise<Survey> {
    const [survey] = await db.insert(surveys).values(entry).returning();
    return survey;
  }

  async listSurveys(activeOnly = true): Promise<Survey[]> {
    if (activeOnly) {
      return await db.select().from(surveys).where(eq(surveys.active, true)).orderBy(desc(surveys.created_at));
    }
    return await db.select().from(surveys).orderBy(desc(surveys.created_at));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async saveSurveyResponse(entry: InsertSurveyResponse): Promise<SurveyResponse> {
    const [response] = await db.insert(surveyResponses).values(entry).returning();
    return response;
  }

  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    return await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.survey_id, surveyId))
      .orderBy(desc(surveyResponses.submitted_at));
  }

  async getLoyaltyBalance(userId: string): Promise<LoyaltyPoint> {
    const [record] = await db.select().from(loyaltyPoints).where(eq(loyaltyPoints.user_id, userId));
    if (record) {
      return record;
    }
    return {
      user_id: userId,
      balance: 0,
      updated_at: new Date(0),
    } as LoyaltyPoint;
  }

  async addLoyaltyTransaction(
    tx: InsertLoyaltyTransaction,
  ): Promise<{ transaction: LoyaltyTransaction; balance: number }> {
    const [transaction] = await db.insert(loyaltyTransactions).values(tx).returning();
    const [existing] = await db.select().from(loyaltyPoints).where(eq(loyaltyPoints.user_id, tx.user_id));
    const delta = tx.type === "credit" ? tx.amount : -tx.amount;
    const newBalance = Math.max(0, Number(existing?.balance ?? 0) + delta);
    if (existing) {
      await db
        .update(loyaltyPoints)
        .set({ balance: newBalance, updated_at: new Date() })
        .where(eq(loyaltyPoints.user_id, tx.user_id));
    } else {
      await db.insert(loyaltyPoints).values({ user_id: tx.user_id, balance: newBalance });
    }
    return { transaction, balance: newBalance };
  }

  async listLoyaltyTransactions(userId: string, limit = 25): Promise<LoyaltyTransaction[]> {
    return await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.user_id, userId))
      .orderBy(desc(loyaltyTransactions.created_at))
      .limit(limit);
  }

  async listMissions(activeOnly = true): Promise<Mission[]> {
    if (activeOnly) {
      return await db.select().from(missions).where(eq(missions.active, true)).orderBy(desc(missions.created_at));
    }
    return await db.select().from(missions).orderBy(desc(missions.created_at));
  }

  async getMissionProgressForUser(userId: string): Promise<MissionProgress[]> {
    return await db
      .select()
      .from(missionProgress)
      .where(eq(missionProgress.user_id, userId))
      .orderBy(desc(missionProgress.updated_at));
  }

  async updateMissionProgress(userId: string, missionId: string, delta: number): Promise<MissionProgress> {
    const [mission] = await db.select().from(missions).where(eq(missions.id, missionId));
    if (!mission) {
      throw new Error("Mission introuvable");
    }
    const [current] = await db
      .select()
      .from(missionProgress)
      .where(and(eq(missionProgress.user_id, userId), eq(missionProgress.mission_id, missionId)));
    const targetPoints = mission.points ?? 0;
    const progressValue = Math.max(0, Number(current?.progress ?? 0) + delta);
    const completed = progressValue >= targetPoints && targetPoints > 0;
    const timestamp = new Date();

    if (current) {
      const [updated] = await db
        .update(missionProgress)
        .set({
          progress: progressValue,
          completed,
          completed_at: completed ? timestamp : current.completed_at,
          updated_at: timestamp,
        })
        .where(eq(missionProgress.id, current.id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(missionProgress)
      .values({
        mission_id: missionId,
        user_id: userId,
        progress: progressValue,
        completed,
        completed_at: completed ? timestamp : null,
      } satisfies InsertMissionProgress)
      .returning();
    return inserted;
  }

  async listRewardTiers(): Promise<RewardTier[]> {
    return await db.select().from(rewardTiers).orderBy(rewardTiers.min_points);
  }

  async grantBadge(entry: InsertUserBadge): Promise<UserBadge> {
    const [badge] = await db.insert(userBadges).values(entry).returning();
    return badge;
  }

  async listUserBadges(userId: string): Promise<UserBadge[]> {
    return await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.user_id, userId))
      .orderBy(desc(userBadges.awarded_at));
  }

  private async getSecurityThresholdValue(key: string, fallback: number): Promise<number> {
    const [threshold] = await db.select().from(securityThresholds).where(eq(securityThresholds.key, key));
    if (!threshold) {
      await db
        .insert(securityThresholds)
        .values({ key, value: fallback, description: `Seuil par défaut pour ${key}` })
        .onConflictDoNothing();
      return fallback;
    }
    return threshold.value;
  }

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(startToday);
    startMonth.setDate(1);

    const [[{ value: totalUsers }], [{ value: totalVehicles }], [{ value: totalTrips }]] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(users),
      db.select({ value: sql<number>`count(*)` }).from(vehicles),
      db.select({ value: sql<number>`count(*)` }).from(trips),
    ]);

    const [[{ value: activeTrips }]] = await Promise.all([
      db
        .select({
          value: sql<number>`count(*)`,
        })
        .from(trips)
        .where(or(eq(trips.statut, "planifie"), eq(trips.statut, "en_cours"))),
    ]);

    const [[{ reservationsToday, revenueToday }]] = await Promise.all([
      db
        .select({
          reservationsToday: sql<number>`count(*)`,
          revenueToday: sql<number>`coalesce(sum(${reservations.montant_total}),0)`,
        })
        .from(reservations)
        .where(gte(reservations.date_reservation, startToday)),
    ]);

    const [[{ revenueMonth }]] = await Promise.all([
      db
        .select({
          revenueMonth: sql<number>`coalesce(sum(${reservations.montant_total}),0)`,
        })
        .from(reservations)
        .where(gte(reservations.date_reservation, startMonth)),
    ]);

    const [[{ incidentsOpen }]] = await Promise.all([
      db
        .select({ incidentsOpen: sql<number>`count(*)` })
        .from(incidents)
        .where(sql`${incidents.statut} = 'ouvert' OR ${incidents.statut} = 'en_cours'`),
    ]);

    return {
      totals: {
        users: totalUsers,
        vehicles: totalVehicles,
        trips: totalTrips,
      },
      activeTrips,
      reservationsToday,
      revenueToday,
      revenueMonth,
      incidentsOpen,
    };
  }

  async getReservationTrends(days: number) {
    const startRange = new Date();
    startRange.setHours(0, 0, 0, 0);
    startRange.setDate(startRange.getDate() - (days - 1));

    const rows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${reservations.date_reservation}), 'YYYY-MM-DD')`,
        reservations: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${reservations.montant_total}),0)`,
      })
      .from(reservations)
      .where(gte(reservations.date_reservation, startRange))
      .groupBy(sql`date_trunc('day', ${reservations.date_reservation})`)
      .orderBy(sql`date_trunc('day', ${reservations.date_reservation})`);

    return rows;
  }

  async getRecentIncidents(limit = 5): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .where(sql`${incidents.statut} = 'ouvert' OR ${incidents.statut} = 'en_cours'`)
      .orderBy(desc(incidents.created_at))
      .limit(limit);
  }

  async listOptimizationRules(): Promise<OptimizationRule[]> {
    try {
      return await db
        .select()
        .from(optimizationRules)
        .orderBy(desc(optimizationRules.updated_at));
    } catch (err) {
      console.warn("listOptimizationRules: database error (table may be missing)", err?.message || err);
      return [];
    }
  }

  async createOptimizationRule(entry: InsertOptimizationRule): Promise<OptimizationRule> {
    const [record] = await db.insert(optimizationRules).values(entry).returning();
    return record;
  }

  async updateOptimizationRule(id: string, patch: Partial<InsertOptimizationRule>): Promise<OptimizationRule | undefined> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    sanitized.updated_at = new Date();
    const [record] = await db
      .update(optimizationRules)
      .set(sanitized)
      .where(eq(optimizationRules.id, id))
      .returning();
    return record;
  }
}

type DashboardSnapshot = {
  totals: { users: number; vehicles: number; trips: number };
  activeTrips: number;
  reservationsToday: number;
  revenueToday: number;
  revenueMonth: number;
  incidentsOpen: number;
};

type UserHealthMetrics = {
  loginsLast7Days: number;
  uniqueIpsLast24h: number;
  lastActivity: Date | null;
  mfaEnabled: boolean;
  anomalies: string[];
  healthScore: number;
};

export const storage = new DbStorage();
