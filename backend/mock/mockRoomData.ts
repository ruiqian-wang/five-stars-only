import type { RoomItem, RoomStructure } from "../types/room";

/**
 * Structural shell only (no furniture). This is what room-image generation consumes.
 */
export const MOCK_ROOM_STRUCTURE: RoomStructure = {
  roomId: "room-402",
  roomType: "Deluxe Suite",
  width: 900,
  height: 900,
  frame: [
    { id: "fw-outer", elementType: "outer-wall", x: 20, y: 20, width: 860, height: 860 },
    { id: "fw-partition-1", elementType: "inner-wall", x: 280, y: 160, width: 20, height: 260 },
    { id: "fw-partition-2", elementType: "inner-wall", x: 140, y: 420, width: 260, height: 20 },
    { id: "fw-door-main", elementType: "door", x: 760, y: 840, width: 120, height: 40, rotation: 0 },
    { id: "fw-window-1", elementType: "window", x: 520, y: 20, width: 160, height: 16 },
    { id: "zone-sleep", elementType: "zone", label: "sleeping", x: 80, y: 520, width: 340, height: 280 },
    { id: "zone-living", elementType: "zone", label: "living", x: 430, y: 360, width: 380, height: 320 },
  ],
};

/**
 * Furniture/equipment track for single-element generation.
 */
export const MOCK_ROOM_ITEMS: RoomItem[] = [
  { id: "item-bed", type: "bed", label: "King Bed", x: 110, y: 620, width: 220, height: 160 },
  { id: "item-sofa", type: "sofa", label: "Sofa", x: 510, y: 560, width: 230, height: 120 },
  { id: "item-table", type: "table", label: "Coffee Table", x: 545, y: 455, width: 110, height: 80 },
  { id: "item-fridge", type: "fridge", label: "Mini Fridge", x: 160, y: 220, width: 70, height: 70 },
  { id: "item-sink", type: "sink", label: "Sink", x: 270, y: 210, width: 85, height: 55 },
];

export const MOCK_ROOM_ELEMENT: RoomItem = MOCK_ROOM_ITEMS[0];
