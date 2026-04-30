// merchantMatcher.js — normalize merchant strings for tag memory lookup.
// The goal: "STARBUCKS #4829 TAMPA FL 04/15" and "STARBUCKS COFFEE" both map
// to the same memory key so auto-tagging actually works across statements.

// Words that appear as noise in bank descriptions — locations, transaction types, filler.
const NOISE_WORDS = new Set([
  "llc", "inc", "co", "corp", "ltd", "the",
  "purchase", "payment", "pos", "debit", "credit", "card", "auth",
  "recurring", "online", "web", "mobile", "app",
  "pending", "processing",
  // US state abbreviations — locations get stripped
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia",
  "ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj",
  "nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt",
  "va","wa","wv","wi","wy","dc",
]);

// Strip digits, punctuation, location patterns, common noise.
// Keeps the merchant "brand" part for matching.
export function normalizeMerchant(raw) {
  if (!raw) return "";
  let s = String(raw).toLowerCase();

  // Strip common prefixes banks add
  s = s.replace(/^(sq \*|sp \*|tst\*|paypal \*|amzn \*|amz\*|sqc\*)/i, "");
  s = s.replace(/^(checkcard|pos|debit|credit|ach|wire|xfer|transfer)\s+/i, "");

  // Strip anything that looks like a date at the end (MM/DD or MM-DD)
  s = s.replace(/\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*$/g, "");

  // Strip phone numbers
  s = s.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "");

  // Strip store/reference numbers (#1234, store 045)
  s = s.replace(/#\s*\d+/g, "");
  s = s.replace(/\bstore\s*\d+/gi, "");

  // Strip most punctuation, keep spaces and letters
  s = s.replace(/[^a-z0-9\s]/g, " ");

  // Strip standalone numbers
  s = s.replace(/\b\d+\b/g, " ");

  // Tokenize and filter
  const tokens = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !NOISE_WORDS.has(t));

  // Keep first 3 meaningful tokens — that's usually the brand
  return tokens.slice(0, 3).join(" ").trim();
}

// Look up a tag for a raw description. Returns the tag string or null.
// memory: { [normalizedMerchant: string]: string }
export function lookupTag(rawDescription, memory) {
  if (!memory) return null;
  const normalized = normalizeMerchant(rawDescription);
  if (!normalized) return null;

  // Exact match first
  if (memory[normalized]) return memory[normalized];

  // Prefix match — "starbucks coffee" matches memory key "starbucks"
  const tokens = normalized.split(" ");
  for (let len = tokens.length; len >= 1; len--) {
    const prefix = tokens.slice(0, len).join(" ");
    if (memory[prefix]) return memory[prefix];
  }

  // Substring match — memory has "whole foods", incoming is "wholefds"
  // (Rare, but catches a few edge cases. Only match if memory key is >= 4 chars.)
  for (const [key, tag] of Object.entries(memory)) {
    if (key.length >= 4 && normalized.includes(key)) return tag;
  }

  return null;
}

// Record a tag decision so future lookups pick it up.
// Uses the shortest useful key — first token of normalized merchant.
// That way "STARBUCKS #123" and "STARBUCKS #456" both match on "starbucks".
export function rememberTag(memory, rawDescription, tag) {
  const normalized = normalizeMerchant(rawDescription);
  if (!normalized) return memory;
  const firstToken = normalized.split(" ")[0];
  if (!firstToken || firstToken.length < 2) {
    // fall back to full normalized string
    return { ...memory, [normalized]: tag };
  }
  return { ...memory, [firstToken]: tag };
}

// Remove a merchant from memory (user unticked "remember this").
export function forgetMerchant(memory, rawDescription) {
  const normalized = normalizeMerchant(rawDescription);
  if (!normalized) return memory;
  const firstToken = normalized.split(" ")[0];
  const next = { ...memory };
  delete next[firstToken];
  delete next[normalized];
  return next;
}
