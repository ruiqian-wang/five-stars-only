import express from "express";
import cors from "cors";
import { settings } from "./config/settings.js";
import { getDb } from "./db/database.js";
import { buildPropertyRouter } from "./routes/properties.js";

const app = express();
const db = getDb();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/v1", buildPropertyRouter(db));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

app.listen(settings.port, () => {
  console.log(`Hotel Review Gap Coach listening on http://localhost:${settings.port}`);
});
