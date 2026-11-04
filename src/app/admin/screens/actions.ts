"use server";

import { refresh } from "next/cache";
import { requireParent } from "@/server/parent";
import { createPairingCode, revokeScreen } from "@/server/screens";

export async function createScreen(form: FormData) {
  const parent = await requireParent();
  await createPairingCode(parent.householdId, String(form.get("name") ?? ""));
  refresh();
}

/** Unpairs a Screen; its cookie stops working on the next poll and it shows the pairing page. */
export async function removeScreen(form: FormData) {
  const parent = await requireParent();
  await revokeScreen(parent.householdId, String(form.get("id")));
  refresh();
}
