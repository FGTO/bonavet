"use client";

import { useState } from "react";
import type { Device, DeviceCommand } from "@/devices/types";
import { t } from "@/i18n";

/** The Device controls along the right edge: a dark feature card, per DESIGN.md. */
export function DeviceStrip({
  devices,
  onCommand,
}: {
  devices: Device[];
  onCommand: (deviceId: string, command: DeviceCommand) => Promise<boolean>;
}) {
  return (
    <aside
      aria-label={t("devices.title")}
      className="flex min-h-0 w-[200px] shrink-0 flex-col rounded-feature bg-inkwell-navy p-4 text-paper-white shadow-card"
    >
      <h2 className="font-display mb-3 text-subheading">{t("devices.title")}</h2>
      {devices.length === 0 ? (
        <p className="text-body-sm text-paper-white/70">{t("devices.empty")}</p>
      ) : (
        <ul className="scrollbar-none -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
          {devices.map((device) => (
            <DeviceTile key={device.id} device={device} onCommand={onCommand} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function DeviceTile({
  device,
  onCommand,
}: {
  device: Device;
  onCommand: (deviceId: string, command: DeviceCommand) => Promise<boolean>;
}) {
  const [error, setError] = useState(false);
  // Local slider value so dragging feels instant; committed on release.
  const [brightness, setBrightness] = useState<number | null>(null);

  async function send(command: DeviceCommand) {
    setError(false);
    const ok = await onCommand(device.id, command);
    if (!ok) setError(true);
  }

  return (
    <li
      className={`rounded-card p-2.5 transition-colors ${
        device.on ? "bg-paper-white text-inkwell-navy" : "bg-paper-white/10 text-paper-white"
      }`}
    >
      <button
        type="button"
        onClick={() => send({ type: "setOn", on: !device.on })}
        aria-pressed={device.on}
        aria-label={t("devices.toggle", { name: device.name })}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <span
          aria-hidden
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            device.on ? "bg-mint-pulse text-inkwell-navy" : "bg-paper-white/15"
          }`}
        >
          {device.kind === "light" ? <BulbIcon /> : <PlugIcon />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm leading-tight font-semibold">{device.name}</span>
          <span className={`block truncate text-caption ${device.on ? "text-slate" : "text-paper-white/60"}`}>
            {device.room ? `${device.room} · ` : ""}
            {device.on ? t("devices.on") : t("devices.off")}
          </span>
        </span>
      </button>
      {device.dimmable && device.on && (
        <input
          type="range"
          min={1}
          max={100}
          value={brightness ?? device.brightness ?? 100}
          aria-label={t("devices.brightness", { name: device.name })}
          onChange={(e) => setBrightness(Number(e.target.value))}
          onPointerUp={() => {
            if (brightness !== null) void send({ type: "setBrightness", brightness }).then(() => setBrightness(null));
          }}
          onKeyUp={() => {
            if (brightness !== null) void send({ type: "setBrightness", brightness }).then(() => setBrightness(null));
          }}
          className="mt-2 h-6 w-full"
        />
      )}
      {error && (
        <p role="alert" className="mt-1 text-caption font-semibold text-coral-emphasis">
          {t("devices.error", { name: device.name })}
        </p>
      )}
    </li>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4" />
    </svg>
  );
}
