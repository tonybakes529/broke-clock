"use client";

import { useState, useTransition } from "react";
import { Check, X, Target, Loader2 } from "lucide-react";
import type { MissionStatus } from "@/lib/engine";
import { money } from "@/lib/format";
import { completeMission } from "@/app/actions";

function Line({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          ok ? "bg-accent/15 text-accent" : "bg-danger/10 text-danger"
        }`}
      >
        {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
      <span className={ok ? "text-white/85" : "text-white/55"}>{children}</span>
    </li>
  );
}

/** Today's mission checklist + "Complete Mission". */
export function Mission({
  status,
  dailyGoal,
  alreadyCompleted,
}: {
  status: MissionStatus;
  dailyGoal: number;
  alreadyCompleted: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onComplete() {
    setError(null);
    startTransition(async () => {
      try {
        await completeMission();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const done = alreadyCompleted;

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-accent" />
        <h2 className="num text-lg font-semibold tracking-wide">
          TODAY&apos;S MISSION
        </h2>
      </div>

      <ul className="divide-y divide-hud-line/60">
        <Line ok={status.hasIncome}>Log at least one income today</Line>
        <Line ok={status.goalMet}>
          Net bank change ≥ {money(dailyGoal)}{" "}
          <span className="text-white/40">
            (today: {money(status.netToday, { cents: true })})
          </span>
        </Line>
        <Line ok={status.noLuxury}>Zero luxury-flagged spend today</Line>
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onComplete}
          disabled={!status.complete || done || pending}
          className="btn-go"
        >
          {pending && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          {done ? "Mission complete ✓" : "Complete Mission"}
        </button>
        {!status.complete && !done && (
          <span className="text-xs text-white/45">
            Clear all three to lock today in.
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
