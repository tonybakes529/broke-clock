"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Landmark, CreditCard, Loader2 } from "lucide-react";
import type { AssetRow, DebtRow } from "@/lib/types";
import { money } from "@/lib/format";
import { useGame } from "./GameProvider";

/** Assets + debts editor. */
export function Sheet({
  assets,
  debts,
}: {
  assets: AssetRow[];
  debts: DebtRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DebtsCard debts={debts} />
      <AssetsCard assets={assets} />
    </div>
  );
}

function DebtsCard({ debts }: { debts: DebtRow[] }) {
  const { upsertDebt, deleteDebt } = useGame();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const total = debts.reduce((s, d) => s + Number(d.balance), 0);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const bal = parseFloat(balance);
    if (!name.trim() || isNaN(bal)) return;
    startTransition(() => {
      upsertDebt({ name: name.trim(), balance: bal });
      setName("");
      setBalance("");
    });
  }

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="num flex items-center gap-2 text-lg font-semibold tracking-wide">
          <CreditCard className="h-5 w-5 text-danger" /> DEBTS
        </h2>
        <span className="num text-sm text-danger">{money(total)}</span>
      </div>

      <ul className="mb-3 divide-y divide-hud-line/60">
        {debts.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2">
            <span className="flex-1 truncate text-sm">{d.name}</span>
            <span className="num text-sm text-danger">{money(Number(d.balance))}</span>
            <button
              onClick={() => startTransition(() => deleteDebt(d.id))}
              className="text-white/30 hover:text-danger"
              aria-label="delete debt"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {debts.length === 0 && (
          <li className="py-2 text-sm text-accent">Debt-free. 🔥</li>
        )}
      </ul>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lender"
          className="field flex-1"
        />
        <input
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Balance"
          className="field num w-28"
        />
        <button disabled={pending} className="btn">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function AssetsCard({ assets }: { assets: AssetRow[] }) {
  const { upsertAsset, deleteAsset } = useGame();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [liquid, setLiquid] = useState(true);
  const total = assets.reduce((s, a) => s + Number(a.value), 0);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(value);
    if (!name.trim() || isNaN(val)) return;
    startTransition(() => {
      upsertAsset({ name: name.trim(), value: val, liquid });
      setName("");
      setValue("");
      setLiquid(true);
    });
  }

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="num flex items-center gap-2 text-lg font-semibold tracking-wide">
          <Landmark className="h-5 w-5 text-accent" /> ASSETS
        </h2>
        <span className="num text-sm text-accent">{money(total)}</span>
      </div>

      <ul className="mb-3 divide-y divide-hud-line/60">
        {assets.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2">
            <span className="flex-1 truncate text-sm">
              {a.name}
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase ${
                  a.liquid ? "bg-cyan/15 text-cyan" : "bg-white/10 text-white/50"
                }`}
              >
                {a.liquid ? "liquid" : "illiquid"}
              </span>
            </span>
            <span className="num text-sm text-accent">{money(Number(a.value))}</span>
            <button
              onClick={() => startTransition(() => deleteAsset(a.id))}
              className="text-white/30 hover:text-danger"
              aria-label="delete asset"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {assets.length === 0 && (
          <li className="py-2 text-sm text-white/45">No assets yet.</li>
        )}
      </ul>

      <form onSubmit={add} className="space-y-2">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Asset"
            className="field flex-1"
          />
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            className="field num w-28"
          />
          <button disabled={pending} className="btn">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={liquid}
            onChange={(e) => setLiquid(e.target.checked)}
          />
          Liquid / investable (counts toward the $3M unlock)
        </label>
      </form>
    </div>
  );
}
