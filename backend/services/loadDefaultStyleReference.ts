import fs from "node:fs";
import path from "node:path";
import type { StyleReference } from "../types/room";

/**
 * Optional default style image from disk (e.g. repo `pic/style1.png`).
 * Lets you run generation without pasting base64 on every request.
 */
export function loadStyleReferenceFromEnv(): StyleReference | undefined {
  const raw = process.env.STYLE_REFERENCE_IMAGE_PATH?.trim();
  if (!raw) return undefined;

  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  if (!fs.existsSync(abs)) {
    console.warn(`[backend] STYLE_REFERENCE_IMAGE_PATH not found: ${abs}`);
    return undefined;
  }

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "image/png";

  return {
    imageBase64: buf.toString("base64"),
    mimeType,
  };
}
