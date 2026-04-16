export type RoomItem = {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoomStructureElement = {
  id: string;
  /**
   * outer-wall | inner-wall | door | window | opening | zone
   */
  elementType: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type RoomStructure = {
  roomId: string;
  roomType: string;
  width: number;
  height: number;
  frame: RoomStructureElement[];
};

/**
 * Optional combined payload shape for callers that manage both tracks.
 * - roomStructure feeds /api/generate-room-image
 * - roomItems feed /api/generate-room-element
 */
export type RoomGenerationInput = {
  roomStructure: RoomStructure;
  roomItems: RoomItem[];
};

export type StyleReference = {
  /**
   * Base64-encoded image payload without data URL prefix.
   * Example: "iVBORw0KGgoAAAANS..."
   */
  imageBase64: string;
  /**
   * Mime type of style image. Defaults to image/png if omitted.
   */
  mimeType?: string;
};
