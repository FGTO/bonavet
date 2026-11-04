import type { AgendaDay, AgendaEvent } from "@/domain/agenda";
import type { DayKey } from "@/domain/types";
import { t } from "@/i18n";
import { dayHeading } from "@/i18n/dates";

interface BandItem {
  event: AgendaEvent;
  firstDay: DayKey;
  lastDay: DayKey;
}

/** One chip per Event, even when it spans several days ("Lör 7 nov – Sön 8 nov"). */
function toItems(days: AgendaDay[]): BandItem[] {
  const items = new Map<string, BandItem>();
  for (const { day, events } of days) {
    for (const event of events) {
      const existing = items.get(event.id);
      if (existing) existing.lastDay = day;
      else items.set(event.id, { event, firstDay: day, lastDay: day });
    }
  }
  return [...items.values()];
}

/** Household Events (no recognised Tag) across the whole window, in Inkwell Navy. */
export function HouseholdBand({ days, today }: { days: AgendaDay[]; today: DayKey }) {
  const items = toItems(days);
  if (items.length === 0) return null;
  return (
    <section
      aria-label={t("dashboard.household")}
      className="flex items-center gap-4 rounded-card bg-inkwell-navy px-4 py-2.5 text-paper-white shadow-card"
    >
      <h2 className="font-display shrink-0 text-body-lg">{t("dashboard.household")}</h2>
      <ul className="scrollbar-none flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {items.map(({ event, firstDay, lastDay }) => (
          <li
            key={event.id}
            className="flex shrink-0 items-baseline gap-2 rounded-control bg-paper-white/10 px-3 py-1.5 text-body-sm"
          >
            <span className="font-semibold whitespace-nowrap text-butter-yellow">
              {dayHeading(firstDay, today)}
              {lastDay !== firstDay && ` – ${dayHeading(lastDay, today)}`}
            </span>
            {event.startLabel && <span className="tabular-nums text-paper-white/70">{event.startLabel}</span>}
            <span className="whitespace-nowrap">{event.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
