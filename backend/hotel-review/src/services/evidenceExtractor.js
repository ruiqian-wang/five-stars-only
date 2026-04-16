import { normalizeText } from "../utils/text.js";

export const EXTRACTOR_VERSION = "rules_v3_node";

function findAny(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function append(out, seen, record) {
  const key = `${record.amenity_id}|${record.facet}|${record.polarity}|${record.value || ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(record);
}

export function extractReviewEvidence(text) {
  const t = normalizeText(text);
  const out = [];
  const seen = new Set();

  if (t.includes("parking")) {
    let match = findAny(t, [/paid parking/, /parking fee/, /had to pay for parking/, /parking cost/]);
    if (match) {
      append(out, seen, { amenity_id: "PARKING", facet: "included", polarity: "neg", confidence: 0.82, evidence_text: match, value: "surcharge" });
    } else {
      match = findAny(t, [/free parking/, /parking was free/, /complimentary parking/]);
      if (match) append(out, seen, { amenity_id: "PARKING", facet: "included", polarity: "pos", confidence: 0.82, evidence_text: match, value: "included" });
    }

    match = findAny(t, [/hard to find the parking entrance/, /parking entrance was hard to find/]);
    if (match) {
      append(out, seen, { amenity_id: "PARKING", facet: "entrance_findability", polarity: "neg", confidence: 0.82, evidence_text: match, value: "hard" });
    } else {
      match = findAny(t, [/parking entrance easy to find/, /easy to find parking entrance/]);
      if (match) append(out, seen, { amenity_id: "PARKING", facet: "entrance_findability", polarity: "pos", confidence: 0.82, evidence_text: match, value: "easy" });
    }
  }

  let match = findAny(t, [/dirty room/, /room was dirty/, /dusty/, /sticky floor/, /stained furniture/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "surfaces_clean", polarity: "neg", confidence: 0.82, evidence_text: match, value: "no" });
  } else {
    match = findAny(t, [/clean room/, /room was clean/, /spotless room/]);
    if (match) append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "surfaces_clean", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });
  }

  match = findAny(t, [/dirty sheets/, /stained sheets/, /bedding smelled bad/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "bedding_clean", polarity: "neg", confidence: 0.82, evidence_text: match, value: "no" });
  } else {
    match = findAny(t, [/clean bedding/, /fresh bedding/, /fresh sheets/]);
    if (match) append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "bedding_clean", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });
  }

  match = findAny(t, [/smoke smell/, /smelled like smoke/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "odor", polarity: "neg", confidence: 0.82, evidence_text: match, value: "smoke" });
  } else {
    match = findAny(t, [/mold smell/, /musty smell/, /mildew smell/]);
    if (match) {
      append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "odor", polarity: "neg", confidence: 0.82, evidence_text: match, value: "mold" });
    } else {
      match = findAny(t, [/no smell/, /no odor/, /fresh smelling room/, /room smelled fresh/]);
      if (match) append(out, seen, { amenity_id: "ROOM_CLEANLINESS", facet: "odor", polarity: "pos", confidence: 0.82, evidence_text: match, value: "no_odor" });
    }
  }

  match = findAny(t, [/no hair dryer/, /hair dryer missing/, /hairdryer missing/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_EXPERIENCE", facet: "hair_dryer", polarity: "neg", confidence: 0.82, evidence_text: match, value: "no" });
  } else {
    match = findAny(t, [/hair dryer/, /hairdryer/]);
    if (match) append(out, seen, { amenity_id: "ROOM_EXPERIENCE", facet: "hair_dryer", polarity: "pos", confidence: 0.74, evidence_text: match, value: "yes" });
  }

  match = findAny(t, [/no body wash/, /body wash missing/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_EXPERIENCE", facet: "body_wash", polarity: "neg", confidence: 0.82, evidence_text: match, value: "no" });
  } else {
    match = findAny(t, [/body wash provided/, /had body wash/]);
    if (match) append(out, seen, { amenity_id: "ROOM_EXPERIENCE", facet: "body_wash", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });
  }

  match = findAny(t, [/complimentary water/, /free water bottles/, /bottled water provided/]);
  if (match) append(out, seen, { amenity_id: "ROOM_EXPERIENCE", facet: "water_bottles", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });

  match = findAny(t, [/toiletries provided/, /comb provided/]);
  if (match) append(out, seen, { amenity_id: "ROOM_EXPERIENCE", facet: "toiletries", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });

  const pillowMatch = t.match(/\b(\d+)\s+pillows?\b/);
  if (pillowMatch) {
    const count = Number(pillowMatch[1]);
    append(out, seen, { amenity_id: "BED_SLEEP", facet: "pillow_count", polarity: "pos", confidence: 0.82, evidence_text: pillowMatch[0], value: count >= 3 ? "3_plus" : String(count) });
  }

  match = findAny(t, [/light came through the curtains/, /curtains did not block light/]);
  if (match) {
    append(out, seen, { amenity_id: "BED_SLEEP", facet: "light_blocking", polarity: "neg", confidence: 0.82, evidence_text: match, value: "poor" });
  } else {
    match = findAny(t, [/blackout curtains/, /curtains blocked light/]);
    if (match) append(out, seen, { amenity_id: "BED_SLEEP", facet: "light_blocking", polarity: "pos", confidence: 0.82, evidence_text: match, value: "good" });
  }

  match = findAny(t, [/hallway noise/, /noise from hallway/, /street noise/, /neighbors were noisy/, /outside noise/]);
  if (match) {
    append(out, seen, { amenity_id: "NOISE", facet: "external_noise", polarity: "neg", confidence: 0.82, evidence_text: match, value: "too_noisy" });
  } else {
    match = findAny(t, [/quiet room/, /very quiet at night/]);
    if (match) append(out, seen, { amenity_id: "NOISE", facet: "external_noise", polarity: "pos", confidence: 0.82, evidence_text: match, value: "quiet" });
  }

  match = findAny(t, [/loud air conditioning/, /noisy ac/, /heater was noisy/]);
  if (match) {
    append(out, seen, { amenity_id: "NOISE", facet: "hvac_noise", polarity: "neg", confidence: 0.82, evidence_text: match, value: "too_noisy" });
  } else {
    match = findAny(t, [/quiet ac/, /air conditioning was quiet/, /heater was quiet/]);
    if (match) append(out, seen, { amenity_id: "NOISE", facet: "hvac_noise", polarity: "pos", confidence: 0.82, evidence_text: match, value: "quiet" });
  }

  match = findAny(t, [/dim lighting/, /too dark/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_INFRA", facet: "lighting", polarity: "neg", confidence: 0.82, evidence_text: match, value: "poor" });
  } else {
    match = findAny(t, [/good lighting/, /bright room/]);
    if (match) append(out, seen, { amenity_id: "ROOM_INFRA", facet: "lighting", polarity: "pos", confidence: 0.82, evidence_text: match, value: "good" });
  }

  match = findAny(t, [/ac broken/, /heater broken/, /air conditioning did not work/, /heating did not work/]);
  if (match) {
    append(out, seen, { amenity_id: "ROOM_INFRA", facet: "hvac_working", polarity: "neg", confidence: 0.82, evidence_text: match, value: "not_working" });
  } else {
    match = findAny(t, [/ac worked/, /heater worked/, /temperature control worked/]);
    if (match) append(out, seen, { amenity_id: "ROOM_INFRA", facet: "hvac_working", polarity: "pos", confidence: 0.82, evidence_text: match, value: "working" });
  }

  if (t.includes("wifi") || t.includes("wi-fi")) {
    match = findAny(t, [/no wifi/, /wifi unavailable/, /wi-fi unavailable/]);
    if (match) {
      append(out, seen, { amenity_id: "ROOM_INFRA", facet: "wifi_available", polarity: "neg", confidence: 0.82, evidence_text: match, value: "no" });
    } else {
      append(out, seen, { amenity_id: "ROOM_INFRA", facet: "wifi_available", polarity: "pos", confidence: 0.70, evidence_text: "wifi mentioned", value: "yes" });
    }

    match = findAny(t, [/paid wifi/, /wifi fee/, /had to pay for wifi/, /premium internet/]);
    if (match) {
      append(out, seen, { amenity_id: "ROOM_INFRA", facet: "wifi_fee", polarity: "neg", confidence: 0.82, evidence_text: match, value: "surcharge" });
    } else {
      match = findAny(t, [/free wifi/, /free wi-fi/, /wifi included/, /wi-fi included/]);
      if (match) append(out, seen, { amenity_id: "ROOM_INFRA", facet: "wifi_fee", polarity: "pos", confidence: 0.82, evidence_text: match, value: "included" });
    }
  }

  if (t.includes("breakfast")) {
    match = findAny(t, [/paid breakfast/, /breakfast cost/, /breakfast not included/]);
    if (match) {
      append(out, seen, { amenity_id: "ROOM_SERVICE", facet: "breakfast_included", polarity: "neg", confidence: 0.82, evidence_text: match, value: "surcharge" });
    } else {
      match = findAny(t, [/no breakfast/, /breakfast unavailable/]);
      if (match) {
        append(out, seen, { amenity_id: "ROOM_SERVICE", facet: "breakfast_included", polarity: "neg", confidence: 0.82, evidence_text: match, value: "not_available" });
      } else {
        match = findAny(t, [/breakfast included/, /free breakfast/, /complimentary breakfast/]);
        if (match) append(out, seen, { amenity_id: "ROOM_SERVICE", facet: "breakfast_included", polarity: "pos", confidence: 0.82, evidence_text: match, value: "included" });
      }
    }
  }

  match = findAny(t, [/vegetarian options/, /kids options/, /dietary options/, /gluten free/]);
  if (match) append(out, seen, { amenity_id: "ROOM_SERVICE", facet: "dietary_options", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });

  match = findAny(t, [/room service/, /late night food/, /food available late/]);
  if (match) append(out, seen, { amenity_id: "ROOM_SERVICE", facet: "late_food", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });

  match = findAny(t, [/no elevator/]);
  if (match) {
    append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "elevator", polarity: "neg", confidence: 0.82, evidence_text: match, value: "no" });
  } else {
    match = findAny(t, [/elevator/, /lift/]);
    if (match) append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "elevator", polarity: "pos", confidence: 0.72, evidence_text: match, value: "yes" });
  }

  match = findAny(t, [/luggage storage/, /stored our luggage/]);
  if (match) append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "luggage_storage", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });

  if (t.includes("shuttle")) {
    match = findAny(t, [/no shuttle/, /shuttle unavailable/]);
    if (match) {
      append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "shuttle", polarity: "neg", confidence: 0.82, evidence_text: match, value: "not_available" });
    } else {
      match = findAny(t, [/paid shuttle/, /shuttle fee/]);
      if (match) {
        append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "shuttle", polarity: "neg", confidence: 0.82, evidence_text: match, value: "available_surcharge" });
      } else {
        match = findAny(t, [/free shuttle/]);
        if (match) append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "shuttle", polarity: "pos", confidence: 0.82, evidence_text: match, value: "available_included" });
      }
    }
  }

  match = findAny(t, [/bus stop nearby/, /public transportation nearby/, /metro nearby/, /subway nearby/]);
  if (match) append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "public_transport", polarity: "pos", confidence: 0.82, evidence_text: match, value: "yes" });

  match = findAny(t, [/few restaurants nearby/, /limited dining nearby/]);
  if (match) {
    append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "nearby_restaurants", polarity: "neg", confidence: 0.82, evidence_text: match, value: "limited" });
  } else {
    match = findAny(t, [/good restaurants nearby/, /lots of restaurants nearby/]);
    if (match) append(out, seen, { amenity_id: "HOTEL_INFRA", facet: "nearby_restaurants", polarity: "pos", confidence: 0.82, evidence_text: match, value: "good" });
  }

  return out;
}
