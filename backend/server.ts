import "dotenv/config";
import express from "express";
import imageGenerationRoutes from "./routes/imageGenerationRoutes";
import { getDb } from "./hotel-review/src/db/database.js";
import { buildPropertyRouter } from "./hotel-review/src/routes/properties.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const hotelReviewDb = getDb();

// Larger limit to allow style reference image base64 payloads.
app.use(express.json({ limit: "20mb" }));

// Root: browsers often open `/` first; there is no HTML app here—only JSON APIs.
app.get("/", (_req, res) => {
  res.json({
    service: "Five Stars Only image API",
    message: "Use POST endpoints below. This server has no page at `/`.",
    endpoints: {
      health: "GET /api/health",
      generateRoomImage: "POST /api/generate-room-image",
      generateRoomElement: "POST /api/generate-room-element",
      hotelReviewHealth: "GET /api/hotel-review/health",
      hotelReviewProperties: "GET /api/hotel-review/v1/properties",
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", imageGenerationRoutes);
app.use("/api/hotel-review/v1", buildPropertyRouter(hotelReviewDb));

app.get("/api/hotel-review/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`[backend] Image generation API listening on http://localhost:${port}`);
  console.log(`[backend] Open http://localhost:${port}/ for endpoint list, or GET /api/health`);
  console.log(`[backend] Hotel review APIs mounted at /api/hotel-review/v1`);
});
