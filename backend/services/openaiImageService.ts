import OpenAI, { toFile } from "openai";
import { createHash } from "node:crypto";
import { buildElementPrompt, buildFacetFloorPlanElementPrompt } from "../prompts/elementPromptBuilder";
import { resolveFacetObjectInstruction } from "../prompts/facetObjectMap";
import { buildRoomPrompt } from "../prompts/roomPromptBuilder";
import type { RoomItem, RoomStructure, StyleReference } from "../types/room";

type GeneratedImageResponse = {
  prompt: string;
  imageBase64: string;
  mimeType: "image/png";
};

const DEFAULT_STYLE_GUIDE =
  "Hand-drawn top-down floor plan style, simple black lines, subtle paper texture, orange outer wall strokes, minimal shading.";

/**
 * In-memory cache prevents repeated OpenAI generation calls for identical inputs
 * during the current backend process lifetime.
 */
const roomImageCache = new Map<string, GeneratedImageResponse>();
const elementImageCache = new Map<string, GeneratedImageResponse>();

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Set it in your server environment.");
  }

  return new OpenAI({ apiKey });
}

function getStyleImageDataUrl(styleReference: StyleReference): string {
  const mimeType = styleReference.mimeType ?? "image/png";
  return `data:${mimeType};base64,${styleReference.imageBase64}`;
}

/**
 * Converts the style reference image into a compact textual style guide.
 * This keeps image-generation prompts consistent and easier to debug.
 */
async function buildStyleGuideFromReference(
  client: OpenAI,
  styleReference?: StyleReference
): Promise<string> {
  if (!styleReference?.imageBase64) {
    return DEFAULT_STYLE_GUIDE;
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "You are writing a reproducible STYLE SPEC for another image model.\n" +
                "Analyze the attached reference image and output 8–12 short bullet lines.\n" +
                "Each bullet must be concrete and visual (what a renderer would copy), e.g.:\n" +
                "- wall stroke color + thickness\n" +
                "- interior line color vs wall color\n" +
                "- paper/background tone + grain/noise\n" +
                "- door/window graphic conventions\n" +
                "- shading level (none / minimal hatching)\n" +
                "Avoid furniture/object appearance cues in the style output.\n" +
                "Do NOT describe room layout or furniture arrangement.\n" +
                "Do NOT mention 'the image' — write imperatives only.",
            },
            {
              type: "input_image",
              image_url: getStyleImageDataUrl(styleReference),
              detail: "auto",
            },
          ],
        },
      ],
    });

    return response.output_text?.trim() || DEFAULT_STYLE_GUIDE;
  } catch {
    // If style extraction fails, keep generation working with a fallback style.
    return DEFAULT_STYLE_GUIDE;
  }
}

function styleReferenceUploadName(mimeType?: string): string {
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return "style-reference.jpg";
  if (mimeType?.includes("webp")) return "style-reference.webp";
  return "style-reference.png";
}

function styleReferenceDigest(styleReference?: StyleReference): string {
  if (!styleReference?.imageBase64) return "no-style-reference";
  // Hash is compact and avoids massive cache keys with raw base64 payloads.
  return createHash("sha1").update(styleReference.imageBase64).digest("hex");
}

function getRoomCacheKey(roomStructure: RoomStructure, styleReference?: StyleReference): string {
  return [
    "room",
    roomStructure.roomId,
    JSON.stringify(roomStructure),
    styleReferenceDigest(styleReference),
  ].join("|");
}

function getElementCacheKey(
  roomItem: RoomItem,
  styleReference?: StyleReference,
  facetKey?: string
): string {
  return [
    "element",
    "tpng-v1",
    facetKey ?? "legacy",
    roomItem.id,
    JSON.stringify(roomItem),
    styleReferenceDigest(styleReference),
  ].join("|");
}

function parseFacetKeyParts(facetKey: string): { amenityId: string; facet: string } {
  const i = facetKey.indexOf(":");
  if (i < 0) return { amenityId: "UNKNOWN", facet: facetKey };
  return { amenityId: facetKey.slice(0, i), facet: facetKey.slice(i + 1) };
}

type RenderImageOptions = {
  /**
   * Request true PNG with alpha (GPT image models). Use for isolated furniture overlays.
   * Room shells should omit this (opaque / paper-style backgrounds).
   */
  transparentPng?: boolean;
};

/**
 * When a style reference image exists, prefer `images.edit` with `input_fidelity: high`
 * so the model strongly matches the reference's visual language (per OpenAI docs).
 * Text-only generation uses `images.generate`.
 */
async function renderPromptToImage(
  client: OpenAI,
  prompt: string,
  styleReference?: StyleReference,
  options?: RenderImageOptions
): Promise<GeneratedImageResponse> {
  const transparent = options?.transparentPng === true;
  const alphaPng = transparent
    ? { background: "transparent" as const, output_format: "png" as const }
    : {};

  if (styleReference?.imageBase64) {
    const mimeType = styleReference.mimeType ?? "image/png";
    const uploadable = await toFile(
      Buffer.from(styleReference.imageBase64, "base64"),
      styleReferenceUploadName(mimeType),
      { type: mimeType }
    );

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: uploadable,
      prompt,
      size: "1024x1024",
      input_fidelity: "high",
      ...alphaPng,
    });

    const imageBase64 = result.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("OpenAI image edit response did not include base64 image data.");
    }

    return { prompt, imageBase64, mimeType: "image/png" };
  }

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    ...alphaPng,
  });

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI image response did not include base64 image data.");
  }

  return { prompt, imageBase64, mimeType: "image/png" };
}

export async function generateFullRoomImage(
  roomStructure: RoomStructure,
  styleReference?: StyleReference
): Promise<GeneratedImageResponse> {
  const cacheKey = getRoomCacheKey(roomStructure, styleReference);
  const cached = roomImageCache.get(cacheKey);
  if (cached) return cached;

  const client = getOpenAIClient();
  const styleGuide = await buildStyleGuideFromReference(client, styleReference);
  // IMPORTANT: room shell must not inherit reference-image content (e.g. furniture).
  // We only use the reference to extract text style notes, then run pure generation.
  const mode = "generate";
  const prompt = buildRoomPrompt(roomStructure, styleGuide, mode);
  const generated = await renderPromptToImage(client, prompt);
  roomImageCache.set(cacheKey, generated);
  return generated;
}

export type GenerateRoomElementOptions = {
  /** When set, uses the facet-driven floor-plan UI prompt (no style-reference vision step). */
  facetKey?: string;
};

export async function generateRoomElementImage(
  roomItem: RoomItem,
  styleReference?: StyleReference,
  options?: GenerateRoomElementOptions
): Promise<GeneratedImageResponse> {
  const facetKey = options?.facetKey?.trim();
  const facetMode = Boolean(facetKey);
  const cacheKey = getElementCacheKey(roomItem, styleReference, facetKey);
  const cached = elementImageCache.get(cacheKey);
  if (cached) return cached;

  const client = getOpenAIClient();

  if (facetMode && facetKey) {
    const { amenityId, facet } = parseFacetKeyParts(facetKey);
    const objectInstruction = resolveFacetObjectInstruction(facetKey);
    const styleGuide = await buildStyleGuideFromReference(client, styleReference);
    const prompt = buildFacetFloorPlanElementPrompt(
      facetKey,
      amenityId,
      facet,
      objectInstruction,
      roomItem,
      styleGuide
    );
    const generated = await renderPromptToImage(client, prompt, styleReference, { transparentPng: true });
    elementImageCache.set(cacheKey, generated);
    return generated;
  }

  const styleGuide = await buildStyleGuideFromReference(client, styleReference);
  const mode = styleReference?.imageBase64 ? "style-edit" : "generate";
  const prompt = buildElementPrompt(roomItem, styleGuide, mode);
  const generated = await renderPromptToImage(client, prompt, styleReference, { transparentPng: true });
  elementImageCache.set(cacheKey, generated);
  return generated;
}
