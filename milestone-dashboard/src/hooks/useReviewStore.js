// useReviewStore.js — state for the Monthly Review feature.
// Holds per-scope: transactions, merchant memory, column mappings, month snapshots.
// Persists to localStorage. Independent of useBudgetStore.

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "md.review.v1";

const emptyScope = () => ({
  merchantMemory: {},       // { normalizedMerchant: tag }
  columnMappings: {},       // { sourceName: { mode, dateCol, descriptionCol, amountCol, debitCol, creditCol, flipSign, hasHeaders } }
  transactions: [],         // [{ id, hash, date, description, rawDescription, amount, tag, source, importedAt }]
  tagsUsed: [],             // ordered list of recently-used tags (for autocomplete)
});

const defaultState = () => ({
  business: emptyScope(),
  personal: emptyScope(),
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      business: { ...emptyScope(), ...(parsed.business || {}) },
      personal: { ...emptyScope(), ...(parsed.personal || {}) },
    };
  } catch {
    return defaultState();
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — fail silently */
  }
}

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Given a transaction, derive its month key (YYYY-MM)
export const monthKeyOf = (tx) => (tx.date ? tx.date.slice(0, 7) : null);

export function useReviewStore() {
  const [state, setState] = useState(load);

  useEffect(() => {
    save(state);
  }, [state]);

  // Import a batch of parsed transactions. Skips duplicates by hash.
  // Returns { imported: number, skipped: number }
  const importTransactions = useCallback((scope, newTxs, sourceName) => {
    let imported = 0;
    let skipped = 0;
    setState((prev) => {
      const existing = prev[scope].transactions;
      const existingHashes = new Set(existing.map((t) => t.hash));
      const toAdd = [];
      for (const tx of newTxs) {
        if (existingHashes.has(tx.hash)) {
          skipped++;
          continue;
        }
        toAdd.push({
          id: makeId(),
          ...tx,
          source: sourceName || tx.source || "Unknown",
          importedAt: new Date().toISOString(),
        });
        existingHashes.add(tx.hash);
        imported++;
      }
      return {
        ...prev,
        [scope]: {
          ...prev[scope],
          transactions: [...existing, ...toAdd],
        },
      };
    });
    return { imported, skipped };
  }, []);

  // Update a single transaction field (amount, date, tag).
  const updateTransaction = useCallback((scope, id, patch) => {
    setState((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        transactions: prev[scope].transactions.map((t) =>
          t.id === id ? { ...t, ...patch } : t
        ),
      },
    }));
  }, []);

  // Tag a transaction AND update merchant memory so future imports auto-tag.
  const tagTransaction = useCallback((scope, id, tag, rememberMerchant = true) => {
    setState((prev) => {
      const tx = prev[scope].transactions.find((t) => t.id === id);
      if (!tx) return prev;

      const transactions = prev[scope].transactions.map((t) =>
        t.id === id ? { ...t, tag } : t
      );

      let merchantMemory = prev[scope].merchantMemory;
      if (rememberMerchant && tag) {
        // Inline import of rememberTag to avoid a module cycle
        // (we'll import at top of file — see below)
        merchantMemory = rememberTagInline(merchantMemory, tx.rawDescription || tx.description, tag);
      }

      const tagsUsed = tag
        ? [tag, ...prev[scope].tagsUsed.filter((t) => t !== tag)].slice(0, 50)
        : prev[scope].tagsUsed;

      return {
        ...prev,
        [scope]: {
          ...prev[scope],
          transactions,
          merchantMemory,
          tagsUsed,
        },
      };
    });
  }, []);

  const deleteTransaction = useCallback((scope, id) => {
    setState((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        transactions: prev[scope].transactions.filter((t) => t.id !== id),
      },
    }));
  }, []);

  // Save a column mapping for a source so the next upload auto-applies it.
  const saveColumnMapping = useCallback((scope, sourceName, mapping) => {
    if (!sourceName) return;
    setState((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        columnMappings: {
          ...prev[scope].columnMappings,
          [sourceName]: mapping,
        },
      },
    }));
  }, []);

  // Delete an entire month's worth of transactions (if user wants a redo).
  const clearMonth = useCallback((scope, monthKey) => {
    setState((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        transactions: prev[scope].transactions.filter(
          (t) => monthKeyOf(t) !== monthKey
        ),
      },
    }));
  }, []);

  // Remove merchant from memory (stops auto-tagging it)
  const forgetMerchantInMemory = useCallback((scope, merchantKey) => {
    setState((prev) => {
      const next = { ...prev[scope].merchantMemory };
      delete next[merchantKey];
      return {
        ...prev,
        [scope]: { ...prev[scope], merchantMemory: next },
      };
    });
  }, []);

  // Derived: transactions grouped by month, within a scope
  const getMonthGroups = useCallback(
    (scope) => {
      const groups = {};
      for (const tx of state[scope].transactions) {
        const k = monthKeyOf(tx);
        if (!k) continue;
        if (!groups[k]) groups[k] = [];
        groups[k].push(tx);
      }
      // Sort each group by date desc
      for (const k of Object.keys(groups)) {
        groups[k].sort((a, b) => b.date.localeCompare(a.date));
      }
      return groups;
    },
    [state]
  );

  // Derived: month totals by tag + income/expense split.
  // This is the "auto-update" behavior — edits flow through instantly.
  const getMonthTotals = useCallback(
    (scope, monthKey) => {
      const groups = getMonthGroups(scope);
      const txs = groups[monthKey] || [];
      const totalsByTag = {};
      let totalIncome = 0;
      let totalExpenses = 0;
      let untagged = 0;
      for (const tx of txs) {
        if (tx.amount > 0) totalIncome += tx.amount;
        else totalExpenses += Math.abs(tx.amount);

        const key = tx.tag?.trim() || "Untagged";
        if (key === "Untagged") untagged++;
        totalsByTag[key] = (totalsByTag[key] || 0) + Math.abs(tx.amount);
      }
      return {
        txCount: txs.length,
        totalIncome,
        totalExpenses,
        net: totalIncome - totalExpenses,
        totalsByTag,
        untagged,
      };
    },
    [getMonthGroups]
  );

  // All historical months across both scopes — for the Goals graph later
  const getAllMonthsSnapshot = useCallback(() => {
    const out = {};
    for (const scope of ["business", "personal"]) {
      const groups = getMonthGroups(scope);
      for (const [monthKey, _txs] of Object.entries(groups)) {
        const totals = getMonthTotals(scope, monthKey);
        if (!out[monthKey]) out[monthKey] = { business: null, personal: null };
        out[monthKey][scope] = totals;
      }
    }
    return out;
  }, [getMonthGroups, getMonthTotals]);

  // Expose raw state and all the actions
  return {
    state,
    importTransactions,
    updateTransaction,
    tagTransaction,
    deleteTransaction,
    saveColumnMapping,
    clearMonth,
    forgetMerchantInMemory,
    getMonthGroups,
    getMonthTotals,
    getAllMonthsSnapshot,
  };
}

// --- Inline merchant memory helper (duplicated from merchantMatcher to avoid
//     cross-module imports in the hook). Keep in sync with merchantMatcher.js.
function normalizeMerchantInline(raw) {
  if (!raw) return "";
  let s = String(raw).toLowerCase();
  s = s.replace(/^(sq \*|sp \*|tst\*|paypal \*|amzn \*|amz\*|sqc\*)/i, "");
  s = s.replace(/^(checkcard|pos|debit|credit|ach|wire|xfer|transfer)\s+/i, "");
  s = s.replace(/\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*$/g, "");
  s = s.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "");
  s = s.replace(/#\s*\d+/g, "");
  s = s.replace(/\bstore\s*\d+/gi, "");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\b\d+\b/g, " ");
  const NOISE = new Set(["llc","inc","co","corp","ltd","the","purchase","payment","pos","debit","credit","card","auth","recurring","online","web","mobile","app","pending","processing","al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv","wi","wy","dc"]);
  const tokens = s.split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 1 && !NOISE.has(t));
  return tokens.slice(0, 3).join(" ").trim();
}

function rememberTagInline(memory, rawDescription, tag) {
  const normalized = normalizeMerchantInline(rawDescription);
  if (!normalized) return memory;
  const firstToken = normalized.split(" ")[0];
  if (!firstToken || firstToken.length < 2) {
    return { ...memory, [normalized]: tag };
  }
  return { ...memory, [firstToken]: tag };
}
