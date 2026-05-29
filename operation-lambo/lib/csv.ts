import type { Kind } from "./engine";

// Keywords that pre-flag an imported row as luxury spend.
export const LUXURY_KEYWORDS = [
  "dealership",
  "lamborghini",
  "ferrari",
  "porsche",
  "rolex",
  "watch",
  "gucci",
  "louis vuitton",
  "designer",
  "jewel",
  "first class",
  "resort",
  "casino",
  "yacht",
];

export interface ParsedRow {
  date: string; // 'YYYY-MM-DD'
  kind: Kind;
  amount: number;
  note: string;
  luxury: boolean;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY or M/D/YY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = `20${yy}`;
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function isLuxury(desc: string): boolean {
  const lower = desc.toLowerCase();
  return LUXURY_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Parse a bank/card CSV export with columns: date, description, amount.
 * Negatives → spend, positives → income. Header row auto-detected.
 */
export function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  // detect + skip a header row
  const first = splitCsvLine(lines[0]).join(",").toLowerCase();
  const start = /date|description|amount/.test(first) ? 1 : 0;

  const rows: ParsedRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 3) continue;
    const [rawDate, desc, rawAmount] = cols;
    const date = normalizeDate(rawDate);
    const amount = parseFloat(rawAmount.replace(/[^0-9.\-]/g, ""));
    if (!date || isNaN(amount) || amount === 0) continue;

    const kind: Kind = amount > 0 ? "income" : "spend";
    rows.push({
      date,
      kind,
      amount: Math.abs(amount),
      note: desc || "(imported)",
      luxury: kind === "spend" && isLuxury(desc),
    });
  }
  return rows;
}
