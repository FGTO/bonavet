"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DashboardSnapshot } from "@/domain/types";

const POLL_MS = 60_000;
const STORAGE_KEY = "bonavet:last-snapshot";

export type SnapshotState =
  | { status: "loading" }
  | { status: "unpaired" }
  | { status: "ready"; snapshot: DashboardSnapshot; fetchedAt: number; offline: boolean };

function readCache(): { snapshot: DashboardSnapshot; fetchedAt: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(snapshot: DashboardSnapshot, fetchedAt: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ snapshot, fetchedAt }));
  } catch {
    // Storage full or blocked: the Dashboard still works, it just can't survive a reload offline.
  }
}

type FetchResult = { kind: "ok"; snapshot: DashboardSnapshot } | { kind: "unpaired" } | { kind: "error" };

async function fetchSnapshot(): Promise<FetchResult> {
  try {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    if (res.status === 401) return { kind: "unpaired" };
    if (!res.ok) return { kind: "error" };
    return { kind: "ok", snapshot: (await res.json()) as DashboardSnapshot };
  } catch {
    return { kind: "error" };
  }
}

/**
 * Polls /api/dashboard every minute. On failure it keeps showing the last good
 * snapshot (also restored from localStorage after a reload) and flags `offline`.
 */
export function useSnapshot() {
  const [state, setState] = useState<SnapshotState>({ status: "loading" });
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return Promise.resolve();
    inFlight.current = true;
    return fetchSnapshot().then((result) => {
      inFlight.current = false;
      if (result.kind === "unpaired") {
        setState({ status: "unpaired" });
      } else if (result.kind === "ok") {
        const fetchedAt = Date.now();
        writeCache(result.snapshot, fetchedAt);
        setState({ status: "ready", snapshot: result.snapshot, fetchedAt, offline: false });
      } else {
        setState((prev) => {
          if (prev.status === "ready") return { ...prev, offline: true };
          const cached = readCache();
          return cached ? { status: "ready", ...cached, offline: true } : prev;
        });
      }
    });
  }, []);

  /** Optimistic local edit, e.g. ticking a Task before the server confirms. */
  const patch = useCallback((update: (s: DashboardSnapshot) => DashboardSnapshot) => {
    setState((prev) => (prev.status === "ready" ? { ...prev, snapshot: update(prev.snapshot) } : prev));
  }, []);

  useEffect(() => {
    // If this first fetch fails (e.g. Wi-Fi down after a reload), refresh() falls back to the cached snapshot.
    void refresh();
    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  return { state, refresh, patch };
}

/*
 * A shared clock. On the server (and during hydration) it reads null, so the
 * prerendered shell never bakes in a build-time date; in the browser it ticks.
 */
const CLOCK_TICK_MS = 15_000;
let clockNow: Date | null = null;

function subscribeClock(onChange: () => void) {
  const timer = setInterval(() => {
    clockNow = new Date();
    onChange();
  }, CLOCK_TICK_MS);
  return () => clearInterval(timer);
}

function readClock(): Date {
  clockNow ??= new Date();
  return clockNow;
}

/** The current time, updated every 15 s so "today" and the header clock roll over. */
export function useNow(): Date | null {
  return useSyncExternalStore(subscribeClock, readClock, () => null);
}
