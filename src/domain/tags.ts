import type { FamilyMember } from "./types";

/** One or more bracket groups at the very start of a title: "[Ella][Oscar] Dentist". */
const LEADING_GROUP = /^\s*\[([^\]]*)\]/;

function normalizeTag(tag: string): string {
  return tag.trim().toLocaleLowerCase("sv-SE");
}

/** Splits leading `[Tag]` groups from the rest of an Event title. */
export function splitTags(title: string): { tags: string[]; rest: string } {
  const tags: string[] = [];
  let rest = title;
  let match = LEADING_GROUP.exec(rest);
  while (match) {
    tags.push(match[1].trim());
    rest = rest.slice(match[0].length);
    match = LEADING_GROUP.exec(rest);
  }
  return { tags, rest: rest.trim() };
}

export interface EventAssignment {
  /** Family Members the Event belongs to; empty means it is a Household Event. */
  memberIds: string[];
  /** Title to show: recognised Tags removed, unrecognised ones kept so typos stay visible. */
  displayTitle: string;
}

/**
 * Decides which Family Members an Event belongs to from the Tags at the start of its title.
 * Matching ignores case and surrounding whitespace. Unknown Tags are ignored for assignment.
 */
export function assignEvent(title: string, members: FamilyMember[]): EventAssignment {
  const { tags, rest } = splitTags(title);
  if (tags.length === 0) return { memberIds: [], displayTitle: title.trim() };

  const byTag = new Map(members.map((m) => [normalizeTag(m.tag), m.id]));
  const memberIds: string[] = [];
  const unknown: string[] = [];
  for (const tag of tags) {
    const id = byTag.get(normalizeTag(tag));
    if (id) {
      if (!memberIds.includes(id)) memberIds.push(id);
    } else {
      unknown.push(tag);
    }
  }

  if (memberIds.length === 0) return { memberIds, displayTitle: title.trim() };

  const prefix = unknown.map((t) => `[${t}]`).join("");
  const displayTitle = [prefix, rest].filter(Boolean).join(" ") || title.trim();
  return { memberIds, displayTitle };
}
