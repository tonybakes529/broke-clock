import { Check, Lock, Trophy } from "lucide-react";
import type { Level } from "@/lib/engine";

const HINTS: Record<number, string> = {
  1: "Bank ≥ $10K and zero debt. Debt gets killed, not managed.",
  2: "$30K income in the trailing 30 days.",
  3: "$100K income in the trailing 30 days.",
  4: "Own at least one asset. You buy assets, not dopamine.",
  5: "$3M investable. Buy the car in cash — no wound.",
};

/** The 5 levels + the trophy. */
export function MapView({ levels }: { levels: Level[] }) {
  return (
    <div className="panel p-5">
      <h2 className="num mb-4 text-lg font-semibold tracking-wide">THE MAP</h2>
      <ol className="space-y-3">
        {levels.map((lvl, i) => {
          const prevCleared = i === 0 || levels[i - 1].cleared;
          const isFinal = lvl.num === 5;
          return (
            <li
              key={lvl.num}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                lvl.cleared
                  ? "border-accent/40 bg-accent/[0.06]"
                  : prevCleared
                    ? "border-cyan/30 bg-cyan/[0.04]"
                    : "border-hud-line bg-white/[0.02]"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  lvl.cleared
                    ? "bg-accent/20 text-accent"
                    : prevCleared
                      ? "bg-cyan/15 text-cyan"
                      : "bg-white/5 text-white/40"
                }`}
              >
                {lvl.cleared ? (
                  <Check className="h-5 w-5" />
                ) : isFinal ? (
                  <Trophy className="h-5 w-5" />
                ) : prevCleared ? (
                  <span className="num text-sm">{lvl.num}</span>
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div>
                <div
                  className={`num font-semibold tracking-wide ${
                    lvl.cleared ? "text-accent" : "text-white/85"
                  }`}
                >
                  {lvl.num}. {lvl.name}
                </div>
                <div className="text-sm text-white/45">{HINTS[lvl.num]}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
