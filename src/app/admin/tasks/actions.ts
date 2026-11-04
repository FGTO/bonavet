"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The Family Member must belong to the Parent's Household — never trust the form. */
async function memberInHousehold(householdId: string, memberId: string) {
  const rows = await getDb()
    .select({ id: schema.familyMember.id })
    .from(schema.familyMember)
    .where(and(eq(schema.familyMember.id, memberId), eq(schema.familyMember.householdId, householdId)));
  return rows.length > 0;
}

export async function addTask(form: FormData) {
  const parent = await requireParent();
  const title = String(form.get("title") ?? "").trim();
  const memberId = String(form.get("memberId") ?? "");
  const dueDate = String(form.get("dueDate") ?? "");
  if (!title || !DAY.test(dueDate) || !(await memberInHousehold(parent.householdId, memberId))) return;
  await getDb().insert(schema.task).values({ householdId: parent.householdId, memberId, title, dueDate });
  refresh();
}

export async function toggleTaskDone(form: FormData) {
  const parent = await requireParent();
  const id = String(form.get("id"));
  const done = form.get("done") === "true";
  await getDb()
    .update(schema.task)
    .set({ doneAt: done ? null : new Date() })
    .where(and(eq(schema.task.id, id), eq(schema.task.householdId, parent.householdId)));
  refresh();
}

export async function deleteTask(form: FormData) {
  const parent = await requireParent();
  const id = String(form.get("id"));
  await getDb()
    .delete(schema.task)
    .where(and(eq(schema.task.id, id), eq(schema.task.householdId, parent.householdId)));
  refresh();
}
