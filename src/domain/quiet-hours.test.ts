import { describe, expect, it } from "vitest";
import { isQuietHours } from "./quiet-hours";

const TZ = "Europe/Stockholm";
const at = (utc: string) => new Date(utc);

describe("isQuietHours", () => {
  it("is quiet late in the evening and before dawn", () => {
    expect(isQuietHours(at("2026-11-04T21:30:00Z"), TZ)).toBe(true); // 22:30 local
    expect(isQuietHours(at("2026-11-04T05:00:00Z"), TZ)).toBe(true); // 06:00 local
  });
  it("is awake during the day", () => {
    expect(isQuietHours(at("2026-11-04T05:30:00Z"), TZ)).toBe(false); // 06:30 local
    expect(isQuietHours(at("2026-11-04T12:00:00Z"), TZ)).toBe(false);
  });
  it("supports windows that do not wrap midnight", () => {
    expect(isQuietHours(at("2026-11-04T12:30:00Z"), TZ, { start: "13:00", end: "15:00" })).toBe(true);
  });
});
