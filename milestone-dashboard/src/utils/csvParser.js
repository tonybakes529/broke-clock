// csvParser.js — pure CSV parsing, no bank-specific logic.
// Returns { headers: string[], rows: string[][] } for the column-mapping step.

// RFC 4180-ish parser: handles quoted fields, escaped quotes, commas inside quotes,
// and \r\n / \n line endings. Not trying to win a standards compliance contest,
// just trying not to blow up on real bank exports.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }

    if (ch === "\r" && next === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 2;
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Strip fully-empty trailing rows (common in bank exports)
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === "")) {
    rows.pop();
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  // Heuristic: first row is headers if it contains mostly non-numeric strings
  const first = rows[0];
  const looksLikeHeaders =
    first.length > 0 &&
    first.filter((c) => c.trim() && isNaN(Number(c.replace(/[,$]/g, "")))).length >=
      Math.ceil(first.length * 0.5);

  if (looksLikeHeaders) {
    return {
      headers: first.map((h) => h.trim()),
      rows: rows.slice(1),
    };
  }
  // No headers — generate placeholder column names
  return {
    headers: first.map((_, idx) => `Column ${idx + 1}`),
    rows,
  };
}

// Parse an amount string. Handles: "1,234.56", "$1,234.56", "(45.00)" for negative,
// "-45.00", trailing "CR"/"DR", plain numbers.
export function parseAmount(raw) {
  if (raw === null || raw === undefined) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;

  // Parentheses = negative (accounting convention)
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }

  // Trailing CR/DR
  const upper = s.toUpperCase();
  if (upper.endsWith(" CR")) {
    s = s.slice(0, -3);
  } else if (upper.endsWith(" DR")) {
    s = s.slice(0, -3);
    negative = true;
  }

  // Strip currency symbols, commas, whitespace
  s = s.replace(/[$,\s]/g, "");

  const n = Number(s);
  if (isNaN(n)) return NaN;
  return negative ? -Math.abs(n) : n;
}

// Parse a date string. Tries common US bank formats.
// Returns ISO date string (YYYY-MM-DD) or null.
export function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const [, mo, d, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (m) {
    const [, mo, d, yy] = m;
    const year = Number(yy) > 50 ? `19${yy}` : `20${yy}`;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Fallback: let Date constructor try
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }

  return null;
}

// Given a row and a column mapping, extract a normalized transaction.
// mapping: { dateCol, descriptionCol, amountCol, debitCol?, creditCol? }
// Returns null if the row can't be parsed (e.g. missing required fields).
export function rowToTransaction(row, headers, mapping) {
  const getByIndex = (idx) => (idx >= 0 && idx < row.length ? row[idx] : "");

  const dateRaw = getByIndex(mapping.dateCol);
  const descRaw = getByIndex(mapping.descriptionCol);

  const date = parseDate(dateRaw);
  const description = (descRaw || "").trim();

  if (!date || !description) return null;

  let amount;
  if (mapping.mode === "single") {
    amount = parseAmount(getByIndex(mapping.amountCol));
  } else {
    // debit/credit columns
    const debit = parseAmount(getByIndex(mapping.debitCol));
    const credit = parseAmount(getByIndex(mapping.creditCol));
    const d = isNaN(debit) ? 0 : Math.abs(debit);
    const c = isNaN(credit) ? 0 : Math.abs(credit);
    // Debits are expenses (negative), credits are income (positive)
    amount = c - d;
  }

  if (isNaN(amount)) return null;

  // Some banks flip the sign — expenses appear positive. We detect this at import
  // time and let the user flip if needed. Default: leave as-is.
  if (mapping.flipSign) amount = -amount;

  return {
    date,
    description,
    rawDescription: description,
    amount,
  };
}

// Simple stable hash for transaction dedup.
// Same date + same amount (to cents) + same first 40 chars of description = duplicate.
export function hashTransaction(tx) {
  const amt = Math.round((tx.amount || 0) * 100);
  const desc = (tx.description || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40);
  const s = `${tx.date}|${amt}|${desc}`;
  // djb2-ish hash, returned as base36 string
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
