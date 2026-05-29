import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadFullState, toEngineState } from "@/lib/data";
import { runSlipForUser } from "@/lib/slip";
import { derive, todayISO } from "@/lib/engine";
import { GameShell } from "@/components/GameShell";
import type { GameRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Run the slip engine on load (the teeth), then read fresh state.
  const { data: existingGame } = await supabase
    .from("game")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingGame) await runSlipForUser(supabase, existingGame as GameRow);

  const state = await loadFullState(user.id);
  const today = todayISO();
  const derived = derive(toEngineState(state), today);

  return (
    <GameShell
      state={state}
      derived={derived}
      today={today}
      email={user.email ?? null}
    />
  );
}
