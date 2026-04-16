import "dotenv/config";
import app from "./app";
const port = Number(process.env.PORT ?? 8787);

app.listen(port, () => {
  console.log(`[backend] Image generation API listening on http://localhost:${port}`);
  console.log(`[backend] Open http://localhost:${port}/ for endpoint list, or GET /api/health`);
  console.log(`[backend] Hotel review APIs mounted at /api/hotel-review/v1`);
});
