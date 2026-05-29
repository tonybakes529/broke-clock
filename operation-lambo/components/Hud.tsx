import { Wallet, TrendingUp, Coins, Flame } from "lucide-react";
import { money } from "@/lib/format";

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <div className={`rounded-lg bg-white/[0.03] p-2 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className={`num truncate text-xl font-semibold ${accent}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/** Bank / Net Worth / Investable / Streak. */
export function Hud({
  bank,
  netWorth,
  investable,
  streak,
}: {
  bank: number;
  netWorth: number;
  investable: number;
  streak: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Bank"
        value={money(bank, { cents: true })}
        accent="text-cyan"
        icon={<Wallet className="h-5 w-5" />}
      />
      <Stat
        label="Net Worth"
        value={money(netWorth)}
        accent={netWorth >= 0 ? "text-accent" : "text-danger"}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <Stat
        label="Investable"
        value={money(investable)}
        accent={investable >= 0 ? "text-gold" : "text-danger"}
        icon={<Coins className="h-5 w-5" />}
      />
      <Stat
        label="Streak"
        value={`${streak} ${streak === 1 ? "day" : "days"}`}
        accent={streak > 0 ? "text-accent" : "text-white/50"}
        icon={<Flame className="h-5 w-5" />}
      />
    </div>
  );
}
