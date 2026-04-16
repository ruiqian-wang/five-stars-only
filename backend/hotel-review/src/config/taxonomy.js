export const TAXONOMY = {
  PARKING: {
    included: {
      questionText: "Was parking free, or did it cost extra?",
      options: [
        { label: "Free", value: "included" },
        { label: "Cost extra", value: "surcharge" },
        { label: "No parking", value: "not_available" },
        { label: "Didn't use it", value: "not_applicable" },
      ],
      expectedRate: 0.02,
      ttlDays: 180,
      businessImportance: 0.9,
      answerability: 0.9,
      audience: { requiresOneOf: ["broughtCar", "usedParking"] },
    },
    entrance_findability: {
      questionText: "Was the parking entrance easy to find?",
      options: [
        { label: "Easy to find", value: "easy" },
        { label: "Hard to find", value: "hard" },
        { label: "Didn't use it", value: "not_applicable" },
      ],
      expectedRate: 0.01,
      ttlDays: 240,
      businessImportance: 0.6,
      answerability: 0.8,
      audience: { requiresOneOf: ["broughtCar", "usedParking"] },
    },
  },
  ROOM_CLEANLINESS: {
    surfaces_clean: {
      questionText: "Were the floors, surfaces, and furniture clean?",
      options: [
        { label: "Clean", value: "yes" },
        { label: "Not clean", value: "no" },
      ],
      expectedRate: 0.02,
      ttlDays: 90,
      businessImportance: 0.95,
      answerability: 0.95,
    },
    bedding_clean: {
      questionText: "Did the bedding feel fresh and clean?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      expectedRate: 0.02,
      ttlDays: 90,
      businessImportance: 0.95,
      answerability: 0.95,
    },
    odor: {
      questionText: "Did the room have any unpleasant smell, such as smoke or mold?",
      options: [
        { label: "No unpleasant smell", value: "no_odor" },
        { label: "Smoke smell", value: "smoke" },
        { label: "Mold / musty smell", value: "mold" },
        { label: "Other unpleasant smell", value: "other_odor" },
      ],
      expectedRate: 0.01,
      ttlDays: 90,
      businessImportance: 0.9,
      answerability: 0.95,
    },
  },
  ROOM_EXPERIENCE: {
    hair_dryer: {
      questionText: "Was a hair dryer provided?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.45,
      answerability: 0.85,
    },
    body_wash: {
      questionText: "Was body wash provided?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.4,
      answerability: 0.8,
    },
    water_bottles: {
      questionText: "Were complimentary bottles of water provided?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.5,
      answerability: 0.85,
    },
    toiletries: {
      questionText: "Were disposable toiletries and a comb provided?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Partially", value: "partial" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.45,
      answerability: 0.8,
    },
  },
  BED_SLEEP: {
    pillow_count: {
      questionText: "How many pillows were provided in the room?",
      options: [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3+", value: "3_plus" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.35,
      answerability: 0.75,
    },
    pillow_options: {
      questionText: "Were alternative pillow options available, such as latex or down pillows?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.35,
      answerability: 0.65,
    },
    turndown_service: {
      questionText: "Was turndown service available?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.3,
      answerability: 0.75,
    },
    light_blocking: {
      questionText: "Did the curtains block enough light at night or early in the morning?",
      options: [
        { label: "Yes", value: "good" },
        { label: "No", value: "poor" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.7,
      answerability: 0.85,
    },
  },
  NOISE: {
    external_noise: {
      questionText: "Could you hear noise from the hallway, nearby rooms, or outside?",
      options: [
        { label: "Quiet enough", value: "quiet" },
        { label: "Some noise", value: "some_noise" },
        { label: "Too noisy", value: "too_noisy" },
      ],
      expectedRate: 0.02,
      ttlDays: 120,
      businessImportance: 0.9,
      answerability: 0.95,
      audience: { boostIf: ["travelerType:business"] },
    },
    hvac_noise: {
      questionText: "Was the air conditioning or heating too noisy?",
      options: [
        { label: "Not noisy", value: "quiet" },
        { label: "A bit noisy", value: "some_noise" },
        { label: "Too noisy", value: "too_noisy" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.75,
      answerability: 0.9,
      audience: { boostIf: ["travelerType:business"] },
    },
  },
  ROOM_INFRA: {
    lighting: {
      questionText: "Was the lighting bright enough?",
      options: [
        { label: "Yes", value: "good" },
        { label: "No", value: "poor" },
      ],
      expectedRate: 0.01,
      ttlDays: 240,
      businessImportance: 0.55,
      answerability: 0.9,
    },
    hvac_working: {
      questionText: "Did the air conditioning or heating work properly?",
      options: [
        { label: "Yes", value: "working" },
        { label: "No", value: "not_working" },
      ],
      expectedRate: 0.02,
      ttlDays: 120,
      businessImportance: 0.9,
      answerability: 0.95,
    },
    wifi_available: {
      questionText: "Did this hotel offer Wi-Fi?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.8,
      answerability: 0.95,
      audience: { boostIf: ["travelerType:business"] },
    },
    wifi_fee: {
      questionText: "Did Wi-Fi require an extra fee?",
      options: [
        { label: "Free", value: "included" },
        { label: "Extra fee", value: "surcharge" },
        { label: "No Wi-Fi", value: "not_available" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.85,
      answerability: 0.9,
      audience: { boostIf: ["travelerType:business"] },
    },
  },
  ROOM_SERVICE: {
    breakfast_included: {
      questionText: "Was breakfast included in the rate?",
      options: [
        { label: "Included", value: "included" },
        { label: "Cost extra", value: "surcharge" },
        { label: "No breakfast", value: "not_available" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.02,
      ttlDays: 120,
      businessImportance: 0.95,
      answerability: 0.85,
      audience: { penalizeIf: ["usedBreakfast:false"], boostIf: ["usedBreakfast:true"] },
    },
    dietary_options: {
      questionText: "Were there options for children or guests with dietary restrictions?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.6,
      answerability: 0.7,
      audience: {
        requiresOneOf: ["hasChildren", "hasDietaryRestrictions"],
        penalizeIf: ["usedBreakfast:false"],
      },
    },
    late_food: {
      questionText: "Were room service or late-night food options available?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.65,
      answerability: 0.75,
      audience: { boostIf: ["lateArrival:true"] },
    },
  },
  HOTEL_INFRA: {
    elevator: {
      questionText: "Does the hotel have an elevator?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.5,
      answerability: 0.8,
      audience: { boostIf: ["mobilityNeeds:true", "hasChildren:true"] },
    },
    luggage_storage: {
      questionText: "Does the hotel offer luggage storage?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 365,
      businessImportance: 0.55,
      answerability: 0.75,
    },
    shuttle: {
      questionText: "Does the hotel provide a shuttle to the airport or major theme parks, and is there an extra charge?",
      options: [
        { label: "Yes, free", value: "available_included" },
        { label: "Yes, costs extra", value: "available_surcharge" },
        { label: "No shuttle", value: "not_available" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.02,
      ttlDays: 120,
      businessImportance: 0.9,
      answerability: 0.8,
      audience: { penalizeIf: ["broughtCar:true"], boostIf: ["needsAirportShuttle:true"] },
    },
    public_transport: {
      questionText: "Are there public transportation stops near the hotel?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "Not sure", value: "unknown" },
      ],
      expectedRate: 0.01,
      ttlDays: 240,
      businessImportance: 0.6,
      answerability: 0.75,
      audience: { penalizeIf: ["broughtCar:true"], boostIf: ["broughtCar:false"] },
    },
    nearby_restaurants: {
      questionText: "What are the restaurants like near the hotel?",
      options: [
        { label: "Convenient / good variety", value: "good" },
        { label: "Limited options", value: "limited" },
        { label: "Not good", value: "poor" },
        { label: "Didn't try them", value: "not_applicable" },
      ],
      expectedRate: 0.01,
      ttlDays: 180,
      businessImportance: 0.55,
      answerability: 0.7,
    },
  },
};

export const AMENITY_FACETS = Object.fromEntries(
  Object.entries(TAXONOMY).map(([amenityId, facets]) => [amenityId, Object.keys(facets)]),
);

export const FACET_CONFIG = Object.fromEntries(
  Object.entries(TAXONOMY).flatMap(([amenityId, facets]) =>
    Object.entries(facets).map(([facet, cfg]) => [`${amenityId}:${facet}`, cfg]),
  ),
);

export function getFacetConfig(amenityId, facet) {
  return FACET_CONFIG[`${amenityId}:${facet}`] || null;
}
