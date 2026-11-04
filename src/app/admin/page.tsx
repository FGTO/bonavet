import Link from "next/link";
import { Suspense } from "react";
import { count, eq } from "drizzle-orm";
import { ui } from "@/components/ui/styles";
import { t, type MessageKey } from "@/i18n";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-slate">{t("dashboard.loading")}</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const parent = await requireParent();
  const db = getDb();
  const id = parent.householdId;
  const [[members], [calendars], [tasks], [screens]] = await Promise.all([
    db.select({ n: count() }).from(schema.familyMember).where(eq(schema.familyMember.householdId, id)),
    db.select({ n: count() }).from(schema.calendar).where(eq(schema.calendar.householdId, id)),
    db.select({ n: count() }).from(schema.task).where(eq(schema.task.householdId, id)),
    db.select({ n: count() }).from(schema.screen).where(eq(schema.screen.householdId, id)),
  ]);
  const cards: { href: string; label: MessageKey; n: number }[] = [
    { href: "/admin/members", label: "admin.nav.members", n: members.n },
    { href: "/admin/calendars", label: "admin.nav.calendars", n: calendars.n },
    { href: "/admin/tasks", label: "admin.nav.tasks", n: tasks.n },
    { href: "/admin/screens", label: "admin.nav.screens", n: screens.n },
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-heading">
        Hej <span className="text-coral-emphasis">{parent.name.split(" ")[0]}</span>
      </h1>
      <p className="text-body-lg text-slate">{t("admin.overview.intro", { household: parent.householdName })}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={`${ui.card} transition-transform hover:-translate-y-0.5`}>
            <span className="block text-body-sm font-medium text-slate">{t(c.label)}</span>
            <span className="font-display text-heading-lg">{c.n}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
