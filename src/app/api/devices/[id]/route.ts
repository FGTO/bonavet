import { getDeviceProvider } from "@/devices";
import { isDeviceCommand } from "@/devices/types";
import { resolveViewer } from "@/server/dashboard";

/** Sends one command (on/off, brightness) to a Device. */
export async function POST(request: Request, { params }: RouteContext<"/api/devices/[id]">) {
  const { id } = await params;
  const viewer = await resolveViewer();
  if (!viewer) return Response.json({ error: "unpaired" }, { status: 401 });

  const command: unknown = await request.json().catch(() => null);
  if (!isDeviceCommand(command)) return Response.json({ error: "bad_command" }, { status: 400 });

  try {
    const device = await getDeviceProvider().sendCommand(viewer.householdId, id, command);
    return Response.json(device);
  } catch (error) {
    console.error("Device command failed", error);
    return Response.json({ error: "device_failed" }, { status: 502 });
  }
}
