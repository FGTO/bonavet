import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { memberBg } from "@/components/dashboard/member-colors";
import { ui } from "@/components/ui/styles";
import { toDayKey } from "@/domain/time";
import type { MemberColor } from "@/domain/types";
import { t } from "@/i18n";
import { dueLabel } from "@/i18n/dates";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";
import { addTask, deleteTask, toggleTaskDone } from "./actions";

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-heading">{t("admin.tasks.title")}</h1>
      <p className="max-w-2xl text-body text-slate">{t("admin.tasks.intro")}</p>
      <Suspense fallback={<p className="text-slate">{t("dashboard.loading")}</p>}>
        <Tasks />
      </Suspense>
    </div>
  );
}

async function Tasks() {
  const parent = await requireParent();
  const db = getDb();
  const [[household], members, tasks] = await Promise.all([
    db.select().from(schema.household).where(eq(schema.household.id, parent.householdId)),
    db
      .select()
      .from(schema.familyMember)
      .where(eq(schema.familyMember.householdId, parent.householdId))
      .orderBy(asc(schema.familyMember.position)),
    db
      .select()
      .from(schema.task)
      .where(eq(schema.task.householdId, parent.householdId))
      .orderBy(desc(schema.task.dueDate))
      .limit(200),
  ]);
  const today = toDayKey(new Date(), household.timeZone);
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <>
      <form action={addTask} className={`${ui.card} grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end`}>
        <div>
          <label htmlFor="title" className={ui.label}>{t("admin.tasks.what")}</label>
          <input id="title" name="title" required placeholder="Matteläxa s. 42" className={ui.input} />
        </div>
        <div>
          <label htmlFor="memberId" className={ui.label}>{t("admin.tasks.who")}</label>
          <select id="memberId" name="memberId" required className={ui.input}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dueDate" className={ui.label}>{t("admin.tasks.due")}</label>
          <input id="dueDate" name="dueDate" type="date" required defaultValue={today} className={ui.input} />
        </div>
        <button className={ui.primary}>{t("admin.add")}</button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-body text-slate">{t("admin.tasks.none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const member = byId.get(task.memberId);
            const done = task.doneAt !== null;
            return (
              <li key={task.id} className={`${ui.card} flex flex-wrap items-center gap-3 py-3`}>
                {member && (
                  <span className={`${ui.badge} ${memberBg[member.color as MemberColor]}`}>{member.name}</span>
                )}
                <span className={`min-w-0 flex-1 font-medium ${done ? "text-slate line-through" : ""}`}>{task.title}</span>
                <span className={`text-body-sm ${!done && task.dueDate < today ? "font-semibold text-coral-emphasis" : "text-slate"}`}>
                  {!done && task.dueDate < today ? t("dashboard.overdue") : dueLabel(task.dueDate, today)}
                </span>
                <form action={toggleTaskDone}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="done" value={String(done)} />
                  <button className={`${ui.badge} ${done ? "bg-mint-pulse" : "bg-ash-canvas"}`}>
                    {done ? t("admin.tasks.done") : t("admin.tasks.open")}
                  </button>
                </form>
                <form action={deleteTask}>
                  <input type="hidden" name="id" value={task.id} />
                  <button className={ui.danger}>{t("admin.delete")}</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
