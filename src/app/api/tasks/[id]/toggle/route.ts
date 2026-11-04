import { resolveViewer, toggleTask } from "@/server/dashboard";
import { toggleDemoTask } from "@/server/demo/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ticks a Task off (or back on) from the Dashboard. */
export async function POST(_request: Request, { params }: RouteContext<"/api/tasks/[id]/toggle">) {
  const { id } = await params;
  const viewer = await resolveViewer();
  if (!viewer) return Response.json({ error: "unpaired" }, { status: 401 });

  const ok = viewer.kind === "demo" ? toggleDemoTask(id) : UUID.test(id) && (await toggleTask(viewer.householdId, id));
  return ok ? Response.json({ ok: true }) : Response.json({ error: "not_found" }, { status: 404 });
}
