"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { TransactionRow } from "@/lib/types";
import { signed } from "@/lib/engine";
import { moneyShort, date as fmtDate } from "@/lib/format";

/**
 * Reconstruct bank-over-time from logged flows, anchored so the final point
 * equals the current bank. Pure presentational estimate of the trajectory.
 */
export function BankChart({
  transactions,
  currentBank,
}: {
  transactions: TransactionRow[];
  currentBank: number;
}) {
  const byDate = new Map<string, number>();
  for (const t of transactions) {
    byDate.set(t.date, (byDate.get(t.date) ?? 0) + signed({ ...t, amount: Number(t.amount) }));
  }
  const dates = Array.from(byDate.keys()).sort();

  // cumulative flows, then shift so the last value lands on currentBank
  let running = 0;
  const cum = dates.map((d) => {
    running += byDate.get(d)!;
    return { date: d, cum: running };
  });
  const totalFlow = running;
  const data = cum.map((p) => ({
    date: p.date,
    bank: currentBank - (totalFlow - p.cum),
  }));

  if (data.length < 2) {
    return (
      <div className="panel p-5">
        <h2 className="num mb-2 text-lg font-semibold tracking-wide">
          BANK OVER TIME
        </h2>
        <p className="text-sm text-white/45">
          Log a few days of transactions to see your trajectory.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <h2 className="num mb-4 text-lg font-semibold tracking-wide">
        BANK OVER TIME
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="bankFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#39ff88" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#39ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1c2b38" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#7d93a1", fontSize: 11 }}
              tickFormatter={(d) => fmtDate(d).replace(/, \d{4}/, "")}
              stroke="#1c2b38"
            />
            <YAxis
              tick={{ fill: "#7d93a1", fontSize: 11 }}
              tickFormatter={(v) => moneyShort(v)}
              stroke="#1c2b38"
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "#0d1620",
                border: "1px solid #1c2b38",
                borderRadius: 12,
                color: "#e7f2f7",
              }}
              labelFormatter={(d) => fmtDate(String(d))}
              formatter={(v: number) => [moneyShort(v), "Bank"]}
            />
            <Area
              type="monotone"
              dataKey="bank"
              stroke="#39ff88"
              strokeWidth={2}
              fill="url(#bankFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
