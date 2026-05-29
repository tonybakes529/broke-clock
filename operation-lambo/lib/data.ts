import { addMonths, type GameState } from "./engine";
import type { FullState } from "./types";
import { createClient } from "./supabase/server";

// Your real starting state — seeded once on first login. Edit to match reality.
export const SEED_BANK = 1987.56;
export const SEED_DEBTS: { name: string; balance: number }[] = [
  { name: "Chase", balance: 6500 },
  { name: "Amex", balance: 7000 },
  { name: "Frontier", balance: 5000 },
  { name: "Blue", balance: 5600 },
];

/**
 * Ensure the signed-in user has a game row. Creates one (start_date = today,
 * base_target = +36 months) and seeds the starting bank + debts on first login.
 */
export async function ensureGame(userId: string) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("game")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const start = new Date().toISOString().slice(0, 10);
  const baseTarget = addMonths(start, 36);

  const { data: created, error } = await supabase
    .from("game")
    .insert({
      user_id: userId,
      start_date: start,
      base_target: baseTarget,
      bank: SEED_BANK,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (SEED_DEBTS.length) {
    await supabase
      .from("debts")
      .insert(SEED_DEBTS.map((d) => ({ ...d, user_id: userId })));
  }

  return created;
}

/** Load the full game state for the signed-in user (RLS scopes to them). */
export async function loadFullState(userId: string): Promise<FullState> {
  const supabase = createClient();
  await ensureGame(userId);

  const [game, transactions, debts, assets, checkIns, judgedDays] =
    await Promise.all([
      supabase.from("game").select("*").eq("user_id", userId).single(),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false }),
      supabase.from("debts").select("*").eq("user_id", userId).order("name"),
      supabase.from("assets").select("*").eq("user_id", userId).order("name"),
      supabase.from("check_ins").select("date").eq("user_id", userId),
      supabase.from("judged_days").select("date").eq("user_id", userId),
    ]);

  return {
    game: game.data!,
    transactions: transactions.data ?? [],
    debts: debts.data ?? [],
    assets: assets.data ?? [],
    checkIns: (checkIns.data ?? []).map((r) => r.date),
    judgedDays: (judgedDays.data ?? []).map((r) => r.date),
  };
}

/** Map raw DB rows to the pure-engine GameState shape. */
export function toEngineState(s: FullState): GameState {
  return {
    game: {
      startDate: s.game.start_date,
      baseTarget: s.game.base_target,
      delayDays: s.game.delay_days,
      bank: Number(s.game.bank),
      dailyGoal: Number(s.game.daily_goal),
      missPenalty: s.game.miss_penalty,
    },
    transactions: s.transactions.map((t) => ({
      date: t.date,
      kind: t.kind,
      amount: Number(t.amount),
      note: t.note,
      luxury: t.luxury,
    })),
    debts: s.debts.map((d) => ({ balance: Number(d.balance), apr: Number(d.apr ?? 0) })),
    assets: s.assets.map((a) => ({ value: Number(a.value), liquid: a.liquid })),
    checkIns: s.checkIns,
    judgedDays: s.judgedDays,
  };
}
