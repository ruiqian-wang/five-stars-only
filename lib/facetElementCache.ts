type CachedFacetElements = {
  version: 1;
  savedAt: number;
  items: Array<{ facetKey: string; roomItemId: string; dataUrl: string }>;
};

/** Bump when generated asset format changes (e.g. transparent PNG). */
const STORAGE_KEY = "five-stars-only:facet-element-images-v2";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_CHARS = 4_500_000;

export function readFacetElementCache(): CachedFacetElements | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedFacetElements>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.items) ||
      typeof parsed.savedAt !== "number"
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

export function writeFacetElementCache(payload: { items: CachedFacetElements["items"] }): void {
  if (typeof window === "undefined") return;
  try {
    const value: CachedFacetElements = {
      version: 1,
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
