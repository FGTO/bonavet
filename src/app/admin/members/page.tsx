import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { memberBg } from "@/components/dashboard/member-colors";
import { ErrorNotice } from "@/components/admin/error-notice";
import { ui } from "@/components/ui/styles";
import { MEMBER_COLORS, type MemberColor } from "@/domain/types";
import { t, type MessageKey } from "@/i18n";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";
import { addMember, deleteMember, moveMember, updateMember } from "./actions";

export default function MembersPage({ searchParams }: PageProps<"/admin/members">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-heading">{t("admin.members.title")}</h1>
      <Suspense fallback={<p className="text-slate">{t("dashboard.loading")}</p>}>
        <Members searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Members({ searchParams }: Pick<PageProps<"/admin/members">, "searchParams">) {
  const parent = await requireParent();
  const { error } = await searchParams;
  const members = await getDb()
    .select()
    .from(schema.familyMember)
    .where(eq(schema.familyMember.householdId, parent.householdId))
    .orderBy(asc(schema.familyMember.position), asc(schema.familyMember.createdAt));
  const example = members.find((m) => !m.isParent)?.tag ?? members[0]?.tag ?? "Ella";

  return (
    <>
      <p className="max-w-2xl text-body text-slate">{t("admin.members.intro", { example })}</p>
      <ErrorNotice error={error} prefix="admin.members" />
      <ul className="flex flex-col gap-3">
        {members.map((m, i) => (
          <li key={m.id} className={`${ui.card} flex flex-col gap-3`}>
            <form action={updateMember} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <input type="hidden" name="id" value={m.id} />
              <MemberFields m={m} />
              <div className="flex flex-wrap items-center gap-2 md:col-span-3">
                <button className={ui.primary}>{t("admin.save")}</button>
              </div>
            </form>
            <div className="flex flex-wrap gap-2 border-t border-warm-stone pt-3">
              <form action={moveMember}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="direction" value="up" />
                <button className={ui.ghost} disabled={i === 0}>
                  ← {t("admin.members.moveUp")}
                </button>
              </form>
              <form action={moveMember}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="direction" value="down" />
                <button className={ui.ghost} disabled={i === members.length - 1}>
                  {t("admin.members.moveDown")} →
                </button>
              </form>
              <form action={deleteMember} className="ml-auto">
                <input type="hidden" name="id" value={m.id} />
                <button className={ui.danger}>{t("admin.delete")}</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={addMember} className={`${ui.card} grid gap-3 border-2 border-dashed border-warm-stone md:grid-cols-[1fr_1fr_auto] md:items-end`}>
        <MemberFields />
        <div className="md:col-span-3">
          <button className={ui.primary}>{t("admin.add")}</button>
        </div>
      </form>
    </>
  );
}

function MemberFields({
  m,
}: {
  m?: { id: string; name: string; tag: string; color: string; isParent: boolean; email: string | null };
}) {
  const key = m?.id ?? "new";
  return (
    <>
      <div>
        <label htmlFor={`name-${key}`} className={ui.label}>
          {t("admin.members.name")}
        </label>
        <input id={`name-${key}`} name="name" required defaultValue={m?.name} className={ui.input} />
      </div>
      <div>
        <label htmlFor={`tag-${key}`} className={ui.label}>
          {t("admin.members.tag")}
        </label>
        <div className="flex items-center">
          <span className="px-1 font-semibold text-slate">[</span>
          <input id={`tag-${key}`} name="tag" defaultValue={m?.tag} placeholder={m?.name ?? "Ella"} className={ui.input} />
          <span className="px-1 font-semibold text-slate">]</span>
        </div>
      </div>
      <fieldset>
        <legend className={ui.label}>{t("admin.members.color")}</legend>
        <div className="flex gap-1.5">
          {MEMBER_COLORS.map((c, i) => (
            <label key={c} title={t(`color.${c}` as MessageKey)} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={m ? m.color === c : i === 0}
                className="peer sr-only"
              />
              <span
                className={`block size-8 rounded-full border-2 border-transparent peer-checked:border-inkwell-navy peer-focus-visible:outline-2 peer-focus-visible:outline-coral-emphasis ${memberBg[c as MemberColor]}`}
              />
              <span className="sr-only">{t(`color.${c}` as MessageKey)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-body-sm font-medium">
        <input type="checkbox" name="isParent" defaultChecked={m?.isParent} className="size-5 accent-inkwell-navy" />
        {t("admin.members.isParent")}
      </label>
      <div className="md:col-span-2">
        <label htmlFor={`email-${key}`} className={ui.label}>
          {t("admin.members.email")}
        </label>
        <input
          id={`email-${key}`}
          name="email"
          type="email"
          defaultValue={m?.email ?? ""}
          placeholder="namn@gmail.com"
          className={ui.input}
        />
      </div>
    </>
  );
}
