/**
 * English object instructions for facet-driven floor-plan element icons.
 * Keys: full "AMENITY:facet" or short "facet" when unambiguous.
 */
const FACET_OBJECT: Record<string, string> = {
  // ROOM_CLEANLINESS
  "ROOM_CLEANLINESS:bedding_clean": "a bed with mattress and pillows, top-down view, emphasize bedding surface",
  bedding_clean: "a bed with mattress and pillows, top-down view, emphasize bedding surface",
  "ROOM_CLEANLINESS:surfaces_clean": "a sofa or upholstered seating surface, top-down",
  surfaces_clean: "a sofa or upholstered seating surface, top-down",
  "ROOM_CLEANLINESS:odor": "a compact air freshener or vent grille symbol on furniture, top-down abstract",
  odor: "a compact air freshener or vent grille symbol on furniture, top-down abstract",

  // BED_SLEEP
  "BED_SLEEP:light_blocking": "curtains or blinds rolled above a window strip, top-down schematic",
  light_blocking: "curtains or blinds rolled above a window strip, top-down schematic",
  "BED_SLEEP:pillow_count": "a bed with multiple pillows arranged, top-down",
  pillow_count: "a bed with multiple pillows arranged, top-down",
  "BED_SLEEP:pillow_options": "a single pillow icon with a small swap arrow, top-down schematic",
  pillow_options: "a single pillow icon with a small swap arrow, top-down schematic",

  // NOISE
  "NOISE:external_noise": "a door with a thin noise barrier strip, top-down schematic",
  external_noise: "a door with a thin noise barrier strip, top-down schematic",
  "NOISE:hvac_noise": "a wall vent or AC grille, top-down",
  hvac_noise: "a wall vent or AC grille, top-down",

  // ROOM_INFRA
  "ROOM_INFRA:wifi_available": "a small Wi‑Fi router or signal icon merged with a tabletop, top-down",
  wifi_available: "a small Wi‑Fi router or signal icon merged with a tabletop, top-down",
  "ROOM_INFRA:wifi_fee": "a small Wi‑Fi router with a coin symbol, top-down schematic",
  wifi_fee: "a small Wi‑Fi router with a coin symbol, top-down schematic",
  "ROOM_INFRA:lighting": "a ceiling light fixture circle, top-down",
  lighting: "a ceiling light fixture circle, top-down",
  "ROOM_INFRA:hvac_working": "a thermostat or wall AC unit, top-down",
  hvac_working: "a thermostat or wall AC unit, top-down",

  // ROOM_EXPERIENCE
  "ROOM_EXPERIENCE:water_bottles": "two small water bottles on a surface, top-down",
  water_bottles: "two small water bottles on a surface, top-down",
  "ROOM_EXPERIENCE:toiletries": "toiletries tray with small bottles, top-down",
  toiletries: "toiletries tray with small bottles, top-down",
  "ROOM_EXPERIENCE:body_wash": "a small pump bottle (body wash), top-down",
  body_wash: "a small pump bottle (body wash), top-down",
  "ROOM_EXPERIENCE:hair_dryer": "a compact hair dryer, top-down",
  hair_dryer: "a compact hair dryer, top-down",

  // ROOM_SERVICE
  "ROOM_SERVICE:breakfast_included": "a simple breakfast tray with plate and cup, top-down",
  breakfast_included: "a simple breakfast tray with plate and cup, top-down",
  "ROOM_SERVICE:late_food": "a covered room-service cloche on a tray, top-down",
  late_food: "a covered room-service cloche on a tray, top-down",

  // PARKING
  "PARKING:included": "a single parking space marking with a car silhouette, top-down",
  included: "a single parking space marking with a car silhouette, top-down",

  // Fallback by furniture type (frontend FALLBACK:TYPE)
  "FALLBACK:bed": "a bed with mattress and pillows, top-down",
  "FALLBACK:sofa": "a sofa, top-down",
  "FALLBACK:table": "a coffee table, top-down",
  "FALLBACK:sink": "a bathroom sink basin, top-down",
  "FALLBACK:fridge": "a mini fridge, top-down",
};

export function resolveFacetObjectInstruction(facetKey: string): string {
  const direct = FACET_OBJECT[facetKey];
  if (direct) return direct;
  const short = facetKey.includes(":") ? facetKey.split(":").pop() ?? facetKey : facetKey;
  return FACET_OBJECT[short] ?? `a clear, readable furniture or fixture icon relevant to "${facetKey}", top-down view`;
}
