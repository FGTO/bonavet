import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — see README › Set up Neon");
  return drizzle({ client: neon(url), schema });
}

let instance: ReturnType<typeof createDb> | undefined;

/** Lazily created so the app can boot in demo mode without a database. */
export function getDb() {
  instance ??= createDb();
  return instance;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
