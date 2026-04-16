<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the frontend:
   `npm run dev`
3. Run the backend API (separate terminal):
   `npm run dev:backend`

## Backend Image Generation API

Backend is implemented with Node.js + Express and calls OpenAI from server-side only.

- `POST /api/generate-room-image`
- `POST /api/generate-room-element`

### Environment

Create `.env` from `.env.example` and set:

- `OPENAI_API_KEY=...`
- optional: `PORT=8787`
- optional: `STYLE_REFERENCE_IMAGE_PATH=pic/style1.png` — default style image when the JSON body does not include `styleReference`

### Style matching

When `styleReference` is present (or loaded from `STYLE_REFERENCE_IMAGE_PATH`), the server uses OpenAI **`images.edit`** with **`input_fidelity: high`** so output follows the reference image’s line work, color, and texture more closely. A vision step still writes a detailed style checklist into the text prompt. Pure text generation (`images.generate`) is used only when no reference image is available.

### Request payloads

`POST /api/generate-room-image`

`roomStructure` is the only geometry input used for this endpoint. `roomItems` can be sent in the same payload for client convenience, but furniture is intentionally excluded from room-image rendering and should be generated through `/api/generate-room-element`.

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
  "roomItems": [
    { "id": "bed-1", "type": "bed", "label": "King Bed", "x": 100, "y": 580, "width": 220, "height": 160 }
  ],
  "styleReference": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png"
  }
}
```

`POST /api/generate-room-element`

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
  "styleReference": {
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png"
  }
}
```

Both endpoints respond with:

```json
{
  "success": true,
  "prompt": "...",
  "imageBase64": "...",
  "mimeType": "image/png"
}
```
