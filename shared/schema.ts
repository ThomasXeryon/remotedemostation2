import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#3b82f6"),
  secondaryColor: text("secondary_color").default("#1e293b"),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userOrganizations = pgTable("user_organizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id").notNull(),
  role: text("role").notNull().default("viewer"), // admin, operator, viewer
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const demoStations = pgTable("demo_stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  cameraCount: integer("camera_count").default(1).notNull(),
  sessionTimeLimit: integer("session_time_limit").default(30).notNull(), // minutes
  requiresLogin: boolean("requires_login").default(false).notNull(),
  lastHeartbeat: timestamp("last_heartbeat"),
  configuration: jsonb("configuration").default('{}').notNull(),
  safetyLimits: jsonb("safety_limits").default('{}').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const controlConfigurations = pgTable("control_configurations", {
  id: serial("id").primaryKey(),
  demoStationId: integer("demo_station_id").notNull(),
  controls: jsonb("controls").notNull(), // Array of control definitions
  layout: jsonb("layout").notNull(), // Positioning and layout info
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  demoStationId: integer("demo_station_id").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  commandsExecuted: integer("commands_executed").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const telemetryData = pgTable("telemetry_data", {
  id: serial("id").primaryKey(),
  demoStationId: integer("demo_station_id").notNull(),
  sessionId: integer("session_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  position: text("position"),
  velocity: text("velocity"),
  load: text("load"),
  temperature: text("temperature"),
  rawData: jsonb("raw_data"),
});

export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: integer("user_id").notNull(),
  demoStationId: integer("demo_station_id").notNull(),
  command: text("command").notNull(),
  parameters: jsonb("parameters"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("pending"), // pending, executed, failed
  response: jsonb("response"),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  userOrganizations: many(userOrganizations),
  demoStations: many(demoStations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userOrganizations: many(userOrganizations),
  sessions: many(sessions),
  commands: many(commands),
  controlConfigurations: many(controlConfigurations),
}));

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, {
    fields: [userOrganizations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  }),
}));

export const demoStationsRelations = relations(demoStations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [demoStations.organizationId],
    references: [organizations.id],
  }),
  controlConfigurations: many(controlConfigurations),
  sessions: many(sessions),
  telemetryData: many(telemetryData),
  commands: many(commands),
}));

export const controlConfigurationsRelations = relations(controlConfigurations, ({ one }) => ({
  demoStation: one(demoStations, {
    fields: [controlConfigurations.demoStationId],
    references: [demoStations.id],
  }),
  createdByUser: one(users, {
    fields: [controlConfigurations.createdBy],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  demoStation: one(demoStations, {
    fields: [sessions.demoStationId],
    references: [demoStations.id],
  }),
  telemetryData: many(telemetryData),
  commands: many(commands),
}));

export const telemetryDataRelations = relations(telemetryData, ({ one }) => ({
  demoStation: one(demoStations, {
    fields: [telemetryData.demoStationId],
    references: [demoStations.id],
  }),
  session: one(sessions, {
    fields: [telemetryData.sessionId],
    references: [sessions.id],
  }),
}));

export const commandsRelations = relations(commands, ({ one }) => ({
  session: one(sessions, {
    fields: [commands.sessionId],
    references: [sessions.id],
  }),
  user: one(users, {
    fields: [commands.userId],
    references: [users.id],
  }),
  demoStation: one(demoStations, {
    fields: [commands.demoStationId],
    references: [demoStations.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations).omit({
  id: true,
  joinedAt: true,
});

export const insertDemoStationSchema = createInsertSchema(demoStations).omit({
  id: true,
  createdAt: true,
  lastHeartbeat: true,
});

export const insertControlConfigurationSchema = createInsertSchema(controlConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  startTime: true,
});

export const insertTelemetryDataSchema = createInsertSchema(telemetryData).omit({
  id: true,
  timestamp: true,
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  timestamp: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;

export type DemoStation = typeof demoStations.$inferSelect;
export type InsertDemoStation = z.infer<typeof insertDemoStationSchema>;

export type ControlConfiguration = typeof controlConfigurations.$inferSelect;
export type InsertControlConfiguration = z.infer<typeof insertControlConfigurationSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type TelemetryData = typeof telemetryData.$inferSelect;
export type InsertTelemetryData = z.infer<typeof insertTelemetryDataSchema>;

export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
