// MonthlyReview.jsx — the upload + review + totals UI.
// Three internal states:
//   1. idle        → show upload dropzone + month navigator + totals
//   2. mapping     → CSV parsed, show column mapping step (skipped if source is remembered)
//   3. reviewing   → transactions imported, show tagging table (same view as idle when looking at past months)

import { useMemo, useRef, useState } from "react";
import { useReviewStore, monthKeyOf } from "../hooks/useReviewStore";
import {
  parseCSV,
  rowToTransaction,
  hashTransaction,
} from "../utils/csvParser";
import { lookupTag } from "../utils/merchantMatcher";
import { fmtCurrency, fmtCurrencyPrecise } from "../utils/budgetMath";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthKey(key) {
  if (!key) return "—";
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Column Mapping Modal ────────────────────────────────────────────────

function ColumnMapper({ headers, sampleRows, suggestedMapping, onApply, onCancel }) {
  const [mode, setMode] = useState(suggestedMapping?.mode || "single");
  const [sourceName, setSourceName] = useState(suggestedMapping?.sourceName || "");
  const [dateCol, setDateCol] = useState(suggestedMapping?.dateCol ?? -1);
  const [descriptionCol, setDescriptionCol] = useState(suggestedMapping?.descriptionCol ?? -1);
  const [amountCol, setAmountCol] = useState(suggestedMapping?.amountCol ?? -1);
  const [debitCol, setDebitCol] = useState(suggestedMapping?.debitCol ?? -1);
  const [creditCol, setCreditCol] = useState(suggestedMapping?.creditCol ?? -1);
  const [flipSign, setFlipSign] = useState(suggestedMapping?.flipSign || false);

  const colOption = (i) => (
    <option key={i} value={i}>
      Column {i + 1} — {headers[i] || "(no header)"}
    </option>
  );

  const canApply = () => {
    if (!sourceName.trim()) return false;
    if (dateCol < 0 || descriptionCol < 0) return false;
    if (mode === "single") return amountCol >= 0;
    return debitCol >= 0 || creditCol >= 0;
  };

  const apply = () => {
    onApply({
      sourceName: sourceName.trim(),
      mode,
      dateCol: Number(dateCol),
      descriptionCol: Number(descriptionCol),
      amountCol: Number(amountCol),
      debitCol: Number(debitCol),
      creditCol: Number(creditCol),
      flipSign,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-100">Map CSV Columns</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Tell the app which columns are which. We'll remember this for the next upload.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
              Source Name
            </label>
            <input
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              placeholder="e.g. Chase Sapphire, Amex Gold, MidFlorida Checking"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
              Amount Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("single")}
                className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                  mode === "single"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                Single Amount column
                <span className="block text-[10px] text-zinc-500 mt-0.5 normal-case tracking-normal">
                  +/− in one column
                </span>
              </button>
              <button
                onClick={() => setMode("split")}
                className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                  mode === "split"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                Debit / Credit columns
                <span className="block text-[10px] text-zinc-500 mt-0.5 normal-case tracking-normal">
                  separate columns
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
                Date Column
              </label>
              <select
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100"
                value={dateCol}
                onChange={(e) => setDateCol(Number(e.target.value))}
              >
                <option value={-1}>— select —</option>
                {headers.map((_, i) => colOption(i))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
                Description Column
              </label>
              <select
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100"
                value={descriptionCol}
                onChange={(e) => setDescriptionCol(Number(e.target.value))}
              >
                <option value={-1}>— select —</option>
                {headers.map((_, i) => colOption(i))}
              </select>
            </div>
          </div>

          {mode === "single" ? (
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
                Amount Column
              </label>
              <select
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100"
                value={amountCol}
                onChange={(e) => setAmountCol(Number(e.target.value))}
              >
                <option value={-1}>— select —</option>
                {headers.map((_, i) => colOption(i))}
              </select>
              <label className="flex items-center gap-2 mt-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flipSign}
                  onChange={(e) => setFlipSign(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                Flip sign (expenses appear as positive in this file)
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
                  Debit Column
                </label>
                <select
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100"
                  value={debitCol}
                  onChange={(e) => setDebitCol(Number(e.target.value))}
                >
                  <option value={-1}>— none —</option>
                  {headers.map((_, i) => colOption(i))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
                  Credit Column
                </label>
                <select
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100"
                  value={creditCol}
                  onChange={(e) => setCreditCol(Number(e.target.value))}
                >
                  <option value={-1}>— none —</option>
                  {headers.map((_, i) => colOption(i))}
                </select>
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
              Preview (first 3 rows)
            </div>
            <div className="rounded-md border border-zinc-800 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40">
                    {headers.map((h, i) => (
                      <th key={i} className="px-2 py-1.5 text-left text-zinc-500 font-medium whitespace-nowrap">
                        {i + 1}. {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.slice(0, 3).map((r, i) => (
                    <tr key={i} className="border-b border-zinc-900">
                      {r.map((c, j) => (
                        <td key={j} className="px-2 py-1.5 text-zinc-400 whitespace-nowrap max-w-xs truncate">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={!canApply()}
            className="px-4 py-2 rounded-md text-sm bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Import Transactions
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Row (tagging + inline edit) ──────────────────────────────

function TxRow({ tx, knownTags, onTag, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(tx.date);
  const [editAmount, setEditAmount] = useState(String(tx.amount));

  const isIncome = tx.amount > 0;

  const saveEdits = () => {
    const patch = {};
    if (editDate !== tx.date) patch.date = editDate;
    const amt = Number(editAmount);
    if (!isNaN(amt) && amt !== tx.amount) patch.amount = amt;
    if (Object.keys(patch).length) onUpdate(patch);
    setEditing(false);
  };

  const cancelEdits = () => {
    setEditDate(tx.date);
    setEditAmount(String(tx.amount));
    setEditing(false);
  };

  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-900/30 group">
      <td className="px-3 py-2 whitespace-nowrap">
        {editing ? (
          <input
            type="date"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 w-32"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
        ) : (
          <span className="text-xs text-zinc-400 tabular-nums">{tx.date}</span>
        )}
      </td>
      <td className="px-3 py-2 max-w-md">
        <div className="text-sm text-zinc-200 truncate" title={tx.description}>
          {tx.description}
        </div>
        {tx.source && (
          <div className="text-[10px] text-zinc-600 mt-0.5">{tx.source}</div>
        )}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {editing ? (
          <input
            type="number"
            step="0.01"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 w-28 text-right tabular-nums"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
          />
        ) : (
          <span
            className={`text-sm font-medium tabular-nums ${
              isIncome ? "text-emerald-400" : "text-zinc-200"
            }`}
          >
            {isIncome ? "+" : ""}
            {fmtCurrencyPrecise(tx.amount)}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          list={`tags-${tx.id}`}
          className={`w-full bg-zinc-900/60 border rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
            tx.tag ? "border-zinc-700" : "border-amber-500/30"
          }`}
          placeholder="Tag…"
          value={tx.tag || ""}
          onChange={(e) => onTag(e.target.value)}
        />
        <datalist id={`tags-${tx.id}`}>
          {knownTags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={saveEdits}
              className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            >
              Save
            </button>
            <button
              onClick={cancelEdits}
              className="text-[10px] px-2 py-1 rounded text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] text-zinc-500 hover:text-zinc-200"
              title="Edit amount/date"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-[10px] text-zinc-500 hover:text-rose-400"
              title="Delete transaction"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function MonthlyReview() {
  const {
    state,
    importTransactions,
    updateTransaction,
    tagTransaction,
    deleteTransaction,
    saveColumnMapping,
    clearMonth,
    getMonthGroups,
    getMonthTotals,
  } = useReviewStore();

  const [activeScope, setActiveScope] = useState("business");
  const [activeMonth, setActiveMonth] = useState(currentMonthKey());
  const [pendingCSV, setPendingCSV] = useState(null); // { headers, rows, fileName, suggestedMapping }
  const [importStatus, setImportStatus] = useState(null); // "X imported, Y skipped"
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const scopeData = state[activeScope];
  const monthGroups = useMemo(() => getMonthGroups(activeScope), [getMonthGroups, activeScope]);
  const monthKeys = useMemo(
    () => Object.keys(monthGroups).sort((a, b) => b.localeCompare(a)),
    [monthGroups]
  );
  const txsForMonth = monthGroups[activeMonth] || [];
  const totals = useMemo(
    () => getMonthTotals(activeScope, activeMonth),
    [getMonthTotals, activeScope, activeMonth]
  );

  // Tag autocomplete: recent tags + existing unique tags in scope
  const knownTags = useMemo(() => {
    const seen = new Set(scopeData.tagsUsed);
    for (const t of scopeData.transactions) {
      if (t.tag) seen.add(t.tag);
    }
    return Array.from(seen).sort();
  }, [scopeData.tagsUsed, scopeData.transactions]);

  const handleFile = async (file) => {
    setError(null);
    setImportStatus(null);
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setError("Please upload a .csv file. Most banks export CSV from the download button on your statement page.");
      return;
    }

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) {
        setError("That CSV looks empty. Check the file and try again.");
        return;
      }

      // Try to auto-detect a known mapping based on headers
      const suggested = suggestMapping(headers, scopeData.columnMappings);

      setPendingCSV({
        headers,
        rows,
        fileName: file.name,
        suggestedMapping: suggested,
      });
    } catch (err) {
      setError(`Couldn't read that file: ${err.message || err}`);
    }
  };

  const applyMapping = (mapping) => {
    if (!pendingCSV) return;
    const { rows } = pendingCSV;
    const parsed = [];
    let failed = 0;
    for (const row of rows) {
      const tx = rowToTransaction(row, pendingCSV.headers, mapping);
      if (!tx) {
        failed++;
        continue;
      }
      const hash = hashTransaction(tx);
      const suggestedTag = lookupTag(tx.description, scopeData.merchantMemory) || "";
      parsed.push({ ...tx, hash, tag: suggestedTag });
    }

    const { imported, skipped } = importTransactions(activeScope, parsed, mapping.sourceName);
    saveColumnMapping(activeScope, mapping.sourceName, mapping);

    let msg = `${imported} imported, ${skipped} skipped as duplicates`;
    if (failed) msg += `, ${failed} rows couldn't be parsed`;
    setImportStatus(msg);
    setPendingCSV(null);

    // Jump to the month with the most new transactions
    if (imported > 0) {
      const monthCounts = {};
      for (const p of parsed) {
        const k = p.date.slice(0, 7);
        monthCounts[k] = (monthCounts[k] || 0) + 1;
      }
      const topMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
      if (topMonth) setActiveMonth(topMonth[0]);
    }
  };

  const sortedTagTotals = useMemo(
    () => Object.entries(totals.totalsByTag).sort((a, b) => b[1] - a[1]),
    [totals.totalsByTag]
  );

  return (
    <div className="space-y-5">
      {/* Scope selector + upload row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-950/40">
          {[
            { key: "business", label: "Business" },
            { key: "personal", label: "Personal" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveScope(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeScope === t.key
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = ""; // allow re-upload of same file
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-md text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors font-medium"
          >
            Upload CSV
          </button>
        </div>
      </div>

      {/* Status banners */}
      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </div>
      )}
      {importStatus && !error && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          {importStatus}
        </div>
      )}

      {/* Month navigator */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
              Reviewing
            </div>
            <div className="text-lg font-semibold text-zinc-100 mt-0.5">
              {formatMonthKey(activeMonth)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {monthKeys.length > 0 ? (
              monthKeys.map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveMonth(k)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    k === activeMonth
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                      : "border border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {formatMonthKey(k)}
                  <span className="ml-1.5 text-[10px] text-zinc-500">
                    {monthGroups[k].length}
                  </span>
                </button>
              ))
            ) : (
              <span className="text-xs text-zinc-600 italic">
                No months yet — upload a CSV to start
              </span>
            )}
          </div>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Transactions
            </div>
            <div className="text-xl font-semibold text-zinc-100 tabular-nums mt-0.5">
              {totals.txCount}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Income
            </div>
            <div className="text-xl font-semibold text-emerald-400 tabular-nums mt-0.5">
              {fmtCurrency(totals.totalIncome)}
            </div>
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Expenses
            </div>
            <div className="text-xl font-semibold text-rose-400 tabular-nums mt-0.5">
              {fmtCurrency(totals.totalExpenses)}
            </div>
          </div>
          <div
            className={`rounded-lg border px-3 py-2.5 ${
              totals.net >= 0
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-rose-500/20 bg-rose-500/5"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Net
            </div>
            <div
              className={`text-xl font-semibold tabular-nums mt-0.5 ${
                totals.net >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {totals.net >= 0 ? "+" : ""}
              {fmtCurrency(totals.net)}
            </div>
          </div>
        </div>

        {totals.untagged > 0 && (
          <div className="mt-3 text-xs text-amber-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {totals.untagged} transaction{totals.untagged === 1 ? "" : "s"} still untagged
          </div>
        )}
      </div>

      {/* Tag totals panel */}
      {sortedTagTotals.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              By Tag
            </h3>
            <span className="text-[10px] text-zinc-600">
              {sortedTagTotals.length} tag{sortedTagTotals.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="divide-y divide-zinc-900">
            {sortedTagTotals.map(([tag, amount]) => {
              const maxAmount = sortedTagTotals[0][1];
              const pct = maxAmount ? (amount / maxAmount) * 100 : 0;
              const isUntagged = tag === "Untagged";
              return (
                <div key={tag} className="px-5 py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isUntagged ? "text-amber-400" : "text-zinc-200"
                        }`}
                      >
                        {tag}
                      </span>
                      <span className="text-sm tabular-nums text-zinc-300">
                        {fmtCurrency(amount)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className={`h-full ${
                          isUntagged ? "bg-amber-500/50" : "bg-emerald-500/50"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions table */}
      {txsForMonth.length > 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Transactions — {formatMonthKey(activeMonth)}
            </h3>
            <button
              onClick={() => {
                if (confirm(`Delete all ${txsForMonth.length} transactions for ${formatMonthKey(activeMonth)}? This can't be undone.`)) {
                  clearMonth(activeScope, activeMonth);
                }
              }}
              className="text-[10px] text-zinc-600 hover:text-rose-400 transition-colors"
            >
              Clear month
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-900 bg-zinc-900/30">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium w-48">Tag</th>
                  <th className="px-3 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {txsForMonth.map((tx) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    knownTags={knownTags}
                    onTag={(tag) => tagTransaction(activeScope, tx.id, tag, true)}
                    onUpdate={(patch) => updateTransaction(activeScope, tx.id, patch)}
                    onDelete={() => {
                      if (confirm(`Delete "${tx.description}" (${fmtCurrencyPrecise(tx.amount)})?`)) {
                        deleteTransaction(activeScope, tx.id);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-10 text-center">
          <div className="text-sm text-zinc-500">
            No transactions in {formatMonthKey(activeMonth)} for {activeScope}.
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Upload a CSV from your bank to get started.
          </div>
        </div>
      )}

      {/* Merchant memory summary */}
      {Object.keys(scopeData.merchantMemory).length > 0 && (
        <details className="rounded-xl border border-zinc-800 bg-zinc-950/40">
          <summary className="px-5 py-3 cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200">
            Merchant Memory ({Object.keys(scopeData.merchantMemory).length})
          </summary>
          <div className="px-5 pb-4 pt-1 grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(scopeData.merchantMemory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([merchant, tag]) => (
                <div
                  key={merchant}
                  className="text-xs px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900/40"
                >
                  <span className="text-zinc-300">{merchant}</span>
                  <span className="text-zinc-600 mx-1.5">→</span>
                  <span className="text-emerald-400">{tag}</span>
                </div>
              ))}
          </div>
        </details>
      )}

      {pendingCSV && (
        <ColumnMapper
          headers={pendingCSV.headers}
          sampleRows={pendingCSV.rows}
          suggestedMapping={pendingCSV.suggestedMapping}
          onApply={applyMapping}
          onCancel={() => setPendingCSV(null)}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// Try to recognize a known set of headers from remembered mappings.
// Returns the most likely prior mapping, or a best-guess fresh one.
function suggestMapping(headers, savedMappings) {
  const lower = headers.map((h) => (h || "").toLowerCase());

  // First pass: look for a saved mapping whose headers roughly match
  for (const [sourceName, mapping] of Object.entries(savedMappings || {})) {
    if (
      mapping.dateCol >= 0 &&
      mapping.dateCol < headers.length &&
      mapping.descriptionCol >= 0 &&
      mapping.descriptionCol < headers.length
    ) {
      return { ...mapping, sourceName };
    }
  }

  // Second pass: heuristic guess based on common header names
  const findByKeywords = (keywords) => {
    for (const kw of keywords) {
      const idx = lower.findIndex((h) => h.includes(kw));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const dateCol = findByKeywords(["posting date", "trans date", "transaction date", "date"]);
  const descriptionCol = findByKeywords(["description", "merchant", "memo", "payee", "details", "name"]);
  const amountCol = findByKeywords(["amount"]);
  const debitCol = findByKeywords(["debit", "withdrawal"]);
  const creditCol = findByKeywords(["credit", "deposit"]);

  const hasSplit = debitCol >= 0 || creditCol >= 0;
  return {
    sourceName: "",
    mode: hasSplit ? "split" : "single",
    dateCol,
    descriptionCol,
    amountCol,
    debitCol,
    creditCol,
    flipSign: false,
  };
}
