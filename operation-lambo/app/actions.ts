"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO, type Kind } from "@/lib/engine";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function addTransaction(input: {
  date?: string;
  kind: Kind;
  amount: number;
  note?: string;
  luxury?: boolean;
}) {
  const { supabase, userId } = await requireUser();
  if (!(input.amount > 0)) throw new Error("Amount must be greater than 0");
  // Guardrail: no money leaves without a job.
  if (input.kind !== "income" && !input.note?.trim()) {
    throw new Error("Every spend needs a note — no money leaves without a job.");
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    date: input.date || todayISO(),
    kind: input.kind,
    amount: input.amount,
    note: input.note?.trim() || null,
    luxury: input.luxury ?? false,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
}

/** Bulk insert from CSV import (Bank tab). */
export async function importTransactions(
  rows: { date: string; kind: Kind; amount: number; note?: string; luxury?: boolean }[],
) {
  const { supabase, userId } = await requireUser();
  const clean = rows
    .filter((r) => r.amount > 0)
    .map((r) => ({
      user_id: userId,
      date: r.date,
      kind: r.kind,
      amount: r.amount,
      note: r.note?.trim() || null,
      luxury: r.luxury ?? false,
    }));
  if (!clean.length) return;
  const { error } = await supabase.from("transactions").insert(clean);
  if (error) throw error;
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------

export async function upsertDebt(input: {
  id?: string;
  name: string;
  balance: number;
  apr?: number;
}) {
  const { supabase, userId } = await requireUser();
  const payload = {
    user_id: userId,
    name: input.name,
    balance: input.balance,
    apr: input.apr ?? 0,
  };
  const { error } = input.id
    ? await supabase.from("debts").update(payload).eq("id", input.id).eq("user_id", userId)
    : await supabase.from("debts").insert(payload);
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteDebt(id: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export async function upsertAsset(input: {
  id?: string;
  name: string;
  value: number;
  liquid: boolean;
}) {
  const { supabase, userId } = await requireUser();
  const payload = {
    user_id: userId,
    name: input.name,
    value: input.value,
    liquid: input.liquid,
  };
  const { error } = input.id
    ? await supabase.from("assets").update(payload).eq("id", input.id).eq("user_id", userId)
    : await supabase.from("assets").insert(payload);
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteAsset(id: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Game settings + bank
// ---------------------------------------------------------------------------

export async function updateGame(input: {
  bank?: number;
  dailyGoal?: number;
  missPenalty?: number;
}) {
  const { supabase, userId } = await requireUser();
  const patch: Record<string, number> = {};
  if (input.bank !== undefined) patch.bank = input.bank;
  if (input.dailyGoal !== undefined) patch.daily_goal = input.dailyGoal;
  if (input.missPenalty !== undefined) patch.miss_penalty = input.missPenalty;
  if (!Object.keys(patch).length) return;
  const { error } = await supabase.from("game").update(patch).eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Mission check-in
// ---------------------------------------------------------------------------

export async function completeMission() {
  const { supabase, userId } = await requireUser();
  const date = todayISO();
  const { error } = await supabase
    .from("check_ins")
    .upsert({ user_id: userId, date }, { onConflict: "user_id,date" });
  if (error) throw error;
  revalidatePath("/");
}
