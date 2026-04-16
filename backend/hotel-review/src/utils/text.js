import crypto from "node:crypto";

export function normalizeWhitespace(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function stripHtml(text = "") {
  return String(text || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
}

export function normalizeText(text = "") {
  return normalizeWhitespace(stripHtml(text)).toLowerCase();
}

export function parseJsonishArray(value) {
  if (value == null) return [];
  const text = String(value).trim();
  if (!text || ["nan", "none", "null"].includes(text.toLowerCase())) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => normalizeWhitespace(String(item)));
  } catch {
    // fall through
  }
  return [normalizeWhitespace(text)];
}

export function joinBlob(...values) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => value != null && String(value).trim() !== "")
    .map((value) => String(value))
    .join(" | ");
}

export function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function parseDateSafe(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;

  const parsers = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{4}\/\d{2}\/\d{2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  ];

  if (!parsers.some((pattern) => pattern.test(text))) {
    const date = new Date(text);
    return Number.isNaN(date.valueOf()) ? null : toIsoDate(date);
  }

  const parts = text.includes("/") ? text.split("/") : text.split("-");
  if (text.includes("/") && parts[0].length <= 2) {
    const [m, d, y] = parts.map((value) => Number(value));
    const year = y < 100 ? 2000 + y : y;
    return safeIsoDate(year, m, d);
  }
  if (text.includes("/")) {
    const [y, m, d] = parts.map((value) => Number(value));
    return safeIsoDate(y, m, d);
  }
  const [y, m, d] = parts.map((value) => Number(value));
  return safeIsoDate(y, m, d);
}

function safeIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.valueOf()) ? null : toIsoDate(date);
}

export function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function subtractDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return toIsoDate(date);
}

export function makeReviewId(propertyId, acquisitionDate, reviewTitle, reviewText) {
  const payload = [
    propertyId || "",
    acquisitionDate || "",
    normalizeWhitespace(reviewTitle || ""),
    normalizeWhitespace(reviewText || ""),
  ].join("||");
  const digest = crypto.createHash("sha1").update(payload).digest("hex");
  return `${propertyId}_${digest}`;
}

export function parseRatingOverall(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    const overall = Number(parsed?.overall);
    return Number.isFinite(overall) ? overall : null;
  } catch {
    const match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
}

export function coalesceText(...values) {
  for (const value of values) {
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}
