import type { StyleVariant } from "@/lib/roomLayoutVariant";

type CachedFacetElements = {
  version: 2;
  /** Which style sheet was used (`pic/style1.png` / `pic/style2.png`). */
  styleVariant: StyleVariant;
  savedAt: number;
  items: Array<{ facetKey: string; roomItemId: string; dataUrl: string }>;
};

/** Bump when generated asset format or style pairing changes. */
const STORAGE_KEY = "five-stars-only:facet-element-images-v3";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_CHARS = 4_500_000;

export function readFacetElementCache(): CachedFacetElements | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedFacetElements>;
    if (
      parsed.version !== 2 ||
      !Array.isArray(parsed.items) ||
      typeof parsed.savedAt !== "number" ||
      (parsed.styleVariant !== "style1" && parsed.styleVariant !== "style2")
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as CachedFacetElements;
  } catch {
    return null;
  }
}

export function writeFacetElementCache(payload: {
  items: CachedFacetElements["items"];
  styleVariant: StyleVariant;
}): void {
  if (typeof window === "undefined") return;
  try {
    const value: CachedFacetElements = {
      version: 2,
      styleVariant: payload.styleVariant,
      items: payload.items,
      savedAt: Date.now(),
    };
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_PAYLOAD_CHARS) return;
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // quota / private mode
  }
}

export function clearFacetElementCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
