import { 
  users, organizations, demoStations, controlConfigurations, sessions, 
  telemetryData, commands, userOrganizations,
  type User, type InsertUser, type Organization, type InsertOrganization,
  type DemoStation, type InsertDemoStation, type ControlConfiguration, 
  type InsertControlConfiguration, type Session, type InsertSession,
  type TelemetryData, type InsertTelemetryData, type Command, type InsertCommand,
  type UserOrganization, type InsertUserOrganization
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

// Generate unique UUID for demo stations
export function generateStationId(): string {
  const chars = '0123456789abcdef';
  const sections = [8, 4, 4, 4, 12];
  let uuid = '';
  
  for (let i = 0; i < sections.length; i++) {
    if (i > 0) uuid += '-';
    for (let j = 0; j < sections[i]; j++) {
      uuid += chars[Math.floor(Math.random() * 16)];
    }
  }
  
  return uuid;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  
  // User-Organization Relationships
  getUserOrganizations(userId: number): Promise<(UserOrganization & { organization: Organization })[]>;
  addUserToOrganization(userOrg: InsertUserOrganization): Promise<UserOrganization>;
  getUserRole(userId: number, organizationId: number): Promise<string | undefined>;

  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // Demo Stations
  getDemoStation(id: string): Promise<DemoStation | undefined>;
  getDemoStationsByOrganization(organizationId: number): Promise<DemoStation[]>;
  createDemoStation(station: InsertDemoStation): Promise<DemoStation>;
  updateDemoStation(id: string, updates: Partial<InsertDemoStation>): Promise<DemoStation | undefined>;
  updateDemoStationHeartbeat(id: string): Promise<void>;
  deleteDemoStation(id: string): Promise<void>;

  // Control Configurations
  getControlConfiguration(demoStationId: string): Promise<ControlConfiguration | undefined>;
  createControlConfiguration(config: InsertControlConfiguration): Promise<ControlConfiguration>;
  updateControlConfiguration(id: number, updates: Partial<InsertControlConfiguration>): Promise<ControlConfiguration | undefined>;

  // Sessions
  getSession(id: number): Promise<Session | undefined>;
  getActiveSession(demoStationId: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, updates: Partial<InsertSession>): Promise<Session | undefined>;
  endSession(id: number): Promise<void>;

  // Telemetry
  getTelemetryData(demoStationId: string, limit?: number): Promise<TelemetryData[]>;
  createTelemetryData(data: InsertTelemetryData): Promise<TelemetryData>;

  // Commands
  getCommand(id: number): Promise<Command | undefined>;
  getCommandsBySession(sessionId: number): Promise<Command[]>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: number, updates: Partial<InsertCommand>): Promise<Command | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(insertOrg)
      .returning();
    return org;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, id))
      .returning();
    return org || undefined;
  }

  // Demo Stations
  async getDemoStation(id: string): Promise<DemoStation | undefined> {
    try {
      console.log('Storage: Looking for station with ID:', id);
      const [station] = await db.select().from(demoStations).where(eq(demoStations.id, id));
      console.log('Storage: Found station:', station);
      return station || undefined;
    } catch (error) {
      console.error('Storage: Error fetching station:', error);
      return undefined;
    }
  }

  async getDemoStationsByOrganization(organizationId: number): Promise<DemoStation[]> {
    return await db
      .select()
      .from(demoStations)
      .where(eq(demoStations.organizationId, organizationId))
      .orderBy(asc(demoStations.name));
  }

  async createDemoStation(insertStation: InsertDemoStation): Promise<DemoStation> {
    const stationId = generateStationId();
    const [station] = await db
      .insert(demoStations)
      .values({ ...insertStation, id: stationId })
      .returning();
    return station;
  }

  async updateDemoStation(id: string, updates: Partial<InsertDemoStation>): Promise<DemoStation | undefined> {
    const [station] = await db
      .update(demoStations)
      .set(updates)
      .where(eq(demoStations.id, id))
      .returning();
    return station || undefined;
  }

  async updateDemoStationHeartbeat(id: string): Promise<void> {
    await db
      .update(demoStations)
      .set({ 
        lastHeartbeat: new Date(),
        isOnline: true 
      })
      .where(eq(demoStations.id, id));
  }

  async deleteDemoStation(id: string): Promise<void> {
    await db.delete(demoStations).where(eq(demoStations.id, id));
  }

  // Control Configurations
  async getControlConfiguration(demoStationId: string): Promise<ControlConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(controlConfigurations)
      .where(eq(controlConfigurations.demoStationId, demoStationId))
      .orderBy(desc(controlConfigurations.createdAt));
    return config || undefined;
  }

  async createControlConfiguration(insertConfig: InsertControlConfiguration): Promise<ControlConfiguration> {
    const [config] = await db
      .insert(controlConfigurations)
      .values(insertConfig)
      .returning();
    return config;
  }

  async updateControlConfiguration(id: number, updates: Partial<InsertControlConfiguration>): Promise<ControlConfiguration | undefined> {
    const [config] = await db
      .update(controlConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(controlConfigurations.id, id))
      .returning();
    return config || undefined;
  }

  // Sessions
  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getActiveSession(demoStationId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.demoStationId, demoStationId),
        eq(sessions.isActive, true)
      ))
      .orderBy(desc(sessions.startTime));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateSession(id: number, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async endSession(id: number): Promise<void> {
    const session = await this.getSession(id);
    if (session && session.startTime) {
      const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
      await db
        .update(sessions)
        .set({
          endTime: new Date(),
          duration,
          isActive: false
        })
        .where(eq(sessions.id, id));
    }
  }

  // Telemetry
  async getTelemetryData(demoStationId: string, limit: number = 100): Promise<TelemetryData[]> {
    return await db
      .select()
      .from(telemetryData)
      .where(eq(telemetryData.demoStationId, demoStationId))
      .orderBy(desc(telemetryData.timestamp))
      .limit(limit);
  }

  async createTelemetryData(insertData: InsertTelemetryData): Promise<TelemetryData> {
    const [data] = await db
      .insert(telemetryData)
      .values(insertData)
      .returning();
    return data;
  }

  // Commands
  async getCommand(id: number): Promise<Command | undefined> {
    const [command] = await db.select().from(commands).where(eq(commands.id, id));
    return command || undefined;
  }

  async getCommandsBySession(sessionId: number): Promise<Command[]> {
    return await db
      .select()
      .from(commands)
      .where(eq(commands.sessionId, sessionId))
      .orderBy(desc(commands.timestamp));
  }

  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const [command] = await db
      .insert(commands)
      .values(insertCommand)
      .returning();
    return command;
  }

  async updateCommand(id: number, updates: Partial<InsertCommand>): Promise<Command | undefined> {
    const [command] = await db
      .update(commands)
      .set(updates)
      .where(eq(commands.id, id))
      .returning();
    return command || undefined;
  }

  // User-Organization methods
  async getUserOrganizations(userId: number): Promise<(UserOrganization & { organization: Organization })[]> {
    const result = await db
      .select()
      .from(userOrganizations)
      .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(eq(userOrganizations.userId, userId));
    
    return result.map(row => ({
      ...row.user_organizations,
      organization: row.organizations
    }));
  }

  async addUserToOrganization(userOrg: InsertUserOrganization): Promise<UserOrganization> {
    const [result] = await db
      .insert(userOrganizations)
      .values(userOrg)
      .returning();
    return result;
  }

  async getUserRole(userId: number, organizationId: number): Promise<string | undefined> {
    const [result] = await db
      .select({ role: userOrganizations.role })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.organizationId, organizationId)
        )
      );
    return result?.role;
  }
}

export const storage = new DatabaseStorage();
