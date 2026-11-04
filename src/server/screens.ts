import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "./db";

export const SCREEN_COOKIE = "bonavet_screen";
/** Browsers cap cookie lifetime at 400 days; the Screen refreshes it whenever it is seen. */
export const SCREEN_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
const PAIRING_TTL_MS = 10 * 60 * 1000;
// No 0/O/1/I/L: easy to read off a laptop and type on a tablet.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizePairingCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createPairingCode(householdId: string, name: string) {
  const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  const [row] = await getDb()
    .insert(schema.screen)
    .values({
      householdId,
      name: name.trim() || "Skärm",
      pairingCode: code,
      pairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MS),
    })
    .returning();
  return row;
}

/** Exchanges a valid pairing code for a long-lived Screen token (returned once, stored hashed). */
export async function pairScreen(rawCode: string): Promise<{ token: string } | null> {
  const code = normalizePairingCode(rawCode);
  if (code.length !== 6) return null;
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const [row] = await db
    .update(schema.screen)
    .set({ pairingCode: null, pairingExpiresAt: null, tokenHash: hashToken(token), pairedAt: new Date() })
    .where(
      and(
        eq(schema.screen.pairingCode, code),
        gt(schema.screen.pairingExpiresAt, new Date()),
        isNull(schema.screen.tokenHash),
      ),
    )
    .returning({ id: schema.screen.id });
  return row ? { token } : null;
}

/** The Household a Screen token belongs to, or null when unknown or revoked (revoking deletes the row). */
export async function resolveScreen(token: string | undefined): Promise<{ screenId: string; householdId: string } | null> {
  if (!token) return null;
  const db = getDb();
  const [row] = await db
    .select({ screenId: schema.screen.id, householdId: schema.screen.householdId, lastSeenAt: schema.screen.lastSeenAt })
    .from(schema.screen)
    .where(eq(schema.screen.tokenHash, hashToken(token)))
    .limit(1);
  if (!row) return null;
  // Throttle "last seen" writes to once a minute.
  if (!row.lastSeenAt || Date.now() - row.lastSeenAt.getTime() > 60_000) {
    await db.update(schema.screen).set({ lastSeenAt: new Date() }).where(eq(schema.screen.id, row.screenId));
  }
  return { screenId: row.screenId, householdId: row.householdId };
}

export async function revokeScreen(householdId: string, screenId: string) {
  await getDb()
    .delete(schema.screen)
    .where(and(eq(schema.screen.id, screenId), eq(schema.screen.householdId, householdId)));
}
