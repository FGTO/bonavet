import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { isAuthConfigured } from "./config";
import { getDb, schema } from "./db";

export interface ParentContext {
  userId: string;
  email: string;
  name: string;
  householdId: string;
  householdName: string;
  memberId: string;
}

/** The signed-in Parent and their Household, or null. Never trusts anything but the session. */
export async function getParent(requestHeaders?: Headers): Promise<ParentContext | null> {
  if (!isAuthConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders ?? (await headers()) });
  if (!session) return null;

  const email = session.user.email.toLowerCase();
  const [row] = await getDb()
    .select({
      memberId: schema.familyMember.id,
      householdId: schema.household.id,
      householdName: schema.household.name,
    })
    .from(schema.familyMember)
    .innerJoin(schema.household, eq(schema.household.id, schema.familyMember.householdId))
    .where(and(eq(schema.familyMember.email, email), eq(schema.familyMember.isParent, true)))
    .limit(1);
  if (!row) return null;

  return { userId: session.user.id, email, name: session.user.name, ...row };
}

/** For Admin pages and Server Actions: the Parent, or a redirect to sign-in. */
export async function requireParent(): Promise<ParentContext> {
  const parent = await getParent();
  if (!parent) redirect("/admin/sign-in");
  return parent;
}
