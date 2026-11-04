import { Suspense } from "react";
import { and, asc, eq } from "drizzle-orm";
import { ui } from "@/components/ui/styles";
import { t } from "@/i18n";
import { GoogleApiError, listGoogleCalendars, type GoogleCalendarListEntry } from "@/server/calendar/google";
import { getGoogleAccessToken } from "@/server/calendar/sync";
import { getDb, schema } from "@/server/db";
import { requireParent, type ParentContext } from "@/server/parent";
import { connectCalendar, disconnectCalendar, syncNow } from "./actions";

export default function CalendarsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-heading">{t("admin.calendars.title")}</h1>
      <p className="max-w-2xl text-body text-slate">{t("admin.calendars.intro")}</p>
      <Suspense fallback={<p className="text-slate">{t("dashboard.loading")}</p>}>
        <Calendars />
      </Suspense>
    </div>
  );
}

const when = (d: Date) =>
  d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" });

async function Calendars() {
  const parent = await requireParent();
  const connected = await getDb()
    .select()
    .from(schema.calendar)
    .where(eq(schema.calendar.householdId, parent.householdId))
    .orderBy(asc(schema.calendar.name));

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-subheading">{t("admin.calendars.connected")}</h2>
          {connected.length > 0 && (
            <form action={syncNow}>
              <button className={ui.ghost}>{t("admin.calendars.syncNow")}</button>
            </form>
          )}
        </div>
        {connected.length === 0 ? (
          <p className="text-body text-slate">{t("admin.calendars.none")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {connected.map((c) => (
              <li key={c.id} className={`${ui.card} flex flex-wrap items-center gap-3`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-body-sm text-slate">
                    {c.lastSyncedAt
                      ? t("admin.calendars.lastSynced", { time: when(c.lastSyncedAt) })
                      : t("admin.calendars.neverSynced")}
                  </p>
                  {c.lastSyncError && (
                    <p className="mt-1 text-body-sm font-semibold break-words text-coral-emphasis">
                      {t("admin.calendars.syncError", { error: c.lastSyncError })}
                    </p>
                  )}
                </div>
                <form action={disconnectCalendar}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={ui.danger}>{t("admin.calendars.disconnect")}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-subheading">{t("admin.calendars.available")}</h2>
        <Suspense fallback={<p className="text-slate">{t("dashboard.loading")}</p>}>
          <AvailableCalendars parent={parent} connectedIds={connected.map((c) => c.externalId)} />
        </Suspense>
      </section>
    </>
  );
}

async function AvailableCalendars({ parent, connectedIds }: { parent: ParentContext; connectedIds: string[] }) {
  const [account] = await getDb()
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, parent.userId), eq(schema.account.providerId, "google")))
    .limit(1);

  let calendars: GoogleCalendarListEntry[] = [];
  let noAccess = !account;
  if (account) {
    try {
      calendars = await listGoogleCalendars(await getGoogleAccessToken(account.id, parent.userId));
    } catch (error) {
      if (!(error instanceof GoogleApiError) || error.status === 401 || error.status === 403) noAccess = true;
      else throw error;
    }
  }
  if (noAccess) {
    return <p className="rounded-control bg-butter-yellow/60 p-4 text-body">{t("admin.calendars.noAccess")}</p>;
  }

  const available = calendars.filter((c) => !connectedIds.includes(c.id));
  return (
    <ul className="flex flex-col gap-2">
      {available.map((c) => (
        <li key={c.id} className={`${ui.card} flex items-center gap-3`}>
          <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: c.backgroundColor ?? "#6d6f75" }} />
          <span className="min-w-0 flex-1 truncate font-medium">{c.summary}</span>
          <form action={connectCalendar}>
            <input type="hidden" name="externalId" value={c.id} />
            <input type="hidden" name="name" value={c.summary} />
            <button className={ui.ghost}>{t("admin.calendars.connect")}</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
