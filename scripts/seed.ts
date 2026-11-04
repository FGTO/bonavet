/**
 * Creates your Household and its first Parent so you can sign in to the Admin.
 *
 *   pnpm db:seed -- --household "Familjen Andersson" --name Anna --email anna@gmail.com
 *
 * Safe to re-run: an existing Parent with the same email is left untouched.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing. Put it in .env.local (see README).");
  const householdName = arg("household");
  const name = arg("name");
  const email = arg("email")?.toLowerCase();
  const timeZone = arg("timezone") ?? "Europe/Stockholm";
  if (!householdName || !name || !email) {
    console.error('Usage: pnpm db:seed -- --household "Familjen X" --name Anna --email anna@gmail.com [--timezone Europe/Stockholm]');
    process.exit(1);
  }

  const db = drizzle({ client: neon(url), schema });
  const [existing] = await db.select().from(schema.familyMember).where(eq(schema.familyMember.email, email));
  if (existing) {
    console.log(`${email} is already a Family Member (household ${existing.householdId}). Nothing to do.`);
    return;
  }

  const [household] = await db.insert(schema.household).values({ name: householdName, timeZone }).returning();
  await db.insert(schema.familyMember).values({
    householdId: household.id,
    name,
    tag: name,
    color: "rose",
    position: 0,
    isParent: true,
    email,
  });
  console.log(`Created household "${householdName}" with Parent ${name} <${email}>.`);
  console.log("Next: start the app and sign in at /admin.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
