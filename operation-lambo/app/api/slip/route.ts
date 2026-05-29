import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runSlipForUser, runSlipForAll } from "@/lib/slip";
import type { GameRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/slip
 *  - Vercel cron (Authorization: Bearer $CRON_SECRET) → evaluate ALL users
 *    with the service-role client.
 *  - Authenticated browser request → evaluate just the signed-in user.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth === `Bearer ${secret}`) {
    const service = createServiceClient();
    const result = await runSlipForAll(service);
    return NextResponse.json({ ok: true, scope: "all", ...result });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: game } = await supabase
    .from("game")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!game) return NextResponse.json({ ok: true, scope: "user", added: 0, judged: 0 });

  const result = await runSlipForUser(supabase, game as GameRow);
  return NextResponse.json({ ok: true, scope: "user", ...result });
}

// Allow POST too (some cron setups POST).
export const POST = GET;
