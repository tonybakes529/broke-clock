// UI row types — re-exported from the local store so components have stable
// names to import. (No backend; these are the in-browser shapes.)
export type { LTx as TransactionRow, LDebt as DebtRow, LAsset as AssetRow } from "./store";
