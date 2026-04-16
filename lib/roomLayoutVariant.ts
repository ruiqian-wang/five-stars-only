export type RoomLayoutVariant = "room1" | "room2";

/** Pairs with `pic/style1.png` / `pic/style2.png` on the backend. */
export type StyleVariant = "style1" | "style2";

const STORAGE_KEY = "five-stars-only:room-layout-variant-v1";

export function layoutToStyleVariant(layout: RoomLayoutVariant): StyleVariant {
  return layout === "room2" ? "style2" : "style1";
}

export function readRoomLayoutVariant(): RoomLayoutVariant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === "room1" || raw === "room2") return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeRoomLayoutVariant(layout: RoomLayoutVariant): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // ignore
  }
}
