import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "./db";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** Only email addresses registered as a Parent in some Household may sign in. */
async function isParentEmail(email: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: schema.familyMember.id })
    .from(schema.familyMember)
    .where(and(eq(schema.familyMember.email, email.toLowerCase()), eq(schema.familyMember.isParent, true)))
    .limit(1);
  return rows.length > 0;
}

function createAuth() {
  const db = getDb();
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Calendar read access is requested at sign-in, and "offline" + "consent"
        // makes Google return a refresh token so the sync keeps working while nobody is signed in.
        scope: [GOOGLE_CALENDAR_SCOPE],
        accessType: "offline",
        prompt: "select_account consent",
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ((await isParentEmail(user.email)) ? undefined : false),
        },
      },
      session: {
        create: {
          // Also re-checked on every sign-in, so removing someone as Parent locks them out.
          before: async (session) => {
            const [row] = await db
              .select({ email: schema.user.email })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .limit(1);
            return row && (await isParentEmail(row.email)) ? undefined : false;
          },
        },
      },
    },
    plugins: [nextCookies()], // must stay last
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use so the app boots in demo mode without auth configured. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
