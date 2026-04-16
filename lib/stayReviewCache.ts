type CachedStayReviewQuestions = {
  areas: Array<{
    id: string;
    roomItemId: string;
    label: string;
    elementLabel?: string;
    description: string;
    questionText?: string;
    interactionType?: "likert_5" | "single_choice" | "multi_select" | "nps_10";
    choiceOptions?: { label: string; value: string }[];
    commentPlaceholder?: string;
    priority: number;
    facetKey?: string;
    amenity_id?: string;
    facet?: string;
  }>;
  savedAt: number;
};

/** Bump when stay-review card shape or backend fields change. */
const STORAGE_KEY = "five-stars-only:stay-review-questions-v5";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function readStayReviewQuestionsCache(): CachedStayReviewQuestions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedStayReviewQuestions>;
    if (!Array.isArray(parsed.areas) || typeof parsed.savedAt !== "number") {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as CachedStayReviewQuestions;
  } catch {
    return null;
  }
}

export function writeStayReviewQuestionsCache(payload: {
  areas: CachedStayReviewQuestions["areas"];
}): void {
  if (typeof window === "undefined") return;
  try {
    const value: CachedStayReviewQuestions = {
      areas: payload.areas,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

/** Clears cached questions so the next visit refetches (also use if facets feel stuck). */
export function clearStayReviewQuestionsCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
