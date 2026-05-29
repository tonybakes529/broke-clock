import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateSlip, todayISO } from "./engine";
import type { GameRow } from "./types";

/**
 * Run the slip engine for a single user against the given client.
 * Pure math lives in engine.evaluateSlip; this just loads the inputs,
 * persists the judged days, and bumps delay_days. Idempotent: already-judged
 * days are never re-penalized.
 */
export async function runSlipForUser(
  supabase: SupabaseClient,
  game: GameRow,
): Promise<{ added: number; judged: number }> {
  const today = todayISO();
  const userId = game.user_id;

  const [checkIns, judgedDays] = await Promise.all([
    supabase.from("check_ins").select("date").eq("user_id", userId),
    supabase.from("judged_days").select("date").eq("user_id", userId),
  ]);

  const { daysToJudge, addedDelay } = evaluateSlip(
    game.start_date,
    today,
    (checkIns.data ?? []).map((r) => r.date),
    (judgedDays.data ?? []).map((r) => r.date),
    game.miss_penalty,
  );

  if (!daysToJudge.length) return { added: 0, judged: 0 };

  await supabase
    .from("judged_days")
    .upsert(
      daysToJudge.map((date) => ({ user_id: userId, date })),
      { onConflict: "user_id,date" },
    );

  await supabase
    .from("game")
    .update({ delay_days: game.delay_days + addedDelay })
    .eq("user_id", userId);

  return { added: addedDelay, judged: daysToJudge.length };
}

/** Cron path: evaluate every user with the service-role client. */
export async function runSlipForAll(
  supabase: SupabaseClient,
): Promise<{ users: number; totalDelay: number }> {
  const { data: games } = await supabase.from("game").select("*");
  let totalDelay = 0;
  for (const game of games ?? []) {
    const { added } = await runSlipForUser(supabase, game as GameRow);
    totalDelay += added;
  }
  return { users: games?.length ?? 0, totalDelay };
}
