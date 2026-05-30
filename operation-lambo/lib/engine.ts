// ---------------------------------------------------------------------------
// OPERATION LAMBO — game engine
//
// ALL formulas from the build spec (section 2) live here as PURE functions.
// No I/O, no Supabase, no Date.now() side effects inside the math: every
// function that needs "today" takes it as an explicit ISO date string so the
// math is deterministic and unit-testable, and identical on server + client.
// ---------------------------------------------------------------------------

export const GOAL = 3_000_000;
export const DEFAULT_DAILY_GOAL = 2740; // ≈ 3M / 1095 days
export const DEFAULT_MISS_PENALTY = 3; // days the target slips per missed day
export const TARGET_MONTHS = 36; // baseTarget = startDate + 36 months
export const TRAILING_WINDOW = 30; // days used for income + velocity

export type Kind = "income" | "spend" | "debt" | "asset";

export interface Tx {
  date: string; // 'YYYY-MM-DD'
  kind: Kind;
  amount: number; // always > 0
  note?: string | null;
  luxury?: boolean;
  recurring?: boolean; // auto-posted by a recurring rule (excluded from the mission)
}

export interface Debt {
  balance: number;
  apr?: number;
}

export interface Asset {
  value: number;
  liquid: boolean;
}

export interface Game {
  startDate: string; // 'YYYY-MM-DD'
  baseTarget: string; // 'YYYY-MM-DD' (startDate + 36 months)
  delayDays: number;
  bank: number;
  dailyGoal: number;
  missPenalty: number;
}

export interface GameState {
  game: Game;
  transactions: Tx[];
  debts: Debt[];
  assets: Asset[];
  checkIns: string[]; // completed-mission dates
  judgedDays: string[]; // days already penalized by the slip engine
}

// ---------------------------------------------------------------------------
// Date helpers — operate on 'YYYY-MM-DD' strings in UTC so there is never a
// timezone-dependent off-by-one. All pure.
// ---------------------------------------------------------------------------

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso);
  const targetMonth = d.getUTCMonth() + months;
  d.setUTCMonth(targetMonth);
  return toISO(d);
}

/** Whole days from `a` to `b` (b - a). Positive when b is later than a. */
export function diffDays(a: string, b: string): number {
  return Math.round(
    (parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000,
  );
}

// ---------------------------------------------------------------------------
// Core money math
// ---------------------------------------------------------------------------

/** A transaction's signed effect on the bank: income adds, everything else leaves. */
export function signed(tx: Tx): number {
  return tx.kind === "income" ? tx.amount : -tx.amount;
}

export function totalDebt(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + d.balance, 0);
}

/**
 * Spec literal: totalAssets = bank + sum(assets.value).
 * (The bank is counted as an asset here, by design of the spec.)
 */
export function totalAssets(bank: number, assets: Asset[]): number {
  return bank + assets.reduce((sum, a) => sum + a.value, 0);
}

export function liquidAssets(assets: Asset[]): number {
  return assets.filter((a) => a.liquid).reduce((sum, a) => sum + a.value, 0);
}

/** Spec literal: netWorth = bank + totalAssets - totalDebt. */
export function netWorth(
  bank: number,
  assets: Asset[],
  debts: Debt[],
): number {
  return bank + totalAssets(bank, assets) - totalDebt(debts);
}

/** The number that drives the unlock: investable = bank + liquidAssets - totalDebt. */
export function investable(
  bank: number,
  assets: Asset[],
  debts: Debt[],
): number {
  return bank + liquidAssets(assets) - totalDebt(debts);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function progress(investableValue: number): number {
  return clamp(investableValue / GOAL, 0, 1);
}

export function won(investableValue: number): boolean {
  return investableValue >= GOAL;
}

// ---------------------------------------------------------------------------
// Windows / pace
// ---------------------------------------------------------------------------

/** True if `txDate` is within the trailing `window` days ending on `today`. */
function inTrailingWindow(txDate: string, today: string, window: number): boolean {
  const age = diffDays(txDate, today);
  return age >= 0 && age < window;
}

/** Sum of income transactions in the trailing 30 days. */
export function monthlyIncome(transactions: Tx[], today: string): number {
  return transactions
    .filter((t) => t.kind === "income" && inTrailingWindow(t.date, today, TRAILING_WINDOW))
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Net change to the bank over the trailing 30 days (signed). */
export function trailingBankChange(transactions: Tx[], today: string): number {
  return transactions
    .filter((t) => inTrailingWindow(t.date, today, TRAILING_WINDOW))
    .reduce((sum, t) => sum + signed(t), 0);
}

/** Number of active days in the measurement window: 1..30. */
export function daysActive(startDate: string, today: string): number {
  const since = diffDays(startDate, today) + 1; // inclusive of today
  return clamp(since, 1, TRAILING_WINDOW);
}

/** Your REAL pace, $/day, over the trailing window. */
export function velocity(
  transactions: Tx[],
  startDate: string,
  today: string,
): number {
  return trailingBankChange(transactions, today) / daysActive(startDate, today);
}

/** $/day required to hit the goal by the base target. */
export function reqPace(
  investableValue: number,
  baseTarget: string,
  today: string,
): number {
  const daysLeft = diffDays(today, baseTarget);
  if (daysLeft <= 0) return investableValue >= GOAL ? 0 : Infinity;
  return (GOAL - investableValue) / daysLeft;
}

export function effectiveTarget(baseTarget: string, delayDays: number): string {
  return addDays(baseTarget, delayDays);
}

/** ETA at your real pace, or null if you're not moving forward. */
export function paceETA(
  investableValue: number,
  velocityValue: number,
  today: string,
): string | null {
  if (investableValue >= GOAL) return today;
  if (velocityValue <= 0) return null;
  const daysOut = Math.ceil((GOAL - investableValue) / velocityValue);
  return addDays(today, daysOut);
}

// ---------------------------------------------------------------------------
// Daily mission
// ---------------------------------------------------------------------------

/** Net change to the bank from today's transactions only. */
export function netToday(transactions: Tx[], today: string): number {
  return transactions
    .filter((t) => t.date === today)
    .reduce((sum, t) => sum + signed(t), 0);
}

export interface MissionStatus {
  hasIncome: boolean; // at least one income tx today
  goalMet: boolean; // net bank change today >= dailyGoal
  noLuxury: boolean; // zero luxury-flagged spend today
  netToday: number;
  complete: boolean;
}

export function mission(
  transactions: Tx[],
  dailyGoal: number,
  today: string,
): MissionStatus {
  // The mission counts MANUAL activity only — auto-posted recurring entries
  // update your numbers but never complete the daily mission for you.
  const todays = transactions.filter((t) => t.date === today && !t.recurring);
  const hasIncome = todays.some((t) => t.kind === "income");
  const net = todays.reduce((sum, t) => sum + signed(t), 0);
  const goalMet = net >= dailyGoal;
  const noLuxury = !todays.some((t) => t.luxury);
  return {
    hasIncome,
    goalMet,
    noLuxury,
    netToday: net,
    complete: hasIncome && goalMet && noLuxury,
  };
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

/**
 * Consecutive completed days ending today — or ending yesterday if today
 * isn't done yet (today is still in play and shouldn't break the streak).
 */
export function streak(checkIns: string[], today: string): number {
  const done = new Set(checkIns);
  let cursor = done.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// The slip engine (the teeth)
// ---------------------------------------------------------------------------

export interface SlipResult {
  /** Past days (start_date..yesterday) that are unmet and not yet judged. */
  daysToJudge: string[];
  /** delay to add: daysToJudge.length * missPenalty */
  addedDelay: number;
}

/**
 * Evaluate every calendar day from startDate to YESTERDAY. A day earns a
 * penalty when it has no completed mission AND has not already been judged.
 * Today is never penalized — it's still in play. Pure: returns what should
 * change; the caller persists it.
 */
export function evaluateSlip(
  startDate: string,
  today: string,
  checkIns: string[],
  judgedDays: string[],
  missPenalty: number,
): SlipResult {
  const done = new Set(checkIns);
  const judged = new Set(judgedDays);
  const daysToJudge: string[] = [];

  // start at startDate, stop before today (yesterday is the last judged day)
  for (let day = startDate; diffDays(day, today) > 0; day = addDays(day, 1)) {
    if (!done.has(day) && !judged.has(day)) {
      daysToJudge.push(day);
    }
  }

  return { daysToJudge, addedDelay: daysToJudge.length * missPenalty };
}

// ---------------------------------------------------------------------------
// Levels (the map)
// ---------------------------------------------------------------------------

export interface Level {
  num: number;
  name: string;
  cleared: boolean;
}

export function levels(state: GameState, today: string): Level[] {
  const { game, assets, debts, transactions } = state;
  const debtTotal = totalDebt(debts);
  const income30 = monthlyIncome(transactions, today);
  const inv = investable(game.bank, assets, debts);

  return [
    {
      num: 1,
      name: "STOP THE BLEEDING",
      cleared: game.bank >= 10000 && debtTotal <= 0,
    },
    { num: 2, name: "THE FOUNDATION", cleared: income30 >= 30000 },
    { num: 3, name: "THE SCALE", cleared: income30 >= 100000 },
    { num: 4, name: "ASSET ENGINE", cleared: assets.length >= 1 },
    { num: 5, name: "THE HOLDCO", cleared: inv >= GOAL },
  ];
}

// ---------------------------------------------------------------------------
// One-shot derived snapshot — everything the UI needs in one pure call.
// ---------------------------------------------------------------------------

export interface Derived {
  bank: number;
  totalDebt: number;
  totalAssets: number;
  liquidAssets: number;
  netWorth: number;
  investable: number;
  progress: number;
  won: boolean;
  monthlyIncome: number;
  velocity: number;
  reqPace: number;
  baseTarget: string;
  effectiveTarget: string;
  paceETA: string | null;
  daysUntilTarget: number;
  mission: MissionStatus;
  streak: number;
  levels: Level[];
}

export function derive(state: GameState, today: string = todayISO()): Derived {
  const { game, assets, debts, transactions, checkIns } = state;
  const inv = investable(game.bank, assets, debts);
  const vel = velocity(transactions, game.startDate, today);
  const effTarget = effectiveTarget(game.baseTarget, game.delayDays);

  return {
    bank: game.bank,
    totalDebt: totalDebt(debts),
    totalAssets: totalAssets(game.bank, assets),
    liquidAssets: liquidAssets(assets),
    netWorth: netWorth(game.bank, assets, debts),
    investable: inv,
    progress: progress(inv),
    won: won(inv),
    monthlyIncome: monthlyIncome(transactions, today),
    velocity: vel,
    reqPace: reqPace(inv, game.baseTarget, today),
    baseTarget: game.baseTarget,
    effectiveTarget: effTarget,
    paceETA: paceETA(inv, vel, today),
    daysUntilTarget: diffDays(today, effTarget),
    mission: mission(transactions, game.dailyGoal, today),
    streak: streak(checkIns, today),
    levels: levels(state, today),
  };
}
