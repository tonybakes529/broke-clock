"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Flag } from "lucide-react";
import { parseISO } from "@/lib/engine";
import { date as fmtDate } from "@/lib/format";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Live ticking countdown to the (slip-adjusted) target date. */
export function Countdown({
  effectiveTarget,
  delayDays,
}: {
  effectiveTarget: string;
  delayDays: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // target = midnight UTC of the target date
  const targetMs = parseISO(effectiveTarget).getTime();
  const diff = targetMs - now;
  const overdue = diff <= 0;
  const abs = Math.abs(diff);

  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);

  const cells: { v: string; label: string }[] = [
    { v: String(days), label: "days" },
    { v: pad(hours), label: "hrs" },
    { v: pad(minutes), label: "min" },
    { v: pad(seconds), label: "sec" },
  ];

  return (
    <div
      className={`panel p-5 ${overdue ? "border-danger/50 bg-danger/[0.06]" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="label flex items-center gap-2">
          <Flag className="h-4 w-4" />
          {overdue ? "Target overdue by" : "Countdown to $3M"}
        </span>
        <span className="text-xs text-white/45">target {fmtDate(effectiveTarget)}</span>
      </div>

      <div className="flex items-stretch gap-2 md:gap-3">
        {cells.map((c, i) => (
          <div key={i} className="flex items-end gap-2 md:gap-3">
            <div className="flex-1 rounded-xl border border-hud-line bg-black/40 px-3 py-3 text-center md:px-5">
              <div
                className={`num text-3xl font-bold tabular-nums md:text-5xl ${
                  overdue ? "text-danger" : "text-cyan"
                }`}
              >
                {c.v}
              </div>
              <div className="label mt-1">{c.label}</div>
            </div>
            {i < cells.length - 1 && (
              <div className="num pb-6 text-2xl text-white/25 md:text-4xl">:</div>
            )}
          </div>
        ))}
      </div>

      {delayDays > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          {delayDays} day{delayDays === 1 ? "" : "s"} already lost to missed missions.
        </div>
      )}
    </div>
  );
}
