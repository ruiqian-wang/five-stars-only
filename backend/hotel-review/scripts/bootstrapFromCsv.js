import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { getDb, clearAllTables } from "../src/db/database.js";
import { settings } from "../src/config/settings.js";
import { extractOfficialFacts } from "../src/services/officialFacts.js";
import { extractReviewEvidence, EXTRACTOR_VERSION } from "../src/services/evidenceExtractor.js";
import { rebuildSnapshots } from "../src/services/snapshotBuilder.js";
import { joinBlob, makeReviewId, parseDateSafe, parseRatingOverall } from "../src/utils/text.js";

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });
}

function requiredPath(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Set it in the repo root .env (see .env.example).`);
  }
  return value.trim();
}

function assertReadableCsvFile(name, filePath) {
  if (filePath.includes("absolute/path/to") || filePath.includes("path/to")) {
    throw new Error(
      `${name} is still a placeholder (${filePath}). ` +
        `In the repo root .env, set DESCRIPTION_CSV and REVIEWS_CSV to real files, e.g. /Users/you/data/Description_PROC.csv`,
    );
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`${name} file not found: ${filePath}\nCheck the path in repo root .env.`);
  }
}

const db = getDb();
const descriptionCsv = requiredPath("DESCRIPTION_CSV", settings.descriptionCsv);
const reviewsCsv = requiredPath("REVIEWS_CSV", settings.reviewsCsv);
assertReadableCsvFile("DESCRIPTION_CSV", descriptionCsv);
assertReadableCsvFile("REVIEWS_CSV", reviewsCsv);

const descriptionRows = readCsv(descriptionCsv);
const reviewRows = readCsv(reviewsCsv);

clearAllTables(db);

const insertProperty = db.prepare(`
  INSERT INTO properties (
    property_id, city, province, country, star_rating, guest_rating_avg, popular_amenities_list, description_blob
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertOfficialFact = db.prepare(`
  INSERT INTO official_facts (
    property_id, amenity_id, facet, official_fact, source_field, source_text
  ) VALUES (?, ?, ?, ?, ?, ?)
`);

const insertReview = db.prepare(`
  INSERT INTO reviews (
    review_id, property_id, acquisition_date, lob, overall_rating, rating_raw, review_title, review_text, full_text
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertEvidence = db.prepare(`
  INSERT INTO review_evidences (
    review_id, property_id, acquisition_date, amenity_id, facet, polarity, confidence, evidence_text, value, extractor_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const propertyTx = db.transaction(() => {
  for (const row of descriptionRows) {
    const propertyId = row.eg_property_id;
    const descriptionBlob = joinBlob(row.area_description, row.property_description, row.popular_amenities_list);
    insertProperty.run(
      propertyId,
      row.city || null,
      row.province || null,
      row.country || null,
      row.star_rating ? Number(row.star_rating) : null,
      row.guestrating_avg_expedia ? Number(row.guestrating_avg_expedia) : null,
      row.popular_amenities_list || null,
      descriptionBlob,
    );

    for (const fact of extractOfficialFacts(row)) {
      insertOfficialFact.run(
        fact.property_id,
        fact.amenity_id,
        fact.facet,
        fact.official_fact,
        fact.source_field,
        fact.source_text,
      );
    }
  }
});

const reviewTx = db.transaction(() => {
  for (let i = 0; i < reviewRows.length; i++) {
    const row = reviewRows[i];
    const propertyId = row.eg_property_id;
    const acquisitionDate = parseDateSafe(row.acquisition_date);
    const reviewTitle = row.review_title || null;
    const reviewText = row.review_text || null;
    const fullText = joinBlob(reviewTitle, reviewText);
    // Row index disambiguates duplicate title/text/date rows so PRIMARY KEY stays unique.
    const reviewId = `${makeReviewId(propertyId, acquisitionDate, reviewTitle, reviewText)}__${i}`;
    const overallRating = parseRatingOverall(row.rating);

    insertReview.run(
      reviewId,
      propertyId,
      acquisitionDate,
      row.lob || null,
      overallRating,
      row.rating || null,
      reviewTitle,
      reviewText,
      fullText,
    );

    const evidences = extractReviewEvidence(fullText);
    for (const evidence of evidences) {
      insertEvidence.run(
        reviewId,
        propertyId,
        acquisitionDate,
        evidence.amenity_id,
        evidence.facet,
        evidence.polarity,
        evidence.confidence,
        evidence.evidence_text,
        evidence.value || null,
        EXTRACTOR_VERSION,
      );
    }
  }
});

propertyTx();
reviewTx();
const snapshotResult = rebuildSnapshots(db);

const propertyCount = db.prepare("SELECT COUNT(*) AS count FROM properties").get().count;
const reviewCount = db.prepare("SELECT COUNT(*) AS count FROM reviews").get().count;
const evidenceCount = db.prepare("SELECT COUNT(*) AS count FROM review_evidences").get().count;
const snapshotCount = db.prepare("SELECT COUNT(*) AS count FROM amenity_snapshots").get().count;

console.log(JSON.stringify({
  status: "ok",
  propertyCount,
  reviewCount,
  evidenceCount,
  snapshotCount,
  snapshotDate: snapshotResult.snapshotDate,
}, null, 2));
