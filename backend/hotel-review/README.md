# Hotel Review Gap Coach (Node.js / Express)

Hotel-review module used by the main backend at:
- Base path: `/api/hotel-review/v1`
- Mounted from: `backend/server.ts`

This service ranks follow-up questions from hotel signals (description + reviews), applies guest-profile filtering, and optionally uses OpenAI to re-rank candidates.

## Current Behavior (Code-Aligned)

- Candidate ranking comes from snapshots + scoring in `src/services/followupScorer.js`.
- Optional AI re-ranking comes from `src/services/aiReranker.js`.
- Interaction types returned by API can be:
  - `likert_5`
  - `single_choice`
  - `multi_select`
  - `nps_10`
- Frontend posts answers to `POST /followup-answers` with:
  - `answer_value` (string; for multi-select values are joined with `|` on client)
  - optional `answer_text`

## Project Layout

```bash
backend/hotel-review/
├── README.md
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── settings.js
│   │   └── taxonomy.js
│   ├── db/
│   │   └── database.js
│   ├── routes/
│   │   └── properties.js
│   ├── services/
│   │   ├── aiReranker.js
│   │   ├── evidenceExtractor.js
│   │   ├── followupScorer.js
│   │   ├── officialFacts.js
│   │   ├── profileMatcher.js
│   │   └── snapshotBuilder.js
│   └── utils/
│       └── text.js
└── scripts/
    └── bootstrapFromCsv.js
```

## Install / Run

From repo root:

```bash
npm install
```

Start combined backend (image + hotel-review APIs):

```bash
npm run dev:backend
```

Default port is `8787` from root `.env` (`PORT`).

## Required Environment

Set in root `.env`:

```bash
DB_PATH=./data/evidence-gap.sqlite
DESCRIPTION_CSV=./data/hotel-import/Description_PROC.csv
REVIEWS_CSV=./data/hotel-import/Reviews_PROC.csv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5
ENABLE_AI_RERANK=true
RECENT_WINDOW_DAYS=180
PENDING_REVIEW_LAG_DAYS=14
ASK_THRESHOLD=0.55
```

## Bootstrap Data

Build SQLite tables + import CSV + rebuild snapshots:

```bash
npm run bootstrap:hotel-review
```

## HTTP Endpoints

All endpoints below are under `/api/hotel-review/v1`.

### Health (outside v1 prefix)

```bash
GET /api/hotel-review/health
```

### List properties

```bash
GET /properties
```

### Property snapshot

```bash
GET /properties/:propertyId/snapshot
```

### Candidate questions

```bash
POST /properties/:propertyId/candidates
Content-Type: application/json

{
  "draftText": "Wi-Fi was good and the room was quiet.",
  "askedFacets": ["ROOM_INFRA:wifi_available"],
  "guestProfile": {
    "travelerType": "business",
    "hasChildren": false,
    "broughtCar": true,
    "usedBreakfast": false,
    "needsAirportShuttle": false,
    "lateArrival": true,
    "mobilityNeeds": false
  },
  "limit": 5,
  "useAi": true
}
```

Response rows include fields like:
- `amenity_id`, `facet`, `question_text`, `options`
- `interaction_type`
- `comment_placeholder`
- `score`, `state`, `debug`

### Best follow-up

```bash
POST /properties/:propertyId/followup
Content-Type: application/json

{
  "draftText": "Wi-Fi was good and the room was quiet.",
  "askedFacets": ["ROOM_INFRA:wifi_available"],
  "guestProfile": {
    "travelerType": "business",
    "hasChildren": false,
    "broughtCar": true,
    "usedBreakfast": false
  },
  "useAi": true
}
```

### Store follow-up answer

```bash
POST /followup-answers
Content-Type: application/json

{
  "property_id": "PROP-123",
  "review_session_id": "stay-abc",
  "amenity_id": "ROOM_CLEANLINESS",
  "facet": "surfaces_clean",
  "question_text": "How clean were the room surfaces?",
  "answer_value": "4",
  "answer_text": "Desk and bedside table were clean."
}
```

### Rebuild snapshots (admin)

```bash
POST /admin/rebuild-snapshots
```

## Notes

- If `useAi` is `false` or AI fails, service falls back to deterministic ranking.
- `ENABLE_AI_RERANK` defaults to `true` in config.
- This module is documented for the current codebase state as of now.
