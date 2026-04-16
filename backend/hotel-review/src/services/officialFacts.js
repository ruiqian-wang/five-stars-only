import { coalesceText, includesAny, joinBlob, normalizeText, parseJsonishArray } from "../utils/text.js";

function asAmenityBlob(row, ...fields) {
  return joinBlob(
    ...fields.flatMap((field) => parseJsonishArray(row[field])),
    row.property_description,
    row.area_description,
    row.popular_amenities_list,
  );
}

function push(records, propertyId, amenityId, facet, officialFact, sourceField, sourceText) {
  records.push({
    property_id: propertyId,
    amenity_id: amenityId,
    facet,
    official_fact: officialFact,
    source_field: sourceField,
    source_text: sourceText || null,
  });
}

export function extractOfficialFacts(row) {
  const propertyId = row.eg_property_id;
  const out = [];

  const parkingBlob = normalizeText(asAmenityBlob(row, "property_amenity_parking"));
  const parkingSource = asAmenityBlob(row, "property_amenity_parking");
  let parkingFact = "not_listed";
  if (includesAny(parkingBlob, [/free .*parking/, /free self parking/, /complimentary parking/, /free covered self parking/, /free uncovered self parking/, /free rv\/bus\/truck parking/, /parking included/])) {
    parkingFact = "included";
  } else if (includesAny(parkingBlob, [/parking .*fee/, /paid parking/, /valet parking/, /parking .*per day/, /offsite parking .* eur/, /offsite parking .* usd/, /offsite parking .* thb/])) {
    parkingFact = "surcharge";
  } else if (includesAny(parkingBlob, [/parking/, /off-street options/, /onsite parking/, /self parking/])) {
    parkingFact = "available";
  }
  push(out, propertyId, "PARKING", "included", parkingFact, "property_amenity_parking", parkingSource);

  const internetBlobRaw = asAmenityBlob(row, "property_amenity_internet");
  const internetBlob = normalizeText(internetBlobRaw);
  let wifiAvailable = "not_listed";
  if (includesAny(internetBlob, [/no wifi/, /wi-fi unavailable/, /wifi unavailable/])) {
    wifiAvailable = "no";
  } else if (includesAny(internetBlob, [/wifi/, /wi-fi/, /wireless internet/])) {
    wifiAvailable = "yes";
  }
  push(out, propertyId, "ROOM_INFRA", "wifi_available", wifiAvailable, "property_amenity_internet", internetBlobRaw);

  let wifiFee = "not_listed";
  if (includesAny(internetBlob, [/free wifi/, /complimentary wireless internet/, /free wi-fi/])) {
    wifiFee = "included";
  } else if (includesAny(internetBlob, [/wifi .*fee/, /paid wifi/, /premium internet/, /internet fee/])) {
    wifiFee = "surcharge";
  } else if (wifiAvailable === "yes") {
    wifiFee = "available";
  }
  push(out, propertyId, "ROOM_INFRA", "wifi_fee", wifiFee, "property_amenity_internet", internetBlobRaw);

  const foodBlobRaw = asAmenityBlob(row, "property_amenity_food_and_drink");
  const foodBlob = normalizeText(foodBlobRaw);
  let breakfast = "not_listed";
  if (includesAny(foodBlob, [/free .*breakfast/, /complimentary breakfast/])) {
    breakfast = "included";
  } else if (includesAny(foodBlob, [/breakfast available for a fee/, /breakfast .* for adults/, /cooked-to-order breakfast available for a fee/, /buffet breakfast available for a fee/])) {
    breakfast = "surcharge";
  } else if (includesAny(foodBlob, [/no breakfast/, /breakfast unavailable/])) {
    breakfast = "not_available";
  } else if (includesAny(foodBlob, [/breakfast/])) {
    breakfast = "available";
  }
  push(out, propertyId, "ROOM_SERVICE", "breakfast_included", breakfast, "property_amenity_food_and_drink", foodBlobRaw);

  const accessibilityRaw = asAmenityBlob(row, "property_amenity_accessibility", "property_amenity_conveniences");
  const accessibilityBlob = normalizeText(accessibilityRaw);
  let elevator = "not_listed";
  if (includesAny(accessibilityBlob, [/does not have elevators/, /no elevator/])) {
    elevator = "no";
  } else if (includesAny(accessibilityBlob, [/\belevator\b/, /lift/])) {
    elevator = "yes";
  }
  push(out, propertyId, "HOTEL_INFRA", "elevator", elevator, "property_amenity_accessibility", accessibilityRaw);

  const shuttleRaw = asAmenityBlob(row, "property_amenity_parking", "property_amenity_family_friendly");
  const shuttleBlob = normalizeText(shuttleRaw);
  let shuttle = "not_listed";
  if (includesAny(shuttleBlob, [/free area shuttle/, /free shopping center shuttle/, /free shuttle/])) {
    shuttle = "available_included";
  } else if (includesAny(shuttleBlob, [/airport shuttle .*surcharge/, /roundtrip airport shuttle \(surcharge\)/, /paid shuttle/, /shuttle fee/])) {
    shuttle = "available_surcharge";
  } else if (includesAny(shuttleBlob, [/\bshuttle\b/])) {
    shuttle = "available";
  }
  push(out, propertyId, "HOTEL_INFRA", "shuttle", shuttle, "property_amenity_parking", shuttleRaw);

  const guestServicesRaw = asAmenityBlob(row, "property_amenity_guest_services");
  const guestServicesBlob = normalizeText(guestServicesRaw);
  push(
    out,
    propertyId,
    "HOTEL_INFRA",
    "luggage_storage",
    includesAny(guestServicesBlob, [/luggage storage/]) ? "yes" : "not_listed",
    "property_amenity_guest_services",
    guestServicesRaw,
  );
  push(
    out,
    propertyId,
    "BED_SLEEP",
    "turndown_service",
    includesAny(guestServicesBlob, [/turndown service/]) ? "yes" : "not_listed",
    "property_amenity_guest_services",
    guestServicesRaw,
  );
  push(
    out,
    propertyId,
    "ROOM_SERVICE",
    "late_food",
    includesAny(normalizeText(foodBlobRaw), [/room service available/, /24-hour room service/, /late-night food/]) ? "yes" : "not_listed",
    "property_amenity_food_and_drink",
    foodBlobRaw,
  );

  const descriptionRaw = coalesceText(row.property_description);
  const descriptionBlob = normalizeText(descriptionRaw);
  push(
    out,
    propertyId,
    "ROOM_EXPERIENCE",
    "hair_dryer",
    includesAny(descriptionBlob, [/hair dryers?/, /hairdryer/]) ? "yes" : "not_listed",
    "property_description",
    descriptionRaw,
  );
  push(
    out,
    propertyId,
    "ROOM_EXPERIENCE",
    "water_bottles",
    includesAny(descriptionBlob, [/complimentary bottled water/, /free water bottles/]) ? "yes" : "not_listed",
    "property_description",
    descriptionRaw,
  );
  push(
    out,
    propertyId,
    "ROOM_EXPERIENCE",
    "toiletries",
    includesAny(descriptionBlob, [/complimentary toiletries/]) ? "yes" : "not_listed",
    "property_description",
    descriptionRaw,
  );

  return out;
}
