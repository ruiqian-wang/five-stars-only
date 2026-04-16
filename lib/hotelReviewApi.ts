/**
 * Hotel review follow-up API (proxied by Vite to the same backend as /api/generate-room-image).
 */

export type StayReviewGuestProfile = {
  travelerType?: string;
  hasChildren?: boolean;
  hasDietaryRestrictions?: boolean;
  broughtCar?: boolean;
  needsAirportShuttle?: boolean;
  usedBreakfast?: boolean;
  lateArrival?: boolean;
  mobilityNeeds?: boolean;
  usedParking?: boolean;
};

export type StayReviewInteractionType =
  | "likert_5"
  | "single_choice"
  | "multi_select"
  | "nps_10";

/** Present when `useAi` reranking succeeded for this row. */
export type StayReviewAiSelection = {
  facetKey: string;
  rationale: string;
  profileFit: "strong" | "medium" | "weak";
  mustAsk: boolean;
  personalizedQuestion: string;
  interactionType: StayReviewInteractionType;
  commentPlaceholder: string;
  rank: number;
};

export type StayReviewCandidate = {
  property_id?: string;
  amenity_id: string;
  facet: string;
  state: string;
  score: number;
  question_text: string;
  options?: { label: string; value: string }[];
  /** When set (by server), drives stars vs choice UI. */
  interaction_type?: StayReviewInteractionType;
  comment_placeholder?: string;
  debug?: unknown;
  ai?: StayReviewAiSelection;
  ai_error?: string;
};

export type StayReviewPerQuestionPayload = {
  areaId: string;
  roomItemId: string;
  questionText: string;
  facetKey?: string;
  amenity_id?: string;
  facet?: string;
  interactionType: StayReviewInteractionType;
  answerValue: string | null;
  comment: string;
};

export type StayReviewSubmission = {
  sessionId: string;
  questions: StayReviewPerQuestionPayload[];
  overallComment: string;
};

export type HotelPropertyRow = {
  property_id: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
};

/**
 * Prefer `VITE_HOTEL_REVIEW_PROPERTY_ID` when set; otherwise use the first row from GET /properties.
 */
export async function resolveHotelReviewPropertyId(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_HOTEL_REVIEW_PROPERTY_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const rows = await fetchHotelReviewProperties();
    return rows[0]?.property_id ?? null;
  } catch {
    return null;
  }
}

export async function fetchHotelReviewProperties(): Promise<HotelPropertyRow[]> {
  const res = await fetch("/api/hotel-review/v1/properties");
  if (!res.ok) {
    throw new Error(`Hotel review properties request failed: ${res.status}`);
  }
  return (await res.json()) as HotelPropertyRow[];
}

export async function fetchStayReviewCandidates(
  propertyId: string,
  body: {
    draftText?: string;
    askedFacets?: string[];
    guestProfile?: StayReviewGuestProfile;
    limit?: number;
    useAi?: boolean;
  } = {}
): Promise<StayReviewCandidate[]> {
  const res = await fetch(`/api/hotel-review/v1/properties/${encodeURIComponent(propertyId)}/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftText: body.draftText ?? "",
      askedFacets: body.askedFacets ?? [],
      guestProfile: body.guestProfile ?? {},
      limit: body.limit ?? 8,
      useAi: body.useAi ?? true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Candidates request failed: ${res.status}`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Candidates response was not an array");
  }
  return data as StayReviewCandidate[];
}

export async function postStayReviewFollowupAnswer(body: {
  property_id: string;
  review_session_id?: string | null;
  amenity_id: string;
  facet: string;
  question_text: string;
  answer_value?: string | null;
  answer_text?: string | null;
}): Promise<void> {
  const res = await fetch("/api/hotel-review/v1/followup-answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `followup-answers failed: ${res.status}`);
  }
}
