import { getFacetConfig } from "../config/taxonomy.js";
import { settings } from "../config/settings.js";
import { applyGuestProfileAdjustments } from "./profileMatcher.js";
import { aiRerankCandidates } from "./aiReranker.js";

function facetKey(amenityId, facet) {
  return `${amenityId}:${facet}`;
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

    if (amenityId && facet) normalized.add(facetKey(amenityId, facet));
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
    if (asked.has(facetKey(snapshot.amenity_id, snapshot.facet))) continue;
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

export async function topCandidatesWithOptionalAi(
  db,
  propertyId,
  { draftText = "", askedFacets = [], guestProfile = {}, limit = 5, useAi = true } = {},
) {
  const baseCandidates = topCandidates(db, propertyId, { draftText, askedFacets, guestProfile, limit: Math.max(limit, 8) });
  if (!useAi || !baseCandidates.length) return baseCandidates.slice(0, limit);

  try {
    const property = getPropertyContext(db, propertyId);
    const ai = await aiRerankCandidates({
      property,
      guestProfile,
      draftText,
      candidates: baseCandidates,
      limit,
    });

    if (!ai?.selections?.length) return baseCandidates.slice(0, limit);
    const pickedKeys = new Map(ai.selections.map((item, index) => [item.facetKey, { ...item, rank: index }]));
    const reranked = baseCandidates
      .filter((candidate) => pickedKeys.has(facetKey(candidate.amenity_id, candidate.facet)))
      .map((candidate) => ({
        ...candidate,
        ai: pickedKeys.get(facetKey(candidate.amenity_id, candidate.facet)),
      }))
      .sort((a, b) => a.ai.rank - b.ai.rank);

    if (!reranked.length) return baseCandidates.slice(0, limit);
    return reranked.slice(0, limit);
  } catch (error) {
    return baseCandidates.slice(0, limit).map((candidate) => ({
      ...candidate,
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
