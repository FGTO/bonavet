/** A controllable smart-home appliance, as the Dashboard sees it. */
export interface Device {
  id: string;
  name: string;
  /** Room label shown under the name, e.g. "Kök". */
  room: string | null;
  kind: "light" | "plug";
  on: boolean;
  /** Only lights can be dimmable. */
  dimmable: boolean;
  /** 1–100 when dimmable, else null. */
  brightness: number | null;
}

export type DeviceCommand =
  | { type: "setOn"; on: boolean }
  | { type: "setBrightness"; brightness: number };

/**
 * The boundary every smart-home integration implements (see ADR 0003).
 * v1 ships only the demo provider; Home Assistant is the intended first real one.
 */
export interface DeviceProvider {
  readonly id: string;
  listDevices(householdId: string): Promise<Device[]>;
  sendCommand(householdId: string, deviceId: string, command: DeviceCommand): Promise<Device>;
}

export function isDeviceCommand(value: unknown): value is DeviceCommand {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.type === "setOn") return typeof v.on === "boolean";
  if (v.type === "setBrightness")
    return typeof v.brightness === "number" && v.brightness >= 1 && v.brightness <= 100;
  return false;
}
