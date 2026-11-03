import { describe, expect, it } from "vitest";
import { ARCHIVE_RETENTION_DAYS, daysUntilPurge } from "./archive";

const archivedAt = "2026-11-01T10:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("daysUntilPurge", () => {
  it("starts at the full retention right after archiving", () => {
    expect(daysUntilPurge(archivedAt, at(archivedAt))).toBe(ARCHIVE_RETENTION_DAYS);
    expect(daysUntilPurge(archivedAt, at("2026-11-01T10:05:00.000Z"))).toBe(30);
  });

  it("never shows more than the retention, even with a clock slightly behind", () => {
    expect(daysUntilPurge(archivedAt, at("2026-11-01T09:30:00.000Z"))).toBe(30);
  });

  it("counts down whole days, rounding up", () => {
    expect(daysUntilPurge(archivedAt, at("2026-11-11T09:00:00.000Z"))).toBe(21);
    expect(daysUntilPurge(archivedAt, at("2026-11-11T11:00:00.000Z"))).toBe(20);
    expect(daysUntilPurge(archivedAt, at("2026-11-30T12:00:00.000Z"))).toBe(1);
  });

  it("never goes below zero", () => {
    expect(daysUntilPurge(archivedAt, at("2026-12-01T10:00:00.000Z"))).toBe(0);
    expect(daysUntilPurge(archivedAt, at("2027-01-01T00:00:00.000Z"))).toBe(0);
  });
});
