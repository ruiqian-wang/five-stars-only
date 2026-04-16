import { getFacetConfig } from "../config/taxonomy.js";
import { settings } from "../config/settings.js";
import { applyGuestProfileAdjustments } from "./profileMatcher.js";
import { aiRerankCandidates } from "./aiReranker.js";

function facetKey(amenityId, facet) {
  return `${amenityId}:${facet}`;
}

/** Normalize keys so LLM output still matches DB candidates (spacing / case). */
function canonicalFacetKeyFromString(raw) {
  const s = String(raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!s) return "";
  const idx = s.indexOf(":");
  if (idx === -1) return s.replace(/\s+/g, "").toUpperCase();
  const left = s.slice(0, idx).trim().replace(/\s+/g, "");
  const right = s.slice(idx + 1).trim().replace(/\s+/g, "");
  if (!left || !right) return "";
  return `${left.toUpperCase()}:${right.toLowerCase()}`;
}

function canonicalFacetKey(amenityId, facet) {
  return canonicalFacetKeyFromString(`${amenityId}:${facet}`);
}

function normalizeAskedFacets(askedFacets = []) {
  const normalized = new Set();
  for (const item of askedFacets || []) {
    let amenityId = null;
    let facet = null;

    if (typeof item === "string") {
      for (const separator of [":", ".", "/", "|"]) {
        if (item.includes(separator)) {
          const [left, right] = item.split(separator, 2);
          amenityId = left.trim();
          facet = right.trim();
          break;
        }
      }
    } else if (Array.isArray(item) && item.length === 2) {
      amenityId = String(item[0]);
      facet = String(item[1]);
    } else if (item && typeof item === "object") {
      amenityId = item.amenity_id;
      facet = item.facet;
    }

    if (amenityId && facet) normalized.add(canonicalFacetKey(amenityId, facet));
  }
  return normalized;
}

function draftPenalty(draftText, amenityId, facet) {
  if (!draftText) return 0;
  const draft = String(draftText).toLowerCase();
  const keywordMap = {
    "PARKING:included": ["parking", "park"],
    "PARKING:entrance_findability": ["parking entrance"],
    "ROOM_CLEANLINESS:surfaces_clean": ["clean", "dirty", "dusty"],
    "ROOM_CLEANLINESS:bedding_clean": ["sheet", "bedding", "bed linen"],
    "ROOM_CLEANLINESS:odor": ["smell", "odor", "musty", "smoke"],
    "ROOM_INFRA:wifi_available": ["wifi", "wi-fi", "internet"],
    "ROOM_INFRA:wifi_fee": ["wifi", "wi-fi", "internet"],
    "ROOM_SERVICE:breakfast_included": ["breakfast"],
    "HOTEL_INFRA:shuttle": ["shuttle"],
    "NOISE:external_noise": ["noise", "quiet", "hallway", "street noise"],
  };

  const keywords = keywordMap[facetKey(amenityId, facet)] || [];
  return keywords.some((keyword) => draft.includes(keyword)) ? 0.12 : 0;
}

function scoreSnapshot(snapshot) {
  const cfg = getFacetConfig(snapshot.amenity_id, snapshot.facet);
  if (!cfg) return null;

  const stateBonus = {
    CONFLICT: 0.22,
    STALE: 0.12,
    MISSING: 0.05,
    SATURATED: -0.2,
  }[snapshot.state] || 0;

  const rawScore =
    0.35 * snapshot.coverage_gap +
    0.25 * snapshot.staleness_score +
    0.3 * snapshot.conflict_score +
    0.07 * cfg.businessImportance +
    0.03 * cfg.answerability +
    stateBonus;

  return {
    property_id: snapshot.property_id,
    amenity_id: snapshot.amenity_id,
    facet: snapshot.facet,
    state: snapshot.state,
    score: Number(Math.max(0, Math.min(1, rawScore)).toFixed(3)),
    question_text: cfg.questionText,
    options: cfg.options,
    debug: {
      coverage_gap: snapshot.coverage_gap,
      staleness_score: snapshot.staleness_score,
      conflict_score: snapshot.conflict_score,
      business_importance: cfg.businessImportance,
      answerability: cfg.answerability,
      state_bonus: stateBonus,
      official_fact: snapshot.official_fact,
      explanation: snapshot.explanation,
    },
  };
}

function getPropertyContext(db, propertyId) {
  const property = db.prepare("SELECT * FROM properties WHERE property_id = ?").get(propertyId);
  const officialFacts = db
    .prepare("SELECT amenity_id, facet, official_fact, source_field, source_text FROM official_facts WHERE property_id = ? ORDER BY amenity_id, facet")
    .all(propertyId);
  return { ...property, official_facts: officialFacts };
}

export function topCandidates(db, propertyId, { draftText = "", askedFacets = [], guestProfile = {}, limit = 5 } = {}) {
  const asked = normalizeAskedFacets(askedFacets);
  const snapshots = db
    .prepare("SELECT * FROM amenity_snapshots WHERE property_id = ? ORDER BY amenity_id, facet")
    .all(propertyId);

  const ranked = [];
  for (const snapshot of snapshots) {
    if (asked.has(canonicalFacetKey(snapshot.amenity_id, snapshot.facet))) continue;
    if (snapshot.state === "SATURATED" && Number(snapshot.conflict_score) < 0.2) continue;

    const candidate = scoreSnapshot(snapshot);
    if (!candidate) continue;

    const penalty = draftPenalty(draftText, snapshot.amenity_id, snapshot.facet);
    const afterDraft = Number(Math.max(0, candidate.score - penalty).toFixed(3));
    const profileAdjustment = applyGuestProfileAdjustments({ ...candidate, score: afterDraft }, guestProfile);
    if (profileAdjustment.blocked) continue;

    ranked.push({
      ...candidate,
      score: profileAdjustment.adjustedScore,
      debug: {
        ...candidate.debug,
        draft_penalty: penalty,
        profile_delta: profileAdjustment.delta,
        profile_reasons: profileAdjustment.reasons,
      },
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.amenity_id.localeCompare(b.amenity_id) || a.facet.localeCompare(b.facet));
  return ranked.slice(0, limit);
}

/**
 * Heuristic: taxonomy almost always ships 2–6 `options`. True multiple-choice is
 * usually 3+ categories (parking tier, odor type, yes/no/not sure). Binary pairs
 * are better as 1–5 satisfaction on the UI; answers still stored as star 1–5.
 */
function inferInteractionType(candidate) {
  const optCount = candidate.options?.length ?? 0;
  if (optCount < 2) return "likert_5";
  if (optCount === 2) return "single_choice";
  if (optCount >= 6) return "multi_select";
  return "single_choice";
}

function resolveInteractionType(candidate, aiMeta) {
  const optCount = candidate.options?.length ?? 0;
  const fromAi = aiMeta?.interactionType;
  if (fromAi === "nps_10") return "nps_10";
  if (fromAi === "multi_select" && optCount >= 3) return "multi_select";
  if (fromAi === "single_choice" && optCount >= 2) return "single_choice";
  if (fromAi === "likert_5") return "likert_5";
  if (optCount === 2) return "single_choice";
  return inferInteractionType(candidate);
}

function defaultCommentPlaceholder() {
  return "Optional: add a brief note other guests would find helpful.";
}

function resolveCommentPlaceholder(finalQuestionText, aiMeta) {
  const raw = typeof aiMeta?.commentPlaceholder === "string" ? String(aiMeta.commentPlaceholder).trim() : "";
  if (raw.length >= 10 && raw.length <= 260) return raw.slice(0, 260);
  return defaultCommentPlaceholder();
}

function decorateStayReviewFields(candidate, aiMeta) {
  const personalized =
    typeof aiMeta?.personalizedQuestion === "string" ? String(aiMeta.personalizedQuestion).trim() : "";
  const finalQuestion = personalized || candidate.question_text;
  const interaction_type = resolveInteractionType({ ...candidate, question_text: finalQuestion }, aiMeta);
  const comment_placeholder = resolveCommentPlaceholder(finalQuestion, aiMeta);
  return {
    ...candidate,
    question_text: finalQuestion,
    interaction_type,
    comment_placeholder,
    ...(aiMeta ? { ai: aiMeta } : {}),
  };
}

export async function topCandidatesWithOptionalAi(
  db,
  propertyId,
  { draftText = "", askedFacets = [], guestProfile = {}, limit = 5, useAi = true } = {},
) {
  const baseCandidates = topCandidates(db, propertyId, { draftText, askedFacets, guestProfile, limit: Math.max(limit, 8) });
  if (!baseCandidates.length) return [];
  if (!useAi) return baseCandidates.slice(0, limit).map((c) => decorateStayReviewFields(c, null));

  try {
    const property = getPropertyContext(db, propertyId);
    const ai = await aiRerankCandidates({
      property,
      guestProfile,
      draftText,
      candidates: baseCandidates,
      limit,
    });

    if (!ai?.selections?.length) return baseCandidates.slice(0, limit).map((c) => decorateStayReviewFields(c, null));

    const selectionOrder = ai.selections.map((item, index) => ({
      key: canonicalFacetKeyFromString(item.facetKey),
      meta: { ...item, rank: index },
    }));

    const metaByKey = new Map();
    for (const { key, meta } of selectionOrder) {
      if (key && !metaByKey.has(key)) metaByKey.set(key, meta);
    }

    const baseByKey = new Map(baseCandidates.map((c) => [canonicalFacetKey(c.amenity_id, c.facet), c]));

    const seenKeys = new Set();
    const reranked = [];
    for (const { key, meta } of selectionOrder) {
      if (!key || seenKeys.has(key)) continue;
      const candidate = baseByKey.get(key);
      if (!candidate) continue;
      seenKeys.add(key);
      reranked.push(decorateStayReviewFields(candidate, meta));
    }

    if (reranked.length) return reranked.slice(0, limit);

    const fallback = baseCandidates.slice(0, limit).map((c) => {
      const k = canonicalFacetKey(c.amenity_id, c.facet);
      return decorateStayReviewFields(c, metaByKey.get(k));
    });
    return fallback;
  } catch (error) {
    return baseCandidates.slice(0, limit).map((candidate) => ({
      ...decorateStayReviewFields(candidate, null),
      ai_error: error.message,
    }));
  }
}

export async function pickFollowup(db, propertyId, options = {}) {
  const candidates = await topCandidatesWithOptionalAi(db, propertyId, { ...options, limit: 1 });
  if (!candidates.length) return null;
  const candidate = candidates[0];
  return candidate.score < settings.askThreshold ? null : candidate;
}
