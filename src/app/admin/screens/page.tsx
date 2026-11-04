import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { ui } from "@/components/ui/styles";
import { t } from "@/i18n";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";
import { createScreen, removeScreen } from "./actions";

export default function ScreensPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-heading">{t("admin.screens.title")}</h1>
      <p className="max-w-2xl text-body text-slate">{t("admin.screens.intro")}</p>
      <Suspense fallback={<p className="text-slate">{t("dashboard.loading")}</p>}>
        <Screens />
      </Suspense>
    </div>
  );
}

const when = (d: Date) =>
  d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" });

async function Screens() {
  const parent = await requireParent();
  const screens = await getDb()
    .select()
    .from(schema.screen)
    .where(eq(schema.screen.householdId, parent.householdId))
    .orderBy(desc(schema.screen.createdAt));
  const now = new Date();

  return (
    <>
      <form action={createScreen} className={`${ui.card} flex flex-wrap items-end gap-3`}>
        <div className="min-w-48 flex-1">
          <label htmlFor="name" className={ui.label}>{t("admin.screens.name")}</label>
          <input id="name" name="name" placeholder={t("admin.screens.namePlaceholder")} className={ui.input} />
        </div>
        <button className={ui.primary}>{t("admin.screens.create")}</button>
      </form>

      {screens.length === 0 ? (
        <p className="text-body text-slate">{t("admin.screens.none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {screens.map((s) => {
            const waiting = !s.tokenHash;
            const expired = waiting && (!s.pairingExpiresAt || s.pairingExpiresAt < now);
            return (
              <li key={s.id} className={`${ui.card} flex flex-wrap items-center gap-4`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-body-sm text-slate">
                    {waiting
                      ? expired
                        ? t("admin.screens.expired")
                        : t("admin.screens.codeExpires", { time: when(s.pairingExpiresAt!) })
                      : [
                          s.pairedAt && t("admin.screens.paired", { time: when(s.pairedAt) }),
                          s.lastSeenAt && t("admin.screens.lastSeen", { time: when(s.lastSeenAt) }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>
                {waiting && !expired && (
                  <span className="font-display rounded-control bg-butter-yellow px-4 py-2 text-heading-sm tracking-[0.2em]">
                    {s.pairingCode}
                  </span>
                )}
                <form action={removeScreen}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className={ui.danger}>{waiting ? t("admin.delete") : t("admin.screens.revoke")}</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
