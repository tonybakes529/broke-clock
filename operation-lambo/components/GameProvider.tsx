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

  // Load from localStorage + run the slip engine once, on mount.
  useEffect(() => {
    const loaded = loadState();
    const { daysToJudge, addedDelay } = evaluateSlip(
      loaded.game.startDate,
      todayISO(),
      loaded.checkIns,
      loaded.judgedDays,
      loaded.game.missPenalty,
    );
    const next: LocalState =
      daysToJudge.length === 0
        ? loaded
        : {
            ...loaded,
            game: { ...loaded.game, delayDays: loaded.game.delayDays + addedDelay },
            judgedDays: [...loaded.judgedDays, ...daysToJudge],
          };
    if (daysToJudge.length) saveState(next);
    setState(next);
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
      setState((s) =>
        s
          ? {
              ...s,
              transactions: [
                {
                  id: uid(),
                  date: input.date || today,
                  kind: input.kind,
                  amount: input.amount,
                  note: input.note?.trim() || null,
                  luxury: input.luxury ?? false,
                },
                ...s.transactions,
              ],
            }
          : s,
      );
    },
    deleteTransaction: (id) =>
      setState((s) =>
        s ? { ...s, transactions: s.transactions.filter((t) => t.id !== id) } : s,
      ),
    importTransactions: (rows) =>
      setState((s) =>
        s
          ? {
              ...s,
              transactions: [
                ...rows
                  .filter((r) => r.amount > 0)
                  .map((r) => ({
                    id: uid(),
                    date: r.date,
                    kind: r.kind,
                    amount: r.amount,
                    note: r.note?.trim() || null,
                    luxury: r.luxury ?? false,
                  })),
                ...s.transactions,
              ],
            }
          : s,
      ),
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
