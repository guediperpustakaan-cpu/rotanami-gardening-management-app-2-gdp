import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

function shouldUseSsl(url: string) {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  return /neon\.tech|sslmode=require/i.test(url);
}

const globalForDb = globalThis as typeof globalThis & {
  __rotanamiPool?: Pool;
};

export const pool =
  globalForDb.__rotanamiPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: true } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__rotanamiPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
