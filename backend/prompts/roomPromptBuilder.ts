import type { RoomStructure } from "../types/room";

/** `style-edit` = reference image is passed into `images.edit` with high input fidelity. */
export type RoomImagePromptMode = "generate" | "style-edit";

/**
 * Builds a deterministic prompt for full-room floor plan generation.
 * Keep this centralized so prompt tuning does not affect route logic.
 */
export function buildRoomPrompt(
  roomStructure: RoomStructure,
  styleSpecification: string,
  mode: RoomImagePromptMode
): string {
  const structureBlock = [
    `Room metadata: id=${roomStructure.roomId}, type=${roomStructure.roomType}, width=${roomStructure.width}, height=${roomStructure.height}`,
    `Structure frame JSON: ${JSON.stringify(roomStructure.frame)}`,
  ].join("\n");

  if (mode === "style-edit") {
    return [
      "STYLE-LOCKED GENERATION: the attached reference image is the ONLY authority for visual style.",
      "Copy from the reference: line weight, ink/wall color, paper tone and texture, sketch looseness, door swing arcs, window marks, and overall illustration language.",
      "Do NOT copy from the reference: room geometry, wall topology, furniture layout, or any text/labels.",
      "Draw a brand-new top-down floor plan that follows ONLY the layout data below.",
      "",
      "Written style notes (must agree with the reference; use as checklist):",
      styleSpecification,
      "",
      "Layout data (authoritative geometry for room shell):",
      structureBlock,
      "",
      "Output constraints:",
      "- top-down orthographic view (no perspective / isometric)",
      "- produce ONLY the room framework: outer walls, inner partitions, doors, openings, windows, and simple zone boundaries",
      "- STRICTLY DO NOT draw furniture or fixtures (no bed/sofa/table/sink/fridge/cabinets/appliances)",
      "- furniture metadata is intentionally NOT provided; do not hallucinate furniture",
      "- keep the drawing readable and uncluttered",
      "- no text labels in the final image",
    ].join("\n");
  }

  return [
    "Generate a top-down floor plan illustration.",
    "Default style target: hand-drawn architectural sketch, clean linework, light paper texture, warm wall strokes.",
    "If written style notes below conflict with defaults, follow the written notes.",
    "Output constraints:",
    "- top-down orthographic view (no perspective/isometric)",
    "- clear room boundaries and doors",
    "- generate ONLY structural framework (walls, partitions, openings, windows, door arcs, zone outlines)",
    "- STRICTLY exclude all furniture/fixtures/appliances",
    "- keep image uncluttered and readable",
    "- no text labels in final image",
    "",
    structureBlock,
    "",
    "Written style specification:",
    styleSpecification,
  ].join("\n");
}
