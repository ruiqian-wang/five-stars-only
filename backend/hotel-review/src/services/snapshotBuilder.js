import { AMENITY_FACETS, getFacetConfig } from "../config/taxonomy.js";
import { settings } from "../config/settings.js";
import { subtractDays, todayIso } from "../utils/text.js";

export function lagAwareToday(asOf = todayIso()) {
  return subtractDays(asOf, settings.pendingReviewLagDays);
}

export function normalizeExpectedRate(rawRate) {
  const rate = Math.max(Number(rawRate) || 0, 0);
  return rate >= 1 ? rate / 100 : rate;
}

export function contradictionScore(officialFact, pos, neg) {
  const total = pos + neg;
  if (!total) return 0;

  const positiveOfficial = new Set(["listed", "included", "open", "seasonal", "yes", "available", "working", "available_included"]);
  const negativeOfficial = new Set(["not_listed", "surcharge", "temporarily_closed", "surcharge_or_limited", "no", "not_available", "available_surcharge"]);

  let base = Math.min(pos, neg) / total;
  if (positiveOfficial.has(officialFact) && neg > 0) base = Math.max(base, neg / total);
  if (negativeOfficial.has(officialFact) && pos > 0) base = Math.max(base, pos / total);
  return Number(Math.min(1, base).toFixed(3));
}

export function stalenessScore(lastVerifiedAt, ttlDays, effectiveToday) {
  if (!lastVerifiedAt) return 1;
  const daysSince = diffDays(lastVerifiedAt, effectiveToday);
  const lagAdjusted = Math.max(0, daysSince - settings.pendingReviewLagDays);
  return Number(Math.min(1, lagAdjusted / Math.max(ttlDays, 1)).toFixed(3));
}

function diffDays(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}

function groupRowsByPropertyFacet(rows) {
  const bucket = new Map();
  for (const row of rows) {
    const key = `${row.property_id}|${row.amenity_id}|${row.facet}`;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key).push(row);
  }
  return bucket;
}

function groupedUniqueCounts(rows) {
  const bucket = new Map();
  for (const row of rows) {
    const key = `${row.amenity_id}|${row.facet}`;
    if (!bucket.has(key)) bucket.set(key, new Set());
    bucket.get(key).add(row.review_id);
  }
  return new Map([...bucket.entries()].map(([key, reviewIds]) => [key, reviewIds.size]));
}

export function rebuildSnapshots(db, asOf) {
  const effectiveToday = lagAwareToday(asOf || todayIso());
  const recentStart = subtractDays(effectiveToday, settings.recentWindowDays);

  const officialRows = db.prepare("SELECT * FROM official_facts").all();
  const propertyIds = db.prepare("SELECT property_id FROM properties").all().map((row) => row.property_id);
  const recentReviews = db.prepare("SELECT property_id, review_id FROM reviews WHERE acquisition_date >= ? AND acquisition_date <= ?").all(recentStart, effectiveToday);
  const recentEvidenceRows = db.prepare("SELECT * FROM review_evidences WHERE acquisition_date >= ? AND acquisition_date <= ?").all(recentStart, effectiveToday);
  const allEvidenceRows = db.prepare("SELECT * FROM review_evidences").all();

  const officialMap = new Map();
  for (const row of officialRows) {
    const key = `${row.property_id}|${row.amenity_id}|${row.facet}`;
    officialMap.set(key, row.official_fact);
  }

  const recentReviewCounts = new Map();
  for (const row of recentReviews) {
    recentReviewCounts.set(row.property_id, (recentReviewCounts.get(row.property_id) || 0) + 1);
  }

  const recentIndex = groupRowsByPropertyFacet(recentEvidenceRows);
  const allIndex = groupRowsByPropertyFacet(allEvidenceRows);
  const globalRecentCounts = groupedUniqueCounts(recentEvidenceRows);
  const globalRecentReviewCount = Math.max(1, recentReviews.length);
  const learnedRates = new Map(
    [...globalRecentCounts.entries()].map(([key, count]) => [key, count / globalRecentReviewCount]),
  );

  db.prepare("DELETE FROM amenity_snapshots").run();

  const insert = db.prepare(`
    INSERT INTO amenity_snapshots (
      property_id, amenity_id, facet, official_fact,
      actual_recent_coverage, lifetime_coverage, expected_recent_coverage,
      recent_pos, recent_neg, recent_mixed,
      conflict_score, coverage_gap, staleness_score,
      state, last_verified_at, snapshot_date, explanation
    ) VALUES (
      @property_id, @amenity_id, @facet, @official_fact,
      @actual_recent_coverage, @lifetime_coverage, @expected_recent_coverage,
      @recent_pos, @recent_neg, @recent_mixed,
      @conflict_score, @coverage_gap, @staleness_score,
      @state, @last_verified_at, @snapshot_date, @explanation
    )
  `);

  const tx = db.transaction(() => {
    for (const propertyId of propertyIds) {
      const propertyRecentReviewCount = recentReviewCounts.get(propertyId) || 0;
      const propertyOfficialEntries = officialRows.filter((row) => row.property_id === propertyId);

      for (const [amenityId, facets] of Object.entries(AMENITY_FACETS)) {
        const amenityListed = propertyOfficialEntries.some((row) => row.amenity_id === amenityId && row.official_fact !== "not_listed");

        for (const facet of facets) {
          const cfg = getFacetConfig(amenityId, facet);
          const officialFact = officialMap.get(`${propertyId}|${amenityId}|${facet}`) || "not_listed";

          const current = recentIndex.get(`${propertyId}|${amenityId}|${facet}`) || [];
          const historical = allIndex.get(`${propertyId}|${amenityId}|${facet}`) || [];

          const actualRecentCoverage = new Set(current.map((row) => row.review_id)).size;
          const lifetimeCoverage = new Set(historical.map((row) => row.review_id)).size;
          const recentPos = current.filter((row) => row.polarity === "pos").length;
          const recentNeg = current.filter((row) => row.polarity === "neg").length;
          const recentMixed = current.filter((row) => row.polarity === "mixed").length;
          const historicalDates = historical.map((row) => row.acquisition_date).filter(Boolean).sort();
          const lastVerifiedAt = historicalDates.length ? historicalDates[historicalDates.length - 1] : null;

          const configuredRate = normalizeExpectedRate(cfg.expectedRate);
          const learnedRate = learnedRates.get(`${amenityId}|${facet}`) || 0;
          const expectedRate = Math.max(configuredRate, learnedRate);
          let expectedRecentCoverage = Math.ceil(propertyRecentReviewCount * expectedRate);
          if (officialFact !== "not_listed" || amenityListed) expectedRecentCoverage = Math.max(expectedRecentCoverage, 1);

          const coverageGap = Number((Math.max(0, expectedRecentCoverage - actualRecentCoverage) / Math.max(expectedRecentCoverage, 1)).toFixed(3));
          const stale = stalenessScore(lastVerifiedAt, cfg.ttlDays, effectiveToday);
          const conflict = contradictionScore(officialFact, recentPos, recentNeg);

          let state = "SATURATED";
          if (conflict >= 0.45 && recentPos + recentNeg >= 2) {
            state = "CONFLICT";
          } else if (lifetimeCoverage > 0 && actualRecentCoverage < expectedRecentCoverage && stale >= 0.6) {
            state = "STALE";
          } else if (actualRecentCoverage < expectedRecentCoverage) {
            state = "MISSING";
          }

          const explanation = [
            `official=${officialFact}`,
            `actual_recent=${actualRecentCoverage}`,
            `expected_recent=${expectedRecentCoverage}`,
            `last_verified_at=${lastVerifiedAt || "null"}`,
            `recent_pos=${recentPos}`,
            `recent_neg=${recentNeg}`,
            `state=${state}`,
          ].join("; ");

          insert.run({
            property_id: propertyId,
            amenity_id: amenityId,
            facet,
            official_fact: officialFact,
            actual_recent_coverage: actualRecentCoverage,
            lifetime_coverage: lifetimeCoverage,
            expected_recent_coverage: expectedRecentCoverage,
            recent_pos: recentPos,
            recent_neg: recentNeg,
            recent_mixed: recentMixed,
            conflict_score: conflict,
            coverage_gap: coverageGap,
            staleness_score: stale,
            state,
            last_verified_at: lastVerifiedAt,
            snapshot_date: effectiveToday,
            explanation,
          });
        }
      }
    }
  });

  tx();
  return { snapshotDate: effectiveToday };
}
