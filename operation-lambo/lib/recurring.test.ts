import { describe, it, expect } from "vitest";
import {
  monthlyDate,
  occurrencesUpTo,
  dueOccurrences,
  nextOccurrence,
  type RecurRule,
} from "./recurring";

function rule(partial: Partial<RecurRule>): RecurRule {
  return {
    id: "r1",
    name: "Test",
    kind: "income",
    amount: 100,
    luxury: false,
    cadence: "weekly",
    startDate: "2026-01-01",
    active: true,
    lastPosted: null,
    ...partial,
  };
}

describe("monthlyDate", () => {
  it("advances by month, preserving day-of-month", () => {
    expect(monthlyDate("2026-01-15", 0)).toBe("2026-01-15");
    expect(monthlyDate("2026-01-15", 2)).toBe("2026-03-15");
  });
  it("clamps day-of-month to the month's length", () => {
    // Jan 31 + 1 month -> Feb 28 (2026 is not a leap year)
    expect(monthlyDate("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("occurrencesUpTo", () => {
  it("weekly every 7 days through today", () => {
    const r = rule({ cadence: "weekly", startDate: "2026-01-01" });
    expect(occurrencesUpTo(r, "2026-01-20")).toEqual([
      "2026-01-01",
      "2026-01-08",
      "2026-01-15",
    ]);
  });
  it("monthly through today", () => {
    const r = rule({ cadence: "monthly", startDate: "2026-01-10" });
    expect(occurrencesUpTo(r, "2026-03-09")).toEqual(["2026-01-10", "2026-02-10"]);
  });
  it("nothing before the start date", () => {
    const r = rule({ startDate: "2026-06-01" });
    expect(occurrencesUpTo(r, "2026-01-01")).toEqual([]);
  });
});

describe("dueOccurrences", () => {
  it("only returns occurrences after lastPosted", () => {
    const r = rule({ cadence: "weekly", startDate: "2026-01-01", lastPosted: "2026-01-08" });
    expect(dueOccurrences(r, "2026-01-20")).toEqual(["2026-01-15"]);
  });
  it("returns nothing for paused rules", () => {
    const r = rule({ active: false });
    expect(dueOccurrences(r, "2030-01-01")).toEqual([]);
  });
  it("back-posts everything due on a brand-new rule", () => {
    const r = rule({ cadence: "weekly", startDate: "2026-01-01", lastPosted: null });
    expect(dueOccurrences(r, "2026-01-15")).toEqual([
      "2026-01-01",
      "2026-01-08",
      "2026-01-15",
    ]);
  });
});

describe("nextOccurrence", () => {
  it("weekly: first date strictly after today", () => {
    const r = rule({ cadence: "weekly", startDate: "2026-01-01" });
    expect(nextOccurrence(r, "2026-01-08")).toBe("2026-01-15");
  });
  it("monthly: next month's anchor", () => {
    const r = rule({ cadence: "monthly", startDate: "2026-01-10" });
    expect(nextOccurrence(r, "2026-01-10")).toBe("2026-02-10");
  });
  it("null when paused", () => {
    expect(nextOccurrence(rule({ active: false }), "2026-01-01")).toBeNull();
  });
});
