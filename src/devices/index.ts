import { demoProvider } from "./demo-provider";
import type { DeviceProvider } from "./types";

/**
 * Picks the Device provider. Only "demo" exists in v1; a Home Assistant provider
 * slots in here (selected by DEVICE_PROVIDER=home-assistant) without touching the UI.
 */
export function getDeviceProvider(): DeviceProvider {
  switch (process.env.DEVICE_PROVIDER ?? "demo") {
    case "demo":
      return demoProvider;
    default:
      console.warn(`Unknown DEVICE_PROVIDER "${process.env.DEVICE_PROVIDER}", using demo`);
      return demoProvider;
  }
}
