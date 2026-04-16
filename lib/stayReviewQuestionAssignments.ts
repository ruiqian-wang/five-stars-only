import type { RoomItem } from "@/lib/roomGenerationTypes";
import type { StayReviewCandidate, StayReviewInteractionType } from "@/lib/hotelReviewApi";

/**
 * Preferred backend facets (amenity:facet) per furniture type, in order.
 * Used to align each floor-plan element card with the most relevant follow-up question.
 */
const FACET_PREFERENCES_BY_ITEM_TYPE: Record<string, string[]> = {
  bed: [
    "ROOM_CLEANLINESS:bedding_clean",
    "BED_SLEEP:light_blocking",
    "BED_SLEEP:pillow_count",
    "BED_SLEEP:pillow_options",
    "ROOM_CLEANLINESS:odor",
  ],
  sofa: [
    "ROOM_CLEANLINESS:surfaces_clean",
    "NOISE:external_noise",
    "NOISE:hvac_noise",
    "ROOM_INFRA:lighting",
  ],
  table: ["ROOM_CLEANLINESS:surfaces_clean", "ROOM_EXPERIENCE:water_bottles", "ROOM_INFRA:lighting"],
  sink: [
    "ROOM_EXPERIENCE:body_wash",
    "ROOM_EXPERIENCE:toiletries",
    "ROOM_EXPERIENCE:water_bottles",
    "ROOM_CLEANLINESS:surfaces_clean",
  ],
  fridge: [
    "ROOM_SERVICE:late_food",
    "ROOM_EXPERIENCE:water_bottles",
    "ROOM_SERVICE:breakfast_included",
    "ROOM_CLEANLINESS:odor",
  ],
};

export type AssignedStayQuestion = {
  questionText: string;
  facetKey: string;
  amenity_id: string;
  facet: string;
  state: string;
  interaction_type: StayReviewInteractionType;
  comment_placeholder?: string;
  options?: { label: string; value: string }[];
};

function facetKeyOf(c: StayReviewCandidate): string {
  return `${c.amenity_id}:${c.facet}`;
}

function resolveInteractionType(c: StayReviewCandidate): StayReviewInteractionType {
  if (
    c.interaction_type === "likert_5" ||
    c.interaction_type === "single_choice" ||
    c.interaction_type === "multi_select" ||
    c.interaction_type === "nps_10"
  ) {
    return c.interaction_type;
  }
  const n = c.options?.length ?? 0;
  if (n === 2) return "single_choice";
  if (n >= 6) return "multi_select";
  if (n >= 3) return "single_choice";
  return "likert_5";
}

/**
 * Assigns ranked API candidates to room items (in priority display order).
 * Each room item gets at most one question; leftover candidates are unused.
 */
export function assignCandidatesToRoomItems(
  roomItemsInDisplayOrder: RoomItem[],
  candidates: StayReviewCandidate[]
): Map<string, AssignedStayQuestion> {
  const pool = [...candidates];
  const out = new Map<string, AssignedStayQuestion>();

  for (const item of roomItemsInDisplayOrder) {
    const prefs = FACET_PREFERENCES_BY_ITEM_TYPE[item.type] ?? [];
    let pickIndex = -1;
    for (const key of prefs) {
      const i = pool.findIndex((c) => facetKeyOf(c) === key);
      if (i >= 0) {
        pickIndex = i;
        break;
      }
    }

    let chosen: StayReviewCandidate | undefined;
    if (pickIndex >= 0) {
      chosen = pool.splice(pickIndex, 1)[0];
    } else if (pool.length > 0) {
      chosen = pool.shift();
    }

    if (chosen?.question_text) {
      out.set(item.id, {
        questionText: chosen.question_text,
        facetKey: facetKeyOf(chosen),
        amenity_id: chosen.amenity_id,
        facet: chosen.facet,
        state: chosen.state,
        interaction_type: resolveInteractionType(chosen),
        comment_placeholder: chosen.comment_placeholder,
        options: chosen.options,
      });
    }
  }

  return out;
}
