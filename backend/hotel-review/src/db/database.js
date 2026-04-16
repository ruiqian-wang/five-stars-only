import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { settings } from "../config/settings.js";

let db = null;

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function getDb() {
  if (db) return db;

  ensureParentDir(settings.dbPath);
  db = new Database(settings.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

export function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      property_id TEXT PRIMARY KEY,
      city TEXT,
      province TEXT,
      country TEXT,
      star_rating REAL,
      guest_rating_avg REAL,
      popular_amenities_list TEXT,
      description_blob TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      review_id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      acquisition_date TEXT,
      lob TEXT,
      overall_rating REAL,
      rating_raw TEXT,
      review_title TEXT,
      review_text TEXT,
      full_text TEXT,
      FOREIGN KEY (property_id) REFERENCES properties(property_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_acquisition_date ON reviews(acquisition_date);

    CREATE TABLE IF NOT EXISTS official_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      amenity_id TEXT NOT NULL,
      facet TEXT NOT NULL,
      official_fact TEXT NOT NULL,
      source_field TEXT,
      source_text TEXT,
      UNIQUE(property_id, amenity_id, facet),
      FOREIGN KEY (property_id) REFERENCES properties(property_id)
    );

    CREATE TABLE IF NOT EXISTS review_evidences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      acquisition_date TEXT,
      amenity_id TEXT NOT NULL,
      facet TEXT NOT NULL,
      polarity TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.8,
      evidence_text TEXT NOT NULL,
      value TEXT,
      extractor_version TEXT NOT NULL DEFAULT 'rules_v3_node',
      FOREIGN KEY (review_id) REFERENCES reviews(review_id)
    );
    CREATE INDEX IF NOT EXISTS idx_review_evidences_property_id ON review_evidences(property_id);
    CREATE INDEX IF NOT EXISTS idx_review_evidences_property_facet ON review_evidences(property_id, amenity_id, facet);
    CREATE INDEX IF NOT EXISTS idx_review_evidences_acquisition_date ON review_evidences(acquisition_date);

    CREATE TABLE IF NOT EXISTS amenity_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      amenity_id TEXT NOT NULL,
      facet TEXT NOT NULL,
      official_fact TEXT NOT NULL DEFAULT 'not_listed',
      actual_recent_coverage INTEGER NOT NULL DEFAULT 0,
      lifetime_coverage INTEGER NOT NULL DEFAULT 0,
      expected_recent_coverage INTEGER NOT NULL DEFAULT 0,
      recent_pos INTEGER NOT NULL DEFAULT 0,
      recent_neg INTEGER NOT NULL DEFAULT 0,
      recent_mixed INTEGER NOT NULL DEFAULT 0,
      conflict_score REAL NOT NULL DEFAULT 0,
      coverage_gap REAL NOT NULL DEFAULT 0,
      staleness_score REAL NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'MISSING',
      last_verified_at TEXT,
      snapshot_date TEXT NOT NULL,
      explanation TEXT,
      UNIQUE(property_id, amenity_id, facet),
      FOREIGN KEY (property_id) REFERENCES properties(property_id)
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_property_id ON amenity_snapshots(property_id);

    CREATE TABLE IF NOT EXISTS followup_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      review_session_id TEXT,
      amenity_id TEXT NOT NULL,
      facet TEXT NOT NULL,
      question_text TEXT NOT NULL,
      answer_value TEXT,
      answer_text TEXT,
      answered_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_followup_answers_property_id ON followup_answers(property_id);
  `);
}

export function clearAllTables(database) {
  database.exec(`
    DELETE FROM followup_answers;
    DELETE FROM amenity_snapshots;
    DELETE FROM review_evidences;
    DELETE FROM official_facts;
    DELETE FROM reviews;
    DELETE FROM properties;
  `);
}
