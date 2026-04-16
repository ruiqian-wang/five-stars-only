import type { RoomItem } from "@/lib/roomGenerationTypes";

type CachedElementImage = {
  roomItem: RoomItem;
  dataUrl: string;
};

export type CachedRoomComposition = {
  shellDataUrl: string;
  elementImages: CachedElementImage[];
  savedAt: number;
};

/**
 * Persist generated room composition (shell + per-item overlays) across page reloads.
 * Uses sessionStorage (~5MB limit). If payload is too large, cache is skipped safely.
 */
const STORAGE_KEY = "five-stars-only:room-composition-v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_CHARS = 4_500_000;

export function readRoomCompositionCache(): CachedRoomComposition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedRoomComposition>;
    if (
      typeof parsed.shellDataUrl !== "string" ||
      !parsed.shellDataUrl.startsWith("data:image/") ||
      !Array.isArray(parsed.elementImages) ||
      typeof parsed.savedAt !== "number"
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as CachedRoomComposition;
  } catch {
    return null;
  }
}

export function writeRoomCompositionCache(payload: {
  shellDataUrl: string;
  elementImages: CachedElementImage[];
}): void {
  if (typeof window === "undefined") return;
  try {
    const value: CachedRoomComposition = {
      shellDataUrl: payload.shellDataUrl,
      elementImages: payload.elementImages,
      savedAt: Date.now(),
    };
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_PAYLOAD_CHARS) return;
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // QuotaExceeded, private mode, etc.
  }
}

export function clearRoomCompositionCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Legacy names kept for HMR / stale bundles that still import the old API.
 * Prefer `readRoomCompositionCache` / `writeRoomCompositionCache`.
 */
export function readFloorPlanCache(): string | null {
  const cached = readRoomCompositionCache();
  return cached?.shellDataUrl ?? null;
}

export function writeFloorPlanCache(shellDataUrl: string): void {
  const existing = readRoomCompositionCache();
  writeRoomCompositionCache({
    shellDataUrl,
    elementImages: existing?.elementImages ?? [],
  });
}

export function clearFloorPlanCache(): void {
  clearRoomCompositionCache();
}
