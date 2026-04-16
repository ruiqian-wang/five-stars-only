import express from "express";
import { rebuildSnapshots } from "../services/snapshotBuilder.js";
import { pickFollowup, topCandidatesWithOptionalAi } from "../services/followupScorer.js";

export function buildPropertyRouter(db) {
  const router = express.Router();

  router.get("/properties", (_req, res) => {
    const rows = db
      .prepare("SELECT property_id, city, province, country FROM properties ORDER BY city, country")
      .all();
    res.json(rows);
  });

  router.get("/properties/:propertyId/snapshot", (req, res) => {
    const rows = db
      .prepare("SELECT amenity_id, facet, official_fact, actual_recent_coverage, lifetime_coverage, expected_recent_coverage, recent_pos, recent_neg, recent_mixed, conflict_score, coverage_gap, staleness_score, state, last_verified_at, explanation FROM amenity_snapshots WHERE property_id = ? ORDER BY amenity_id, facet")
      .all(req.params.propertyId);

    if (!rows.length) {
      return res.status(404).json({ error: "No snapshot found for this property_id." });
    }
    return res.json(rows);
  });

  router.post("/properties/:propertyId/candidates", async (req, res, next) => {
    try {
      const { draftText = "", askedFacets = [], guestProfile = {}, limit = 5, useAi = true } = req.body || {};
      const candidates = await topCandidatesWithOptionalAi(db, req.params.propertyId, {
        draftText,
        askedFacets,
        guestProfile,
        limit,
        useAi,
      });
      res.json(candidates);
    } catch (error) {
      next(error);
    }
  });

  router.post("/properties/:propertyId/followup", async (req, res, next) => {
    try {
      const { draftText = "", askedFacets = [], guestProfile = {}, useAi = true } = req.body || {};
      const candidate = await pickFollowup(db, req.params.propertyId, {
        draftText,
        askedFacets,
        guestProfile,
        useAi,
      });
      res.json(candidate || null);
    } catch (error) {
      next(error);
    }
  });

  router.post("/followup-answers", (req, res) => {
    const payload = req.body || {};
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO followup_answers (
        property_id, review_session_id, amenity_id, facet, question_text, answer_value, answer_text, answered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.property_id,
      payload.review_session_id || null,
      payload.amenity_id,
      payload.facet,
      payload.question_text,
      payload.answer_value || null,
      payload.answer_text || null,
      now,
    );
    res.json({ status: "ok", stored_at: now });
  });

  router.post("/admin/rebuild-snapshots", (_req, res) => {
    const result = rebuildSnapshots(db);
    res.json({ status: "ok", ...result });
  });

  return router;
}
