# Five Stars Dashboard

Interactive hotel-stay experience with:
- a React/Vite frontend (`My Trips`, `Rate your stay`, room-sticker flow),
- an Express backend for room image generation, and
- a hotel-review API module for dynamic follow-up questions.

## Run Locally

**Prerequisites:** Node.js 20+ and npm.

1. Install dependencies:
   `npm install`
2. Run frontend:
   `npm run dev`
3. Run backend (separate terminal):
   `npm run dev:backend`

Frontend runs on `http://localhost:3000`.
Backend defaults to `http://localhost:8787`.

## Scripts

- `npm run dev` - start Vite frontend
- `npm run dev:backend` - start Express backend (`backend/server.ts`)
- `npm run bootstrap:hotel-review` - import hotel CSV data into SQLite snapshots
- `npm run lint` - TypeScript check (`tsc --noEmit`)
- `npm run build` - production build

## Environment

Create `.env` from `.env.example` and configure as needed.

Core keys:
- `OPENAI_API_KEY` (required for OpenAI calls)
- `PORT` (optional, default `8787`)
- `STYLE_REFERENCE_IMAGE_PATH` (optional fallback style image)

Hotel-review module keys:
- `DB_PATH`
- `DESCRIPTION_CSV`
- `REVIEWS_CSV`
- `RECENT_WINDOW_DAYS`
- `PENDING_REVIEW_LAG_DAYS`
- `ASK_THRESHOLD`
- `OPENAI_MODEL` (default `gpt-5`)
- `ENABLE_AI_RERANK`

Frontend optional key:
- `VITE_HOTEL_REVIEW_PROPERTY_ID`
  - If set, `Rate your stay` uses this property directly.
  - If unset, frontend uses the first row from `GET /api/hotel-review/v1/properties`.

## Backend APIs

`backend/server.ts` mounts three groups:

- Health:
  - `GET /api/health`
  - `GET /api/hotel-review/health`

- Image generation (`/api`):
  - `POST /api/generate-room-image`
  - `POST /api/generate-room-element`

- Hotel review (`/api/hotel-review/v1`):
  - `GET /properties`
  - `GET /properties/:propertyId/snapshot`
  - `POST /properties/:propertyId/candidates`
  - `POST /properties/:propertyId/followup`
  - `POST /followup-answers`
  - `POST /admin/rebuild-snapshots`

## Image Generation Payloads

### `POST /api/generate-room-image`

Uses only `roomStructure` geometry to render the room shell.
`roomItems` may be present for client convenience but are not drawn in this endpoint.

```json
{
  "roomStructure": {
    "roomId": "room-402",
    "roomType": "Deluxe Suite",
    "width": 900,
    "height": 900,
    "frame": [
      { "id": "fw-outer", "elementType": "outer-wall", "x": 20, "y": 20, "width": 860, "height": 860 },
      { "id": "fw-door-main", "elementType": "door", "x": 760, "y": 840, "width": 120, "height": 40 }
    ]
  },
  "styleReference": {
    "imageBase64": "...",
    "mimeType": "image/png"
  }
}
```

### `POST /api/generate-room-element`

```json
{
  "roomItem": {
    "id": "sofa-1",
    "type": "sofa",
    "label": "Sofa",
    "x": 500,
    "y": 560,
    "width": 230,
    "height": 120
  },
  "facetKey": "ROOM_CLEANLINESS:surfaces_clean",
  "styleReference": {
    "imageBase64": "...",
    "mimeType": "image/png"
  }
}
```

Both endpoints return:

```json
{
  "success": true,
  "prompt": "...",
  "imageBase64": "...",
  "mimeType": "image/png"
}
```

## Hotel-Review Notes

The question engine can return these interaction types:
- `likert_5`
- `single_choice`
- `multi_select`
- `nps_10`

Client submission stores per-question values as `answer_value` plus optional `answer_text` via `POST /api/hotel-review/v1/followup-answers`.

For module-specific details, see `backend/hotel-review/README.md`.
