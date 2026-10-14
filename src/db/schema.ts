import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    activeFarmId: uuid("active_farm_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const farms = pgTable(
  "farms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    location: text("location"),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("farms_owner_id_idx").on(table.ownerId)],
);

export const farmMembers = pgTable(
  "farm_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("anggota"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("farm_members_farm_user_idx").on(table.farmId, table.userId),
    index("farm_members_user_id_idx").on(table.userId),
  ],
);

export const plots = pgTable(
  "plots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    size: numeric("size", { precision: 12, scale: 2 }),
    areaUnit: text("area_unit").notNull().default("m2"),
    soilType: text("soil_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("plots_farm_id_idx").on(table.farmId)],
);

export const plantFamilies = pgTable(
  "plant_families",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    rotationGroup: text("rotation_group"),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("plant_families_name_idx").on(table.name)],
);

export const crops = pgTable(
  "crops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    farmId: uuid("farm_id").references(() => farms.id, { onDelete: "restrict" }),
    commonName: text("common_name").notNull(),
    scientificName: text("scientific_name"),
    familyId: uuid("family_id").references(() => plantFamilies.id, { onDelete: "set null" }),
    nutrientNeed: text("nutrient_need"),
    isCoverCrop: boolean("is_cover_crop").notNull().default(false),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("crops_farm_id_idx").on(table.farmId),
    index("crops_family_id_idx").on(table.familyId),
    index("crops_common_name_idx").on(table.commonName),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("seasons_farm_id_idx").on(table.farmId)],
);

export const plantings = pgTable(
  "plantings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "restrict" }),
    cropId: uuid("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    plantDate: date("plant_date", { mode: "string" }).notNull(),
    harvestDate: date("harvest_date", { mode: "string" }),
    status: text("status").notNull().default("direncanakan"),
    yieldAmount: numeric("yield_amount", { precision: 12, scale: 2 }),
    yieldUnit: text("yield_unit"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("plantings_plot_id_idx").on(table.plotId),
    index("plantings_crop_id_idx").on(table.cropId),
    index("plantings_plant_date_idx").on(table.plantDate),
  ],
);

export const soilTests = pgTable(
  "soil_tests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "restrict" }),
    testDate: date("test_date", { mode: "string" }).notNull(),
    ph: numeric("ph", { precision: 4, scale: 2 }),
    nitrogen: numeric("nitrogen", { precision: 10, scale: 2 }),
    phosphorus: numeric("phosphorus", { precision: 10, scale: 2 }),
    potassium: numeric("potassium", { precision: 10, scale: 2 }),
    organicMatter: numeric("organic_matter", { precision: 6, scale: 2 }),
    method: text("method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("soil_tests_plot_id_idx").on(table.plotId),
    index("soil_tests_test_date_idx").on(table.testDate),
  ],
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "restrict" }),
    plantingId: uuid("planting_id").references(() => plantings.id, { onDelete: "set null" }),
    category: text("category").notNull(),
    observedAt: date("observed_at", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("observations_plot_id_idx").on(table.plotId),
    index("observations_planting_id_idx").on(table.plantingId),
  ],
);

export type RotationReason = {
  code: string;
  text: string;
};

export const rotationPlans = pgTable(
  "rotation_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "restrict" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    cropId: uuid("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("direncanakan"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    reasons: jsonb("reasons").$type<RotationReason[]>().notNull().default([]),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("rotation_plans_plot_id_idx").on(table.plotId),
    index("rotation_plans_start_date_idx").on(table.startDate),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "restrict" }),
    plotId: uuid("plot_id").references(() => plots.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: text("status").notNull().default("belum"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reminders_farm_id_idx").on(table.farmId),
    index("reminders_due_date_idx").on(table.dueDate),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  ownedFarms: many(farms),
  memberships: many(farmMembers),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
  owner: one(users, { fields: [farms.ownerId], references: [users.id] }),
  members: many(farmMembers),
  plots: many(plots),
  seasons: many(seasons),
  crops: many(crops),
  reminders: many(reminders),
}));

export const farmMembersRelations = relations(farmMembers, ({ one }) => ({
  farm: one(farms, { fields: [farmMembers.farmId], references: [farms.id] }),
  user: one(users, { fields: [farmMembers.userId], references: [users.id] }),
}));

export const plotsRelations = relations(plots, ({ one, many }) => ({
  farm: one(farms, { fields: [plots.farmId], references: [farms.id] }),
  plantings: many(plantings),
  soilTests: many(soilTests),
  observations: many(observations),
  rotationPlans: many(rotationPlans),
  reminders: many(reminders),
}));

export const plantFamiliesRelations = relations(plantFamilies, ({ many }) => ({
  crops: many(crops),
}));

export const cropsRelations = relations(crops, ({ one, many }) => ({
  farm: one(farms, { fields: [crops.farmId], references: [farms.id] }),
  family: one(plantFamilies, { fields: [crops.familyId], references: [plantFamilies.id] }),
  plantings: many(plantings),
  rotationPlans: many(rotationPlans),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  farm: one(farms, { fields: [seasons.farmId], references: [farms.id] }),
  plantings: many(plantings),
  rotationPlans: many(rotationPlans),
}));

export const plantingsRelations = relations(plantings, ({ one, many }) => ({
  plot: one(plots, { fields: [plantings.plotId], references: [plots.id] }),
  crop: one(crops, { fields: [plantings.cropId], references: [crops.id] }),
  season: one(seasons, { fields: [plantings.seasonId], references: [seasons.id] }),
  observations: many(observations),
}));

export const soilTestsRelations = relations(soilTests, ({ one }) => ({
  plot: one(plots, { fields: [soilTests.plotId], references: [plots.id] }),
}));

export const observationsRelations = relations(observations, ({ one }) => ({
  plot: one(plots, { fields: [observations.plotId], references: [plots.id] }),
  planting: one(plantings, { fields: [observations.plantingId], references: [plantings.id] }),
}));

export const rotationPlansRelations = relations(rotationPlans, ({ one }) => ({
  plot: one(plots, { fields: [rotationPlans.plotId], references: [plots.id] }),
  crop: one(crops, { fields: [rotationPlans.cropId], references: [crops.id] }),
  season: one(seasons, { fields: [rotationPlans.seasonId], references: [seasons.id] }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  farm: one(farms, { fields: [reminders.farmId], references: [farms.id] }),
  plot: one(plots, { fields: [reminders.plotId], references: [plots.id] }),
}));
