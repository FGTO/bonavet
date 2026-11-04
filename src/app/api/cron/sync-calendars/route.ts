import { isDemoMode } from "@/server/config";
import { syncAllHouseholds } from "@/server/calendar/sync";

/**
 * Safety-net sync of every Household's stale Calendars. A plain authenticated GET
 * so any scheduler can call it (ADR 0004): Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isDemoMode()) return Response.json({ synced: 0, demo: true });
  const synced = await syncAllHouseholds();
  return Response.json({ synced });
}
