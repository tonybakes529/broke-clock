// ---------------------------------------------------------------------------
// Recurring rules — auto-post weekly/monthly income & expenses for the business.
// Pure occurrence math (no I/O) so it's testable; the provider persists results.
// ---------------------------------------------------------------------------

import { addDays, diffDays, parseISO, toISO, type Kind } from "./engine";

export type Cadence = "weekly" | "monthly";

export interface RecurRule {
  id: string;
  name: string;
  kind: Kind;
  amount: number;
  luxury: boolean;
  cadence: Cadence;
  startDate: string; // 'YYYY-MM-DD' — first occurrence + the anchor day
  active: boolean;
  lastPosted: string | null; // last occurrence date already posted
}

/** The Nth monthly occurrence from `startISO`, day-of-month clamped to the month. */
export function monthlyDate(startISO: string, i: number): string {
  const s = parseISO(startISO);
  const startDay = s.getUTCDate();
  const base = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(startDay, daysInMonth);
  return toISO(new Date(Date.UTC(year, month, day)));
}

/** All occurrence dates from the rule's start up to and including `today`. */
export function occurrencesUpTo(rule: RecurRule, today: string): string[] {
  if (diffDays(rule.startDate, today) < 0) return [];
  const out: string[] = [];
  if (rule.cadence === "weekly") {
    for (let d = rule.startDate; diffDays(d, today) >= 0; d = addDays(d, 7)) {
      out.push(d);
    }
  } else {
    for (let i = 0; ; i++) {
      const d = monthlyDate(rule.startDate, i);
      if (diffDays(d, today) < 0) break;
      out.push(d);
    }
  }
  return out;
}

/** Occurrences that are due but not yet posted (date > lastPosted). */
export function dueOccurrences(rule: RecurRule, today: string): string[] {
  if (!rule.active) return [];
  return occurrencesUpTo(rule, today).filter(
    (d) => !rule.lastPosted || d > rule.lastPosted,
  );
}

/** The next occurrence strictly after `today` (for "next charge" display). */
export function nextOccurrence(rule: RecurRule, today: string): string | null {
  if (!rule.active) return null;
  if (rule.cadence === "weekly") {
    let d = rule.startDate;
    while (diffDays(d, today) >= 0) d = addDays(d, 7);
    return d;
  }
  for (let i = 0; ; i++) {
    const d = monthlyDate(rule.startDate, i);
    if (diffDays(today, d) > 0) return d; // d strictly after today
    if (i > 1200) return null; // safety
  }
}
