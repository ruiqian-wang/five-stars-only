import fs from "node:fs";
import path from "node:path";
import type { StyleReference } from "../types/room";

function readPicAsStyleReference(fileName: string): StyleReference | undefined {
  const abs = path.resolve(process.cwd(), "pic", fileName);
  if (!fs.existsSync(abs)) {
    console.warn(`[backend] Style reference not found: ${abs}`);
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
  return { imageBase64: buf.toString("base64"), mimeType };
}

/** Bundled style sheets: `style1` / `style2` (see repo `pic/style1.png`, `pic/style2.png`). */
export function loadBundledStyleReference(variant: "style1" | "style2"): StyleReference | undefined {
  const file = variant === "style2" ? "style2.png" : "style1.png";
  return readPicAsStyleReference(file);
}

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

/** Resolve style for API: explicit variant → env path → bundled style1. */
export function resolveStyleReferenceForRequest(body: {
  styleVariant?: unknown;
  styleReference?: unknown;
}): StyleReference | undefined {
  const v = body?.styleVariant;
  const variant: "style1" | "style2" = v === "style2" ? "style2" : "style1";
  const fromBundled = loadBundledStyleReference(variant);
  if (fromBundled) return fromBundled;
  if (variant === "style2") {
    const fallback = loadBundledStyleReference("style1");
    if (fallback) return fallback;
  }
  const parsed = parseStyleReferenceFromBody(body?.styleReference);
  if (parsed) return parsed;
  return loadStyleReferenceFromEnv();
}

function parseStyleReferenceFromBody(value: unknown): StyleReference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const style = value as Partial<StyleReference>;
  if (!style.imageBase64 || typeof style.imageBase64 !== "string") return undefined;
  if (style.mimeType && typeof style.mimeType !== "string") return undefined;
  return { imageBase64: style.imageBase64, mimeType: style.mimeType };
}
