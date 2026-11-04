"use client";

import type { AgendaColumn, AgendaEvent, AgendaTask } from "@/domain/agenda";
import type { DayKey } from "@/domain/types";
import { t } from "@/i18n";
import { dayHeading, dueLabel } from "@/i18n/dates";
import { memberBg } from "./member-colors";

export function MemberColumn({
  column,
  today,
  onToggleTask,
}: {
  column: AgendaColumn;
  today: DayKey;
  onToggleTask: (taskId: string) => void;
}) {
  const { member, tasks, days } = column;
  return (
    <section
      aria-label={member.name}
      className="flex min-h-0 min-w-[170px] flex-col overflow-hidden rounded-card bg-paper-white shadow-card"
    >
      <header className={`${memberBg[member.color]} px-4 pt-3 pb-2.5`}>
        <h2 className="font-display truncate text-heading-sm text-inkwell-navy">{member.name}</h2>
      </header>

      <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pt-3 pb-4">
        {tasks.length > 0 && (
          <div>
            <h3 className="mb-1.5 px-1 text-caption font-semibold tracking-wide text-slate uppercase">
              {t("dashboard.tasks")}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} today={today} onToggle={() => onToggleTask(task.id)} />
              ))}
            </ul>
          </div>
        )}

        {days.map(({ day, isToday, events }) => (
          <div key={day}>
            <h3
              className={
                isToday
                  ? "mb-1 px-1 text-body-sm font-bold text-inkwell-navy"
                  : "mb-1 px-1 text-caption font-semibold text-slate"
              }
            >
              {dayHeading(day, today)}
            </h3>
            {events.length === 0 ? (
              isToday && <p className="px-1 text-body-sm text-slate">{t("dashboard.noEvents")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {events.map((event) => (
                  <EventItem key={`${event.id}-${day}`} event={event} large={isToday} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function EventItem({ event, large }: { event: AgendaEvent; large: boolean }) {
  if (event.allDay) {
    return (
      <li
        className={`rounded-control bg-ash-canvas px-2 ${large ? "py-1.5 text-body" : "py-1 text-body-sm"} leading-snug font-medium wrap-anywhere hyphens-auto`}
      >
        <span className="mr-1.5 text-caption font-semibold tracking-wide text-slate uppercase">
          {t("dashboard.allDay")}
        </span>
        {event.title}
      </li>
    );
  }
  const time = event.startLabel ?? (event.continues ? t("dashboard.continues") : "");
  return (
    <li className={`flex gap-2 px-1 ${large ? "py-1 text-body" : "py-0.5 text-body-sm"} leading-snug`}>
      <span className={`shrink-0 tabular-nums ${large ? "w-12 font-semibold" : "w-10 font-medium text-graphite"}`}>
        {time}
      </span>
      <span className="min-w-0 wrap-anywhere hyphens-auto">{event.title}</span>
    </li>
  );
}

function TaskItem({ task, today, onToggle }: { task: AgendaTask; today: DayKey; onToggle: () => void }) {
  const done = task.status === "done";
  const overdue = task.status === "overdue";
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${task.title} – ${done ? t("dashboard.markOpen") : t("dashboard.markDone")}`}
        className={`flex w-full items-start gap-2.5 rounded-control border px-2.5 py-2 text-left transition-colors active:scale-[0.98] ${
          overdue ? "border-coral-emphasis/60 bg-coral-emphasis/5" : "border-warm-stone bg-paper-white"
        }`}
      >
        <span
          aria-hidden
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${
            done ? "border-mint-pulse bg-mint-pulse" : overdue ? "border-coral-emphasis" : "border-inkwell-navy"
          }`}
        >
          {done && (
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block wrap-anywhere hyphens-auto text-body-sm leading-snug font-medium ${done ? "text-slate line-through" : ""}`}>
            {task.title}
          </span>
          <span className={`block text-caption ${overdue ? "font-semibold text-coral-emphasis" : "text-slate"}`}>
            {overdue ? t("dashboard.overdue") : dueLabel(task.dueDate, today)}
          </span>
        </span>
      </button>
    </li>
  );
}
