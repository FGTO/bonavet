import { describe, expect, it } from "vitest";
import { assignEvent, splitTags } from "./tags";
import type { FamilyMember } from "./types";

const member = (id: string, tag: string): FamilyMember => ({
  id,
  name: tag,
  tag,
  color: "sky",
  position: 0,
  isParent: false,
});
const members = [member("ella", "Ella"), member("oscar", "Oscar")];

describe("splitTags", () => {
  it("splits several leading groups", () => {
    expect(splitTags("[Ella][Oscar] Dentist")).toEqual({ tags: ["Ella", "Oscar"], rest: "Dentist" });
  });
  it("only reads brackets at the start", () => {
    expect(splitTags("Dentist [Ella]")).toEqual({ tags: [], rest: "Dentist [Ella]" });
  });
  it("tolerates spaces between groups", () => {
    expect(splitTags("  [Ella] [Oscar]  Dentist ")).toEqual({ tags: ["Ella", "Oscar"], rest: "Dentist" });
  });
});

describe("assignEvent", () => {
  it("assigns a tagged Event and strips the Tag", () => {
    expect(assignEvent("[Ella] Soccer training", members)).toEqual({
      memberIds: ["ella"],
      displayTitle: "Soccer training",
    });
  });
  it("ignores case and whitespace inside the brackets", () => {
    expect(assignEvent("[ ELLA ] Soccer", members).memberIds).toEqual(["ella"]);
  });
  it("assigns to several Family Members", () => {
    expect(assignEvent("[Ella][Oscar] Dentist", members)).toEqual({
      memberIds: ["ella", "oscar"],
      displayTitle: "Dentist",
    });
  });
  it("de-duplicates repeated Tags", () => {
    expect(assignEvent("[Ella][ella] Dentist", members).memberIds).toEqual(["ella"]);
  });
  it("makes an untagged Event a Household Event", () => {
    expect(assignEvent("Grandma visits", members)).toEqual({ memberIds: [], displayTitle: "Grandma visits" });
  });
  it("keeps a typo'd Tag visible on a Household Event", () => {
    expect(assignEvent("[Elal] Dentist", members)).toEqual({ memberIds: [], displayTitle: "[Elal] Dentist" });
  });
  it("keeps unknown Tags in the title when another Tag matches", () => {
    expect(assignEvent("[Ella][Elal] Dentist", members)).toEqual({
      memberIds: ["ella"],
      displayTitle: "[Elal] Dentist",
    });
  });
  it("falls back to the raw title when nothing but a Tag is written", () => {
    expect(assignEvent("[Ella]", members)).toEqual({ memberIds: ["ella"], displayTitle: "[Ella]" });
  });
  it("matches Swedish letters case-insensitively", () => {
    expect(assignEvent("[åsa] Fika", [member("asa", "Åsa")]).memberIds).toEqual(["asa"]);
  });
});
