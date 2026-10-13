import { pgTable, text, timestamp, integer, primaryKey, jsonb, uuid } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---- Auth.js tables (shape required by @auth/drizzle-adapter) ----
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (v) => [primaryKey({ columns: [v.identifier, v.token] })],
);

// ---- App tables ----

/** Emails allowed to sign in. Admins (ADMIN_EMAILS) don't need a row. */
export const invites = pgTable("invite", {
  email: text("email").primaryKey(),
  name: text("name"),
  invitedBy: text("invitedBy"),
  invitedAt: timestamp("invitedAt", { mode: "date" }).defaultNow().notNull(),
});

/** One intake per client. `data` is the whole form state, including `data.framework` once Block Ten adds it. */
export const intakes = pgTable("intake", {
  userId: text("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  pending: jsonb("pending").$type<Record<string, unknown> | null>(),
  /** Set when the client clicks "Submit for review". */
  submittedAt: timestamp("submittedAt", { mode: "date" }),
  /** Set when an admin sends the results; the client only sees results after this. */
  releasedAt: timestamp("releasedAt", { mode: "date" }),
  /** The designed PDF report, stored privately in Vercel Blob. */
  reportUrl: text("reportUrl"),
  reportName: text("reportName"),
  reportSize: integer("reportSize"),
  reportUploadedAt: timestamp("reportUploadedAt", { mode: "date" }),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

/** Every generated framework, newest last, so clients and admins can look back. */
export const frameworks = pgTable("framework", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
