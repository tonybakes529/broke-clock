"use client";

import { Activity, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { useGame } from "./GameProvider";
import { money, perDay, date as fmtDate } from "@/lib/format";
import { nextOccurrence } from "@/lib/recurring";

type Tone = "good" | "warn" | "bad" | "info";

const TONE: Record<Tone, string> = {
  good: "text-accent",
  warn: "text-gold",
  bad: "text-danger",
  info: "text-cyan",
};

/** Plain-English read on the current state of the game. */
export function Status() {
  const { state, derived, today } = useGame();
  const m = derived.mission;
  const doneToday = state.checkIns.includes(today);
  const penalty = state.game.missPenalty;
  const dailyGoal = state.game.dailyGoal;

  const lines: { tone: Tone; text: string }[] = [];

  // headline position
  if (derived.won) {
    lines.push({ tone: "good", text: "You hit $3M. Game won — buy the car in cash." });
  } else if (derived.investable < 0) {
    lines.push({
      tone: "bad",
      text: `You're ${money(derived.investable)} in the hole — debt outweighs liquid cash. Killing debt is the fastest way out.`,
    });
  } else {
    lines.push({
      tone: "info",
      text: `${money(derived.investable)} investable — ${Math.round(derived.progress * 100)}% of the way to $3M.`,
    });
  }

  // today's mission
  if (doneToday) {
    lines.push({ tone: "good", text: "Today's mission is complete — streak is safe." });
  } else if (m.complete) {
    lines.push({
      tone: "warn",
      text: 'All three checks pass — hit "Complete Mission" to lock today in.',
    });
  } else {
    const missing: string[] = [];
    if (!m.hasIncome) missing.push("log income");
    if (!m.goalMet)
      missing.push(`net ${money(dailyGoal)} (you're at ${money(m.netToday)})`);
    if (!m.noLuxury) missing.push("clear the luxury spend");
    lines.push({
      tone: "bad",
      text: `Today's mission needs: ${missing.join(", ")}. Miss it and the target slips +${penalty} days.`,
    });
  }

  // debt → level 1
  if (derived.totalDebt > 0) {
    lines.push({
      tone: "warn",
      text: `Kill ${money(derived.totalDebt)} of debt to clear Level 1 (Stop the Bleeding).`,
    });
  }

  // pace
  if (derived.velocity > 0) {
    const ok = derived.paceETA && derived.paceETA <= derived.effectiveTarget;
    lines.push({
      tone: ok ? "good" : "warn",
      text: `Real pace ${perDay(derived.velocity)} vs ${perDay(derived.reqPace)} needed — ${ok ? "ahead of schedule" : "push harder to beat the date"}.`,
    });
  } else {
    lines.push({
      tone: "info",
      text: `You need ${perDay(derived.reqPace)} to hit the target. Log income to start building velocity.`,
    });
  }

  // recurring summary
  const active = state.recurring.filter((r) => r.active);
  if (active.length) {
    const next = active
      .map((r) => nextOccurrence(r, today))
      .filter((d): d is string => !!d)
      .sort()[0];
    lines.push({
      tone: "info",
      text: `${active.length} recurring item${active.length === 1 ? "" : "s"} auto-posting${next ? ` — next on ${fmtDate(next)}` : ""}.`,
    });
  }

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-5 w-5 text-cyan" />
        <h2 className="num text-lg font-semibold tracking-wide">WHAT&apos;S HAPPENING</h2>
      </div>
      <ul className="space-y-2.5">
        {lines.map((l, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Icon tone={l.tone} />
            <span className="text-white/80">{l.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Icon({ tone }: { tone: Tone }) {
  const cls = `mt-0.5 h-4 w-4 shrink-0 ${TONE[tone]}`;
  if (tone === "good") return <CheckCircle2 className={cls} />;
  if (tone === "bad") return <AlertTriangle className={cls} />;
  if (tone === "warn") return <AlertTriangle className={cls} />;
  return <TrendingUp className={cls} />;
}
