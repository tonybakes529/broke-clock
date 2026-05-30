// ---------------------------------------------------------------------------
// Local (browser) store — Operation Lambo runs entirely client-side.
// Game state lives in localStorage. No backend, no auth, no env vars.
// ---------------------------------------------------------------------------

import {
  addMonths,
  todayISO,
  DEFAULT_DAILY_GOAL,
  DEFAULT_MISS_PENALTY,
  type GameState,
  type Kind,
} from "./engine";

export interface LTx {
  id: string;
  date: string;
  kind: Kind;
  amount: number;
  note: string | null;
  luxury: boolean;
}
export interface LDebt {
  id: string;
  name: string;
  balance: number;
  apr: number;
}
export interface LAsset {
  id: string;
  name: string;
  value: number;
  liquid: boolean;
}
export interface LGame {
  startDate: string;
  baseTarget: string;
  delayDays: number;
  bank: number;
  dailyGoal: number;
  missPenalty: number;
}
export interface LocalState {
  game: LGame;
  transactions: LTx[];
  debts: LDebt[];
  assets: LAsset[];
  checkIns: string[];
  judgedDays: string[];
}

export const STORAGE_KEY = "operation-lambo";

// Your real starting state — seeded on first run. Edit to match reality.
export const SEED_BANK = 1987.56;
export const SEED_DEBTS: { name: string; balance: number }[] = [
  { name: "Chase", balance: 6500 },
  { name: "Amex", balance: 7000 },
  { name: "Frontier", balance: 5000 },
  { name: "Blue", balance: 5600 },
];

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultState(): LocalState {
  const start = todayISO();
  return {
    game: {
      startDate: start,
      baseTarget: addMonths(start, 36),
      delayDays: 0,
      bank: SEED_BANK,
      dailyGoal: DEFAULT_DAILY_GOAL,
      missPenalty: DEFAULT_MISS_PENALTY,
    },
    transactions: [],
    debts: SEED_DEBTS.map((d) => ({ id: uid(), name: d.name, balance: d.balance, apr: 0 })),
    assets: [],
    checkIns: [],
    judgedDays: [],
  };
}

export function loadState(): LocalState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    const base = defaultState();
    // shallow-merge so older/partial saves still load cleanly
    return {
      game: { ...base.game, ...parsed.game },
      transactions: parsed.transactions ?? [],
      debts: parsed.debts ?? base.debts,
      assets: parsed.assets ?? [],
      checkIns: parsed.checkIns ?? [],
      judgedDays: parsed.judgedDays ?? [],
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: LocalState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Map the local store to the pure-engine GameState shape. */
export function toEngineState(s: LocalState): GameState {
  return {
    game: s.game,
    transactions: s.transactions.map((t) => ({
      date: t.date,
      kind: t.kind,
      amount: t.amount,
      note: t.note,
      luxury: t.luxury,
    })),
    debts: s.debts.map((d) => ({ balance: d.balance, apr: d.apr })),
    assets: s.assets.map((a) => ({ value: a.value, liquid: a.liquid })),
    checkIns: s.checkIns,
    judgedDays: s.judgedDays,
  };
}
