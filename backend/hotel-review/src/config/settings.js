import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

export const settings = {
  port: toNumber(process.env.PORT, 3000),
  dbPath: process.env.DB_PATH || "./data/evidence-gap.sqlite",
  descriptionCsv: process.env.DESCRIPTION_CSV || "",
  reviewsCsv: process.env.REVIEWS_CSV || "",
  recentWindowDays: toNumber(process.env.RECENT_WINDOW_DAYS, 180),
  pendingReviewLagDays: toNumber(process.env.PENDING_REVIEW_LAG_DAYS, 14),
  askThreshold: toNumber(process.env.ASK_THRESHOLD, 0.55),
  openaiModel: process.env.OPENAI_MODEL || "gpt-5",
  enableAiRerank: toBoolean(process.env.ENABLE_AI_RERANK, true),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
};
