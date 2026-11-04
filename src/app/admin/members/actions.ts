"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { MEMBER_COLORS, type MemberColor } from "@/domain/types";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";

const fail = (error: string) => redirect(`/admin/members?error=${error}`);

function readMember(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const tag = String(form.get("tag") ?? "").trim().replace(/[[\]]/g, "") || name;
  const colorRaw = String(form.get("color") ?? "");
  const color: MemberColor = (MEMBER_COLORS as readonly string[]).includes(colorRaw)
    ? (colorRaw as MemberColor)
    : "sky";
  const isParent = form.get("isParent") === "on";
  const email = String(form.get("email") ?? "").trim().toLowerCase() || null;
  return { name, tag, color, isParent, email };
}

async function tagTaken(householdId: string, tag: string, exceptId?: string) {
  const rows = await getDb()
    .select({ id: schema.familyMember.id })
    .from(schema.familyMember)
    .where(
      and(
        eq(schema.familyMember.householdId, householdId),
        sql`lower(${schema.familyMember.tag}) = lower(${tag})`,
        exceptId ? ne(schema.familyMember.id, exceptId) : undefined,
      ),
    );
  return rows.length > 0;
}

export async function addMember(form: FormData) {
  const parent = await requireParent();
  const m = readMember(form);
  if (!m.name) return;
  if (m.isParent && !m.email) fail("parentNeedsEmail");
  if (await tagTaken(parent.householdId, m.tag)) fail("tagTaken");

  const db = getDb();
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${schema.familyMember.position}), -1)` })
    .from(schema.familyMember)
    .where(eq(schema.familyMember.householdId, parent.householdId));
  await db.insert(schema.familyMember).values({ ...m, householdId: parent.householdId, position: Number(max) + 1 });
  refresh();
}

export async function updateMember(form: FormData) {
  const parent = await requireParent();
  const id = String(form.get("id"));
  const m = readMember(form);
  if (!m.name) return;
  if (m.isParent && !m.email) fail("parentNeedsEmail");
  if (await tagTaken(parent.householdId, m.tag, id)) fail("tagTaken");
  if (!m.isParent && (await isLastParent(parent.householdId, id))) fail("lastParent");

  await getDb()
    .update(schema.familyMember)
    .set(m)
    .where(and(eq(schema.familyMember.id, id), eq(schema.familyMember.householdId, parent.householdId)));
  refresh();
}

async function isLastParent(householdId: string, memberId: string) {
  const parents = await getDb()
    .select({ id: schema.familyMember.id })
    .from(schema.familyMember)
    .where(and(eq(schema.familyMember.householdId, householdId), eq(schema.familyMember.isParent, true)));
  return parents.length === 1 && parents[0].id === memberId;
}

export async function deleteMember(form: FormData) {
  const parent = await requireParent();
  const id = String(form.get("id"));
  if (await isLastParent(parent.householdId, id)) fail("lastParent");
  await getDb()
    .delete(schema.familyMember)
    .where(and(eq(schema.familyMember.id, id), eq(schema.familyMember.householdId, parent.householdId)));
  refresh();
}

/** Swaps a Family Member's column with its neighbour. */
export async function moveMember(form: FormData) {
  const parent = await requireParent();
  const id = String(form.get("id"));
  const direction = form.get("direction") === "up" ? -1 : 1;
  const db = getDb();
  const members = await db
    .select({ id: schema.familyMember.id })
    .from(schema.familyMember)
    .where(eq(schema.familyMember.householdId, parent.householdId))
    .orderBy(asc(schema.familyMember.position), asc(schema.familyMember.createdAt));
  const index = members.findIndex((m) => m.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= members.length) return;
  [members[index], members[target]] = [members[target], members[index]];
  const [first, ...rest] = members.map((m, position) =>
    db
      .update(schema.familyMember)
      .set({ position })
      .where(and(eq(schema.familyMember.id, m.id), eq(schema.familyMember.householdId, parent.householdId))),
  );
  await db.batch([first, ...rest]);
  refresh();
}
