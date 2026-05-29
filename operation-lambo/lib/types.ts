import type { Kind } from "./engine";

// Raw DB row shapes (snake_case, as stored in Supabase).

export interface GameRow {
  user_id: string;
  start_date: string;
  base_target: string;
  delay_days: number;
  bank: number;
  daily_goal: number;
  miss_penalty: number;
  created_at?: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  date: string;
  kind: Kind;
  amount: number;
  note: string | null;
  luxury: boolean;
  created_at?: string;
}

export interface DebtRow {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  apr: number | null;
}

export interface AssetRow {
  id: string;
  user_id: string;
  name: string;
  value: number;
  liquid: boolean;
}

/** Everything the game screen needs, fetched in one shot. */
export interface FullState {
  game: GameRow;
  transactions: TransactionRow[];
  debts: DebtRow[];
  assets: AssetRow[];
  checkIns: string[];
  judgedDays: string[];
}
