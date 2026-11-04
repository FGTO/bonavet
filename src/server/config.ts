import "server-only";

/**
 * BoNavet runs on built-in demo data until a database is configured, so the
 * Dashboard works on day one. Set BONAVET_DEMO=1 to force demo mode anyway.
 */
export function isDemoMode(): boolean {
  return process.env.BONAVET_DEMO === "1" || !process.env.DATABASE_URL;
}

/** Admin, Google sign-in and calendar sync need all of these. */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.BETTER_AUTH_SECRET &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET,
  );
}

/** Calendars are re-synced when a Screen asks for data older than this. */
export const CALENDAR_SYNC_INTERVAL_MS = 5 * 60 * 1000;
