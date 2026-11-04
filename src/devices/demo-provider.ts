import type { Device, DeviceCommand, DeviceProvider } from "./types";

const DEMO_DEVICES: Device[] = [
  { id: "kitchen-ceiling", name: "Taklampa", room: "Kök", kind: "light", on: true, dimmable: true, brightness: 80 },
  { id: "living-floor", name: "Golvlampa", room: "Vardagsrum", kind: "light", on: false, dimmable: true, brightness: 40 },
  { id: "hall-light", name: "Hallen", room: "Hall", kind: "light", on: true, dimmable: false, brightness: null },
  { id: "kids-nightlight", name: "Nattlampa", room: "Barnrum", kind: "light", on: false, dimmable: true, brightness: 15 },
  { id: "coffee-plug", name: "Kaffebryggare", room: "Kök", kind: "plug", on: false, dimmable: false, brightness: null },
  { id: "tv-plug", name: "TV-hörnan", room: "Vardagsrum", kind: "plug", on: true, dimmable: false, brightness: null },
];

/**
 * Fake Devices kept in server memory, per Household. State resets when the server restarts
 * (and is not shared between serverless instances) — fine for a demo.
 */
const state = new Map<string, Map<string, Device>>();

function devicesFor(householdId: string): Map<string, Device> {
  let devices = state.get(householdId);
  if (!devices) {
    devices = new Map(DEMO_DEVICES.map((d) => [d.id, { ...d }]));
    state.set(householdId, devices);
  }
  return devices;
}

export const demoProvider: DeviceProvider = {
  id: "demo",
  async listDevices(householdId) {
    return [...devicesFor(householdId).values()].map((d) => ({ ...d }));
  },
  async sendCommand(householdId, deviceId, command: DeviceCommand) {
    const device = devicesFor(householdId).get(deviceId);
    if (!device) throw new Error(`Unknown device ${deviceId}`);
    if (command.type === "setOn") device.on = command.on;
    if (command.type === "setBrightness") {
      if (!device.dimmable) throw new Error(`Device ${deviceId} is not dimmable`);
      device.brightness = Math.round(command.brightness);
      device.on = true;
    }
    return { ...device };
  },
};
