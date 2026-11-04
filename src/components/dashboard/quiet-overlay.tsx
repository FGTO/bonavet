"use client";

import { formatClock } from "@/domain/time";
import { t } from "@/i18n";

/** Dims the Dashboard during Quiet Hours. Any touch wakes it (handled by the parent). */
export function QuietOverlay({ now, timeZone, onWake }: { now: Date; timeZone: string; onWake: () => void }) {
  return (
    <button
      type="button"
      onClick={onWake}
      aria-label={t("dashboard.wake")}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pure-ink/90 text-paper-white/40"
    >
      <span className="font-display text-display tabular-nums">{formatClock(now, timeZone)}</span>
      <span className="mt-2 text-body-sm">{t("dashboard.wake")}</span>
    </button>
  );
}
