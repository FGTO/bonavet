"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Device, DeviceCommand } from "@/devices/types";
import { buildAgenda, WINDOW_DAYS } from "@/domain/agenda";
import { isQuietHours } from "@/domain/quiet-hours";
import { formatClock, toDayKey } from "@/domain/time";
import { t } from "@/i18n";
import { longDate } from "@/i18n/dates";
import { DeviceStrip } from "./device-strip";
import { HouseholdBand } from "./household-band";
import { MemberColumn } from "./member-column";
import { QuietOverlay } from "./quiet-overlay";
import { useNow, useSnapshot } from "./use-snapshot";

/** Browse back to today after this long without a touch. */
const SNAP_BACK_MS = 2 * 60 * 1000;
/** How long a touch keeps the Dashboard awake during Quiet Hours. */
const WAKE_MS = 2 * 60 * 1000;
/** Show the "offline" warning when data is older than this. */
const STALE_MS = 3 * 60 * 1000;

export function Dashboard() {
  const router = useRouter();
  const { state, refresh, patch } = useSnapshot();
  const now = useNow();
  const [offsetDays, setOffsetDays] = useState(0);
  const [lastTouch, setLastTouch] = useState(0);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    if (state.status === "unpaired") router.replace("/pair");
  }, [state.status, router]);

  // Any touch counts as activity: it wakes Quiet Hours and postpones the snap-back.
  const touch = useCallback(() => {
    const at = Date.now();
    lastTouchRef.current = at;
    setLastTouch(at);
  }, []);

  useEffect(() => {
    if (offsetDays === 0) return;
    const timer = setTimeout(() => setOffsetDays(0), SNAP_BACK_MS);
    return () => clearTimeout(timer);
  }, [offsetDays, lastTouch]);

  const snapshot = state.status === "ready" ? state.snapshot : null;
  const agenda = useMemo(
    () => (snapshot && now ? buildAgenda(snapshot, now, offsetDays) : null),
    [snapshot, now, offsetDays],
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      patch((s) => ({
        ...s,
        tasks: s.tasks.map((task) =>
          task.id === taskId ? { ...task, doneAt: task.doneAt ? null : new Date().toISOString() } : task,
        ),
      }));
      await fetch(`/api/tasks/${encodeURIComponent(taskId)}/toggle`, { method: "POST" }).catch(() => null);
      void refresh();
    },
    [patch, refresh],
  );

  const sendDeviceCommand = useCallback(
    async (deviceId: string, command: DeviceCommand): Promise<boolean> => {
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      }).catch(() => null);
      if (!res?.ok) return false;
      const device = (await res.json()) as Device;
      patch((s) => ({ ...s, devices: s.devices.map((d) => (d.id === device.id ? device : d)) }));
      return true;
    },
    [patch],
  );

  if (!snapshot || !agenda || !now) {
    return (
      <main className="kiosk flex h-dvh items-center justify-center text-body-lg text-slate">
        {t("dashboard.loading")}
      </main>
    );
  }

  const { timeZone } = snapshot.household;
  const today = toDayKey(now, timeZone);
  const quiet = isQuietHours(now, timeZone) && now.getTime() - lastTouch > WAKE_MS;
  const fetchedAt = state.status === "ready" ? state.fetchedAt : 0;
  const stale = (state.status === "ready" && state.offline) || now.getTime() - fetchedAt > STALE_MS;

  return (
    <main
      onPointerDown={touch}
      className="kiosk flex h-dvh flex-col gap-3 p-3 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] md:gap-4 md:p-4"
    >
      <header className="flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-slate">{snapshot.household.name}</p>
          <h1 className="font-display truncate text-heading text-inkwell-navy">
            {longDate(today)}
            <span className="ml-3 tabular-nums text-coral-emphasis">{formatClock(now, timeZone)}</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {snapshot.demo && (
            <span className="rounded-control bg-butter-yellow px-3 py-1.5 text-caption font-semibold">
              {t("dashboard.demo")}
            </span>
          )}
          <span
            className={`text-caption ${stale ? "rounded-control bg-coral-emphasis/10 px-2 py-1 font-semibold text-coral-emphasis" : "text-slate"}`}
            role={stale ? "status" : undefined}
          >
            {stale ? t("dashboard.offline") + " · " : ""}
            {t("dashboard.lastUpdated", { time: formatClock(new Date(fetchedAt), timeZone) })}
          </span>
          <WeekNav
            offsetDays={offsetDays}
            onPrev={() => setOffsetDays((o) => Math.max(0, o - WINDOW_DAYS))}
            onNext={() => setOffsetDays((o) => Math.min(WINDOW_DAYS, o + WINDOW_DAYS))}
            onToday={() => setOffsetDays(0)}
          />
        </div>
      </header>

      <HouseholdBand days={agenda.household} today={today} />

      <div className="flex min-h-0 flex-1 gap-3 md:gap-4">
        {agenda.columns.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-card bg-paper-white p-8 text-center text-body-lg text-slate">
            {t("dashboard.noMembers")}
          </p>
        ) : (
          <div
            className="scrollbar-none grid min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto md:gap-4"
            style={{ gridTemplateColumns: `repeat(${agenda.columns.length}, minmax(170px, 1fr))` }}
          >
            {agenda.columns.map((column) => (
              <MemberColumn key={column.member.id} column={column} today={today} onToggleTask={toggleTask} />
            ))}
          </div>
        )}
        <DeviceStrip devices={snapshot.devices} onCommand={sendDeviceCommand} />
      </div>

      {quiet && <QuietOverlay now={now} timeZone={timeZone} onWake={touch} />}
    </main>
  );
}

function WeekNav({
  offsetDays,
  onPrev,
  onNext,
  onToday,
}: {
  offsetDays: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const btn =
    "flex size-11 items-center justify-center rounded-control border border-warm-stone bg-paper-white text-inkwell-navy shadow-subtle disabled:opacity-30";
  return (
    <nav className="flex items-center gap-1.5">
      {offsetDays > 0 && (
        <button type="button" onClick={onToday} className="h-11 rounded-control bg-inkwell-navy px-4 text-body-sm font-semibold text-paper-white shadow-subtle">
          {t("dashboard.backToToday")}
        </button>
      )}
      <button type="button" onClick={onPrev} disabled={offsetDays === 0} aria-label={t("dashboard.prevWeek")} className={btn}>
        <Chevron dir="left" />
      </button>
      <button type="button" onClick={onNext} disabled={offsetDays >= WINDOW_DAYS} aria-label={t("dashboard.nextWeek")} className={btn}>
        <Chevron dir="right" />
      </button>
    </nav>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
