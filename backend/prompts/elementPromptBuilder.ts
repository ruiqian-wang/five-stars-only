import type { RoomItem } from "../types/room";

export type ElementImagePromptMode = "generate" | "style-edit";

const FACET_UI_STYLE_BLOCK = [
  "Create a single furniture illustration in a top-down (floor plan) view.",
  "",
  "STYLE:",
  "Hand-drawn, playful sketch style mixed with clean architectural floor plan rendering.",
  "Soft beige and warm tones, slightly textured fill.",
  "Loose, imperfect white sketch lines on top (like doodle annotations).",
  "Simple shading, slightly flat but with subtle depth.",
  "Bold orange or dark outline consistent with floor plan walls style.",
  "Minimalist but expressive, not realistic.",
  "",
  "REQUIREMENTS:",
  "- Isolated object only (no room, no background context)",
  "- Centered composition",
  "- True transparent background: PNG with full alpha channel (no solid backdrop, no floor tile)",
  "- No text, no labels",
  "- No people, no animals",
  "- Keep proportions consistent with floor plan scale",
  "- Slightly cartoonish but still readable as furniture",
  "- Clean edges for UI overlay usage",
  "",
  "OUTPUT:",
  "Top-down furniture icon suitable for interactive floor plan UI.",
].join("\n");

/**
 * Facet-driven prompt for hotel review rating dimensions (one icon per facet).
 */
export function buildFacetFloorPlanElementPrompt(
  facetKey: string,
  amenityId: string,
  facet: string,
  objectInstruction: string,
  roomItem: RoomItem,
  styleSpecification?: string
): string {
  const scaleHint = `Approximate footprint hint from layout (relative units): width=${roomItem.width}, height=${roomItem.height}.`;
  const styleExtra = styleSpecification?.trim()
    ? ["", "REFERENCE-DERIVED STYLE NOTES (match the floor-plan style sheet):", styleSpecification.trim()].join("\n")
    : "";
  return [
    FACET_UI_STYLE_BLOCK,
    styleExtra ?? "",
    "",
    "SUBJECT (HOTEL REVIEW FACET):",
    `Facet key: ${facetKey}`,
    `Category: ${amenityId}`,
    `Facet: ${facet}`,
    `Illustrate this specific object: ${objectInstruction}`,
    scaleHint,
    "",
    "Do not draw walls, floor tiles, or full room outlines—only the isolated furniture/fixture object.",
  ].join("\n");
}

/**
 * Builds a prompt for isolated single-element generation.
 */
export function buildElementPrompt(
  roomItem: RoomItem,
  styleSpecification: string,
  mode: ElementImagePromptMode
): string {
  const itemBlock = `Element data JSON: ${JSON.stringify(roomItem)}`;

  if (mode === "style-edit") {
    return [
      "STYLE-LOCKED ELEMENT: the attached reference image defines drawing style only.",
      "Match stroke color/weight, paper texture, and sketch tone from the reference.",
      "Do NOT redraw the reference object; create ONE new isolated object described below.",
      "",
      "Written style notes:",
      styleSpecification,
      "",
      itemBlock,
      "",
      "Output constraints:",
      "- top-down orthographic view",
      "- object centered on fully transparent background (PNG alpha); no paper fill behind the object",
      "- no text labels",
      "- preserve approximate proportions from width/height fields",
    ].join("\n");
  }

  return [
    "Generate a single isolated top-down room element illustration.",
    "Default style: hand-drawn architectural sketch, clean linework, light paper texture.",
    "Output constraints:",
    "- object centered on fully transparent background (PNG alpha)",
    "- top-down view only",
    "- no text labels in final image",
    "- preserve proportions from provided dimensions",
    "",
    itemBlock,
    "",
    "Written style specification:",
    styleSpecification,
  ].join("\n");
}
