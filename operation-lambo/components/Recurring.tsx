"use client";

import { useState } from "react";
import { Repeat, Plus, Trash2, Power, Diamond, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useGame } from "./GameProvider";
import { money, date as fmtDate } from "@/lib/format";
import { todayISO, type Kind } from "@/lib/engine";
import { nextOccurrence, type Cadence } from "@/lib/recurring";

const KINDS: { value: Kind; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "spend", label: "Expense" },
  { value: "debt", label: "Debt payment" },
  { value: "asset", label: "Asset buy" },
];

/** Recurring weekly/monthly entries that auto-post on every load. */
export function Recurring() {
  const { state, upsertRecur, toggleRecur, deleteRecur, today } = useGame();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("income");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [luxury, setLuxury] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!name.trim()) return setError("Give it a name");
    if (!(amt > 0)) return setError("Amount must be greater than 0");
    upsertRecur({ name: name.trim(), kind, amount: amt, cadence, startDate, luxury });
    setName("");
    setAmount("");
    setLuxury(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="panel space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-cyan" />
          <h2 className="num text-lg font-semibold tracking-wide">RECURRING</h2>
        </div>
        <p className="text-xs text-white/45">
          Set up retainers, payroll, rent, subscriptions — anything on a weekly or
          monthly cycle. They auto-post to your bank every time you open the app.
          (They update your numbers but don&apos;t complete the daily mission for you.)
        </p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Acme retainer)"
            className="field col-span-2 md:col-span-1"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="field">
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="field num"
          />
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            className="field"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field"
            title="First charge / anchor date"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={luxury}
              onChange={(e) => setLuxury(e.target.checked)}
              disabled={kind !== "spend"}
            />
            <Diamond className="h-4 w-4 text-gold" /> Luxury
          </label>
          <button type="submit" className="btn-go">
            <Plus className="mr-1 inline h-4 w-4" /> Add recurring
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <div className="panel p-5">
        <h2 className="num mb-3 text-lg font-semibold tracking-wide">ACTIVE RULES</h2>
        {state.recurring.length === 0 ? (
          <p className="text-sm text-white/45">
            No recurring items yet. Add your retainers and fixed costs above.
          </p>
        ) : (
          <ul className="divide-y divide-hud-line/60">
            {state.recurring.map((r) => {
              const next = nextOccurrence(r, today);
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  {r.kind === "income" ? (
                    <ArrowUpCircle className="h-5 w-5 shrink-0 text-accent" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      {r.name}
                      {r.luxury && (
                        <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] uppercase text-gold">
                          luxury
                        </span>
                      )}
                      {!r.active && (
                        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/50">
                          paused
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40">
                      {r.cadence} · {r.kind}
                      {r.active && next ? ` · next ${fmtDate(next)}` : ""}
                    </div>
                  </div>
                  <div
                    className={`num text-sm ${r.kind === "income" ? "text-accent" : "text-danger"}`}
                  >
                    {r.kind === "income" ? "+" : "−"}
                    {money(r.amount, { cents: true })}
                  </div>
                  <button
                    onClick={() => toggleRecur(r.id)}
                    className={`hover:text-cyan ${r.active ? "text-accent" : "text-white/30"}`}
                    aria-label={r.active ? "pause" : "resume"}
                    title={r.active ? "Pause" : "Resume"}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteRecur(r.id)}
                    className="text-white/30 hover:text-danger"
                    aria-label="delete recurring"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
