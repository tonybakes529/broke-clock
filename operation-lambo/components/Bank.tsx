"use client";

import { useRef, useState, useTransition } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  Upload,
  Diamond,
  Loader2,
} from "lucide-react";
import type { Kind } from "@/lib/engine";
import type { TransactionRow } from "@/lib/types";
import { money, date as fmtDate } from "@/lib/format";
import { todayISO } from "@/lib/engine";
import { parseCsv, type ParsedRow } from "@/lib/csv";
import { useGame } from "./GameProvider";

const KINDS: { value: Kind; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "spend", label: "Spend" },
  { value: "debt", label: "Debt payment" },
  { value: "asset", label: "Asset buy" },
];

export function Bank({ transactions }: { transactions: TransactionRow[] }) {
  const { addTransaction, deleteTransaction } = useGame();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<Kind>("income");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [luxury, setLuxury] = useState(false);
  const [date, setDate] = useState(todayISO());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!(amt > 0)) return setError("Amount must be greater than 0");
    startTransition(() => {
      try {
        addTransaction({ kind, amount: amt, note, luxury, date });
        setAmount("");
        setNote("");
        setLuxury(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* logger */}
      <form onSubmit={submit} className="panel space-y-3 p-5">
        <h2 className="num text-lg font-semibold tracking-wide">LOG MONEY</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="field"
          >
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={kind === "income" ? "Source (optional)" : "Note (required)"}
            className="field col-span-2 md:col-span-1"
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
            <Diamond className="h-4 w-4 text-gold" /> Luxury (breaks streak, slips date)
          </label>
          <button type="submit" disabled={pending} className="btn-go">
            {pending && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            Add
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <CsvImport />

      {/* ledger */}
      <div className="panel p-5">
        <h2 className="num mb-3 text-lg font-semibold tracking-wide">LEDGER</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-white/45">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-hud-line/60">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                {t.kind === "income" ? (
                  <ArrowUpCircle className="h-5 w-5 shrink-0 text-accent" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 shrink-0 text-danger" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {t.note || <span className="text-white/40">{t.kind}</span>}
                    {t.luxury && (
                      <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] uppercase text-gold">
                        luxury
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">
                    {fmtDate(t.date)} · {t.kind}
                  </div>
                </div>
                <div
                  className={`num text-sm ${t.kind === "income" ? "text-accent" : "text-danger"}`}
                >
                  {t.kind === "income" ? "+" : "−"}
                  {money(Number(t.amount), { cents: true })}
                </div>
                <button
                  onClick={() => startTransition(() => deleteTransaction(t.id))}
                  className="text-white/30 hover:text-danger"
                  aria-label="delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CsvImport() {
  const { importTransactions } = useGame();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRows(parseCsv(String(reader.result)));
    reader.readAsText(file);
  }

  function toggleLuxury(i: number) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, luxury: !r.luxury } : r)));
  }

  function commit() {
    startTransition(() => {
      importTransactions(rows);
      setRows([]);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="num text-lg font-semibold tracking-wide">CSV IMPORT</h2>
        <label className="btn cursor-pointer">
          <Upload className="mr-2 inline h-4 w-4" />
          Choose file
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />
        </label>
      </div>
      <p className="mb-3 text-xs text-white/45">
        Columns: <code>date, description, amount</code>. Negatives → spend,
        positives → income. Tick luxury per row before committing.
      </p>

      {rows.length > 0 && (
        <>
          <div className="max-h-72 overflow-auto rounded-lg border border-hud-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-hud-panel text-left text-white/45">
                <tr>
                  <th className="p-2 font-normal">Date</th>
                  <th className="p-2 font-normal">Description</th>
                  <th className="p-2 font-normal">Kind</th>
                  <th className="p-2 text-right font-normal">Amount</th>
                  <th className="p-2 text-center font-normal">Luxury</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-hud-line/50">
                    <td className="p-2 text-white/60">{r.date}</td>
                    <td className="p-2">{r.note}</td>
                    <td className="p-2 text-white/60">{r.kind}</td>
                    <td className="num p-2 text-right">{money(r.amount, { cents: true })}</td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.luxury}
                        onChange={() => toggleLuxury(i)}
                        disabled={r.kind !== "spend"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={commit} disabled={pending} className="btn-go">
              {pending && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              Import {rows.length} rows
            </button>
            <button onClick={() => setRows([])} className="btn">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
