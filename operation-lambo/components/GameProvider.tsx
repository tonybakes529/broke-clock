"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  derive,
  evaluateSlip,
  signed,
  todayISO,
  type Derived,
  type Kind,
} from "@/lib/engine";
import {
  clearState,
  defaultState,
  loadState,
  saveState,
  toEngineState,
  uid,
  type LocalState,
} from "@/lib/store";
import { dueOccurrences, type Cadence, type RecurRule } from "@/lib/recurring";

interface GameContextValue {
  state: LocalState;
  derived: Derived;
  today: string;
  // transactions
  addTransaction: (input: {
    date?: string;
    kind: Kind;
    amount: number;
    note?: string;
    luxury?: boolean;
  }) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (
    rows: { date: string; kind: Kind; amount: number; note?: string; luxury?: boolean }[],
  ) => void;
  // debts
  upsertDebt: (input: { id?: string; name: string; balance: number; apr?: number }) => void;
  deleteDebt: (id: string) => void;
  // assets
  upsertAsset: (input: { id?: string; name: string; value: number; liquid: boolean }) => void;
  deleteAsset: (id: string) => void;
  // recurring
  upsertRecur: (input: {
    id?: string;
    name: string;
    kind: Kind;
    amount: number;
    cadence: Cadence;
    startDate: string;
    luxury?: boolean;
  }) => void;
  toggleRecur: (id: string) => void;
  deleteRecur: (id: string) => void;
  // game
  updateGame: (input: { bank?: number; dailyGoal?: number; missPenalty?: number }) => void;
  completeMission: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocalState | null>(null);
  const today = todayISO();

  // Load from localStorage, then on mount: (1) auto-post any due recurring
  // entries, (2) run the slip engine. Both "catch up" since the last open.
  useEffect(() => {
    const loaded = loadState();
    const now = todayISO();
    let changed = false;
    let working = loaded;

    // (1) recurring: materialize every due occurrence as a transaction
    const newTxs: LocalState["transactions"] = [];
    const updatedRules = loaded.recurring.map((rule) => {
      const due = dueOccurrences(rule, now);
      if (!due.length) return rule;
      changed = true;
      for (const date of due) {
        newTxs.push({
          id: uid(),
          date,
          kind: rule.kind,
          amount: rule.amount,
          note: `${rule.name} (recurring)`,
          luxury: rule.luxury,
          recurring: true,
        });
      }
      return { ...rule, lastPosted: due[due.length - 1] };
    });
    if (newTxs.length) {
      const bankDelta = newTxs.reduce((sum, t) => sum + signed(t), 0);
      working = {
        ...working,
        game: { ...working.game, bank: working.game.bank + bankDelta },
        transactions: [...newTxs, ...working.transactions],
        recurring: updatedRules,
      };
    }

    // (2) slip engine
    const { daysToJudge, addedDelay } = evaluateSlip(
      working.game.startDate,
      now,
      working.checkIns,
      working.judgedDays,
      working.game.missPenalty,
    );
    if (daysToJudge.length) {
      changed = true;
      working = {
        ...working,
        game: { ...working.game, delayDays: working.game.delayDays + addedDelay },
        judgedDays: [...working.judgedDays, ...daysToJudge],
      };
    }

    if (changed) saveState(working);
    setState(working);
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const derived = useMemo(
    () => (state ? derive(toEngineState(state), today) : null),
    [state, today],
  );

  if (!state || !derived) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="num animate-pulse text-accent">LOADING…</div>
      </main>
    );
  }

  const value: GameContextValue = {
    state,
    derived,
    today,
    addTransaction: (input) => {
      if (!(input.amount > 0)) throw new Error("Amount must be greater than 0");
      if (input.kind !== "income" && !input.note?.trim()) {
        throw new Error("Every spend needs a note — no money leaves without a job.");
      }
      setState((s) => {
        if (!s) return s;
        const tx = {
          id: uid(),
          date: input.date || today,
          kind: input.kind,
          amount: input.amount,
          note: input.note?.trim() || null,
          luxury: input.luxury ?? false,
        };
        return {
          ...s,
          game: { ...s.game, bank: s.game.bank + signed(tx) },
          transactions: [tx, ...s.transactions],
        };
      });
    },
    deleteTransaction: (id) =>
      setState((s) => {
        if (!s) return s;
        const tx = s.transactions.find((t) => t.id === id);
        if (!tx) return s;
        return {
          ...s,
          game: { ...s.game, bank: s.game.bank - signed(tx) },
          transactions: s.transactions.filter((t) => t.id !== id),
        };
      }),
    importTransactions: (rows) =>
      setState((s) => {
        if (!s) return s;
        const txs = rows
          .filter((r) => r.amount > 0)
          .map((r) => ({
            id: uid(),
            date: r.date,
            kind: r.kind,
            amount: r.amount,
            note: r.note?.trim() || null,
            luxury: r.luxury ?? false,
          }));
        const bankDelta = txs.reduce((sum, t) => sum + signed(t), 0);
        return {
          ...s,
          game: { ...s.game, bank: s.game.bank + bankDelta },
          transactions: [...txs, ...s.transactions],
        };
      }),
    upsertDebt: (input) =>
      setState((s) => {
        if (!s) return s;
        if (input.id) {
          return {
            ...s,
            debts: s.debts.map((d) =>
              d.id === input.id
                ? { ...d, name: input.name, balance: input.balance, apr: input.apr ?? d.apr }
                : d,
            ),
          };
        }
        return {
          ...s,
          debts: [
            ...s.debts,
            { id: uid(), name: input.name, balance: input.balance, apr: input.apr ?? 0 },
          ],
        };
      }),
    deleteDebt: (id) =>
      setState((s) => (s ? { ...s, debts: s.debts.filter((d) => d.id !== id) } : s)),
    upsertAsset: (input) =>
      setState((s) => {
        if (!s) return s;
        if (input.id) {
          return {
            ...s,
            assets: s.assets.map((a) =>
              a.id === input.id
                ? { ...a, name: input.name, value: input.value, liquid: input.liquid }
                : a,
            ),
          };
        }
        return {
          ...s,
          assets: [
            ...s.assets,
            { id: uid(), name: input.name, value: input.value, liquid: input.liquid },
          ],
        };
      }),
    deleteAsset: (id) =>
      setState((s) => (s ? { ...s, assets: s.assets.filter((a) => a.id !== id) } : s)),
    upsertRecur: (input) =>
      setState((s) => {
        if (!s) return s;
        if (input.id) {
          return {
            ...s,
            recurring: s.recurring.map((r) =>
              r.id === input.id
                ? {
                    ...r,
                    name: input.name,
                    kind: input.kind,
                    amount: input.amount,
                    cadence: input.cadence,
                    startDate: input.startDate,
                    luxury: input.luxury ?? false,
                  }
                : r,
            ),
          };
        }
        const rule: RecurRule = {
          id: uid(),
          name: input.name,
          kind: input.kind,
          amount: input.amount,
          cadence: input.cadence,
          startDate: input.startDate,
          luxury: input.luxury ?? false,
          active: true,
          lastPosted: null,
        };
        // Back-post any occurrences already due as of today, so the numbers
        // are correct the moment the rule is created.
        const due = dueOccurrences(rule, today);
        const posted = due.map((date) => ({
          id: uid(),
          date,
          kind: rule.kind,
          amount: rule.amount,
          note: `${rule.name} (recurring)`,
          luxury: rule.luxury,
          recurring: true,
        }));
        const bankDelta = posted.reduce((sum, t) => sum + signed(t), 0);
        return {
          ...s,
          game: { ...s.game, bank: s.game.bank + bankDelta },
          transactions: [...posted, ...s.transactions],
          recurring: [
            ...s.recurring,
            { ...rule, lastPosted: due.length ? due[due.length - 1] : null },
          ],
        };
      }),
    toggleRecur: (id) =>
      setState((s) =>
        s
          ? {
              ...s,
              recurring: s.recurring.map((r) =>
                r.id === id ? { ...r, active: !r.active } : r,
              ),
            }
          : s,
      ),
    deleteRecur: (id) =>
      setState((s) =>
        s ? { ...s, recurring: s.recurring.filter((r) => r.id !== id) } : s,
      ),
    updateGame: (input) =>
      setState((s) =>
        s
          ? {
              ...s,
              game: {
                ...s.game,
                bank: input.bank ?? s.game.bank,
                dailyGoal: input.dailyGoal ?? s.game.dailyGoal,
                missPenalty: input.missPenalty ?? s.game.missPenalty,
              },
            }
          : s,
      ),
    completeMission: () =>
      setState((s) =>
        s && !s.checkIns.includes(today)
          ? { ...s, checkIns: [...s.checkIns, today] }
          : s,
      ),
    resetGame: () => {
      clearState();
      setState(defaultState());
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
