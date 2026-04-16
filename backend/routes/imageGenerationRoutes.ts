import { Router } from "express";
import { MOCK_ROOM_ELEMENT, MOCK_ROOM_STRUCTURE } from "../mock/mockRoomData";
import { resolveStyleReferenceForRequest } from "../services/loadDefaultStyleReference";
import {
  generateFullRoomImage,
  generateRoomElementImage,
} from "../services/openaiImageService";
import type { RoomItem, RoomStructure, RoomStructureElement, StyleReference } from "../types/room";

const router = Router();

function isRoomItem(value: unknown): value is RoomItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RoomItem>;
  return (
    typeof item.id === "string" &&
    typeof item.type === "string" &&
    typeof item.label === "string" &&
    typeof item.x === "number" &&
    typeof item.y === "number" &&
    typeof item.width === "number" &&
    typeof item.height === "number"
  );
}

function isRoomStructureElement(value: unknown): value is RoomStructureElement {
  if (!value || typeof value !== "object") return false;
  const element = value as Partial<RoomStructureElement>;
  return (
    typeof element.id === "string" &&
    typeof element.elementType === "string" &&
    typeof element.x === "number" &&
    typeof element.y === "number" &&
    typeof element.width === "number" &&
    typeof element.height === "number" &&
    (element.rotation === undefined || typeof element.rotation === "number") &&
    (element.label === undefined || typeof element.label === "string")
  );
}

function isRoomStructure(value: unknown): value is RoomStructure {
  if (!value || typeof value !== "object") return false;
  const layout = value as Partial<RoomStructure>;
  return (
    typeof layout.roomId === "string" &&
    typeof layout.roomType === "string" &&
    typeof layout.width === "number" &&
    typeof layout.height === "number" &&
    Array.isArray(layout.frame) &&
    layout.frame.every(isRoomStructureElement)
  );
}

/**
 * Backward-compatible parser: if older payload sends roomLayout with `items`,
 * we ignore `items` and only keep structural metadata to prevent furniture bleed.
 */
function parseRoomStructureFromBody(value: unknown): RoomStructure | undefined {
  if (isRoomStructure(value)) return value;
  if (!value || typeof value !== "object") return undefined;

  const legacy = value as Partial<{
    roomId: string;
    roomType: string;
    width: number;
    height: number;
  }>;

  if (
    typeof legacy.roomId === "string" &&
    typeof legacy.roomType === "string" &&
    typeof legacy.width === "number" &&
    typeof legacy.height === "number"
  ) {
    return {
      roomId: legacy.roomId,
      roomType: legacy.roomType,
      width: legacy.width,
      height: legacy.height,
      frame: [],
    };
  }

  return undefined;
}

function parseStyleReference(value: unknown): StyleReference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const style = value as Partial<StyleReference>;
  if (!style.imageBase64 || typeof style.imageBase64 !== "string") return undefined;
  if (style.mimeType && typeof style.mimeType !== "string") return undefined;
  return {
    imageBase64: style.imageBase64,
    mimeType: style.mimeType,
  };
}

/**
 * POST /api/generate-room-image
 * body: { roomStructure?: RoomStructure, roomItems?: RoomItem[], styleReference?: StyleReference }
 */
router.post("/generate-room-image", async (req, res) => {
  try {
    const roomStructure =
      parseRoomStructureFromBody(req.body?.roomStructure) ??
      parseRoomStructureFromBody(req.body?.roomLayout) ?? // legacy payload compatibility
      MOCK_ROOM_STRUCTURE;
    const styleReference = resolveStyleReferenceForRequest(req.body ?? {});

    const result = await generateFullRoomImage(roomStructure, styleReference);

    res.json({
      success: true,
      prompt: result.prompt,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/generate-room-element
 * body: { roomItem?: RoomItem, styleReference?: StyleReference }
 */
router.post("/generate-room-element", async (req, res) => {
  try {
    const candidateItem = req.body?.roomItem;
    const roomItem = isRoomItem(candidateItem) ? candidateItem : MOCK_ROOM_ELEMENT;
    const facetKeyRaw = req.body?.facetKey;
    const facetKey =
      typeof facetKeyRaw === "string" && facetKeyRaw.trim() ? facetKeyRaw.trim() : undefined;

    const styleReference = resolveStyleReferenceForRequest(req.body ?? {});

    const result = await generateRoomElementImage(roomItem, styleReference, { facetKey });

    res.json({
      success: true,
      prompt: result.prompt,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
