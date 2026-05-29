import { Trophy, Flag } from "lucide-react";
import { moneyShort } from "@/lib/format";
import { GOAL } from "@/lib/engine";

/** The road: a car positioned by `progress` (0..1) heading to the $3M trophy. */
export function Track({
  progress,
  investable,
  won,
}: {
  progress: number;
  investable: number;
  won: boolean;
}) {
  const pct = Math.round(progress * 100);
  // keep the car visible at the edges
  const left = `calc(${Math.min(Math.max(progress, 0), 1) * 100}% - ${progress > 0.9 ? 44 : 8}px)`;

  return (
    <div className="panel overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">The Track</span>
        <span className="num text-sm text-cyan">{pct}% to $3M</span>
      </div>

      <div className="relative h-28">
        {/* road */}
        <div className="absolute inset-x-0 top-1/2 h-12 -translate-y-1/2 rounded-lg bg-gradient-to-b from-[#0a141d] to-[#060b10] ring-1 ring-hud-line">
          {/* center dashes */}
          <div
            className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#ffd34d55 0 16px,transparent 16px 34px)",
            }}
          />
        </div>

        {/* progress fill */}
        <div
          className="absolute top-1/2 h-12 -translate-y-1/2 rounded-l-lg bg-gradient-to-r from-accent/5 to-accent/25"
          style={{ width: `${pct}%` }}
        />

        {/* finish line / trophy */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-center">
          <Trophy className={`mx-auto h-7 w-7 ${won ? "text-gold" : "text-gold/50"}`} />
          <div className="num mt-1 text-[10px] text-gold/70">
            {moneyShort(GOAL)}
          </div>
        </div>

        {/* the car */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left }}
        >
          <CarGlyph won={won} />
        </div>

        {/* start flag */}
        <div className="absolute left-0 top-1/2 -translate-y-[150%] text-white/30">
          <Flag className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2 text-right num text-sm text-accent">
        {moneyShort(investable)} <span className="text-white/40">invested</span>
      </div>
    </div>
  );
}

function CarGlyph({ won }: { won: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 ${won ? "drop-shadow-[0_0_8px_#ffd34d]" : "drop-shadow-[0_0_8px_#39ff88]"}`}
      aria-label="car"
    >
      <span className="text-2xl leading-none">🏎️</span>
    </div>
  );
}
