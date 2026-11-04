import { after } from "next/server";
import { syncHousehold } from "@/server/calendar/sync";
import { resolveViewer, getSnapshot } from "@/server/dashboard";

/** Everything a Screen needs, polled every 60 s. */
export async function GET() {
  const viewer = await resolveViewer();
  if (!viewer) return Response.json({ error: "unpaired" }, { status: 401 });

  const snapshot = await getSnapshot(viewer);

  // Sync-on-read: Screens polling is what keeps Calendars fresh (Vercel's free plan
  // only runs scheduled jobs once a day). Stale Calendars sync after the response is sent,
  // so this poll returns instantly and the next one gets the new Events.
  if (viewer.kind !== "demo") {
    after(() => syncHousehold(viewer.householdId, { onlyStale: true }).catch(console.error));
  }

  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
