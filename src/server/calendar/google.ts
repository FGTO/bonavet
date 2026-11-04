import "server-only";
import type { CalendarEvent } from "@/domain/types";

/*
 * Thin client for the Google Calendar REST API (v3). Plain fetch instead of the
 * `googleapis` package keeps the server bundle small.
 */

const API = "https://www.googleapis.com/calendar/v3";

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function googleGet<T>(accessToken: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new GoogleApiError(res.status, `Google Calendar ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const items: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const page = await googleGet<{ items?: GoogleCalendarListEntry[]; nextPageToken?: string }>(
      accessToken,
      "/users/me/calendarList",
      { maxResults: "250", ...(pageToken ? { pageToken } : {}) },
    );
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

/** Events overlapping [timeMin, timeMax), recurring ones expanded into single instances. */
export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const page = await googleGet<{ items?: GoogleEvent[]; nextPageToken?: string }>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
        ...(pageToken ? { pageToken } : {}),
      },
    );
    for (const e of page.items ?? []) {
      if (e.status === "cancelled") continue;
      const allDay = Boolean(e.start?.date);
      const start = allDay ? e.start?.date : e.start?.dateTime;
      const end = allDay ? e.end?.date : e.end?.dateTime;
      if (!start || !end) continue;
      events.push({ id: e.id, title: e.summary?.trim() || "(utan titel)", allDay, start, end });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}
