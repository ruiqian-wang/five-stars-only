/**
 * Persists room snapshots from "Submit my ratings" as a collection in localStorage.
 */

const V2_KEY = "five-stars-only:profile-room-stickers-v2";
const V1_KEY = "five-stars-only:profile-room-sticker-v1";

const MAX_STICKERS = 30;
/** Rough guard for localStorage quota (~5MB typical). */
const MAX_TOTAL_PAYLOAD_CHARS = 4_200_000;
const MAX_SINGLE_IMAGE_CHARS = 2_000_000;

export type RoomStickerItem = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

function isRoomStickerItem(x: unknown): x is RoomStickerItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.dataUrl === "string" &&
    typeof o.createdAt === "number" &&
    o.dataUrl.startsWith("data:image/")
  );
}

function totalChars(items: RoomStickerItem[]): number {
  return items.reduce((n, i) => n + i.dataUrl.length, 0);
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function writeList(items: RoomStickerItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(items);
    if (serialized.length > MAX_TOTAL_PAYLOAD_CHARS) return;
    localStorage.setItem(V2_KEY, serialized);
  } catch {
    // quota
  }
}

/**
 * Newest first.
 */
export function readProfileRoomStickers(): RoomStickerItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(V2_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const items = parsed.filter(isRoomStickerItem);
        if (items.length > 0) {
          return [...items].sort((a, b) => b.createdAt - a.createdAt);
        }
      }
    }
    // Migrate legacy single image
    const v1 = localStorage.getItem(V1_KEY);
    if (v1?.startsWith("data:image/")) {
      const migrated: RoomStickerItem = {
        id: newId(),
        dataUrl: v1,
        createdAt: Date.now(),
      };
      writeList([migrated]);
      try {
        localStorage.removeItem(V1_KEY);
      } catch {
        // ignore
      }
      return [migrated];
    }
  } catch {
    // ignore
  }
  return [];
}

export function appendProfileRoomSticker(dataUrl: string): void {
  if (typeof window === "undefined") return;
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > MAX_SINGLE_IMAGE_CHARS) return;

  const prev = readProfileRoomStickers();
  let next: RoomStickerItem[] = [
    { id: newId(), dataUrl, createdAt: Date.now() },
    ...prev,
  ].slice(0, MAX_STICKERS);

  while (totalChars(next) > MAX_TOTAL_PAYLOAD_CHARS && next.length > 1) {
    next = next.slice(0, -1);
  }
  if (totalChars(next) > MAX_TOTAL_PAYLOAD_CHARS) return;

  writeList(next);
}

/** @deprecated Use readProfileRoomStickers; returns latest image or null for old call sites. */
export function readProfileRoomSticker(): string | null {
  const items = readProfileRoomStickers();
  return items[0]?.dataUrl ?? null;
}

/** @deprecated Replaces entire collection with one image — prefer appendProfileRoomSticker. */
export function writeProfileRoomSticker(dataUrl: string): void {
  appendProfileRoomSticker(dataUrl);
}

export function clearProfileRoomSticker(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(V2_KEY);
    localStorage.removeItem(V1_KEY);
  } catch {
    // ignore
  }
}
