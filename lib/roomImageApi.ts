/**
 * Calls the Node backend (proxied by Vite at /api). Never uses OPENAI_API_KEY in the browser.
 */
import type { RoomGenerationInput, RoomItem } from "@/lib/roomGenerationTypes";
import type { StyleVariant } from "@/lib/roomLayoutVariant";

export type GenerateRoomImageSuccess = {
  success: true;
  prompt: string;
  imageBase64: string;
  mimeType: string;
};

export type GenerateRoomImageFailure = {
  success: false;
  error?: string;
};

export type GenerateRoomImageResponse = GenerateRoomImageSuccess | GenerateRoomImageFailure;

export async function fetchGeneratedRoomImage(
  body: Partial<RoomGenerationInput> = {}
): Promise<GenerateRoomImageSuccess> {
  const res = await fetch("/api/generate-room-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GenerateRoomImageResponse;

  if (!res.ok || data.success !== true) {
    const msg =
      data.success === false ? data.error ?? res.statusText : res.statusText;
    throw new Error(msg || "Room image request failed");
  }

  if (!data.imageBase64 || !data.mimeType) {
    throw new Error("Response missing image data");
  }

  return data;
}

export async function fetchGeneratedRoomElementImage(body: {
  roomItem: RoomItem;
  roomStructure?: RoomGenerationInput["roomStructure"];
  /** When set, backend uses facet-driven floor-plan UI prompt (see elementPromptBuilder). */
  facetKey?: string;
  /** Maps to `pic/style1.png` / `pic/style2.png` on the server for element style. */
  styleVariant?: StyleVariant;
}): Promise<GenerateRoomImageSuccess> {
  const res = await fetch("/api/generate-room-element", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GenerateRoomImageResponse;

  if (!res.ok || data.success !== true) {
    const msg =
      data.success === false ? data.error ?? res.statusText : res.statusText;
    throw new Error(msg || "Room element image request failed");
  }

  if (!data.imageBase64 || !data.mimeType) {
    throw new Error("Element response missing image data");
  }

  return data;
}
