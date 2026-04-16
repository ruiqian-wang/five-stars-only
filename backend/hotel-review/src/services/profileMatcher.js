export function normalizeGuestProfile(profile = {}) {
  return {
    travelerType: profile.travelerType || "unknown",
    hasChildren: toTriState(profile.hasChildren),
    hasDietaryRestrictions: toTriState(profile.hasDietaryRestrictions),
    broughtCar: toTriState(profile.broughtCar),
    usedParking: toTriState(profile.usedParking),
    usedBreakfast: toTriState(profile.usedBreakfast),
    needsAirportShuttle: toTriState(profile.needsAirportShuttle),
    lateArrival: toTriState(profile.lateArrival),
    mobilityNeeds: toTriState(profile.mobilityNeeds),
  };
}

function toTriState(value) {
  if (value === true || value === false) return value;
  if (value == null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
}

export function applyGuestProfileAdjustments(candidate, guestProfile = {}) {
  const profile = normalizeGuestProfile(guestProfile);
  const facetKey = `${candidate.amenity_id}:${candidate.facet}`;
  const reasons = [];
  let blocked = false;
  let delta = 0;

  if (["PARKING:included", "PARKING:entrance_findability"].includes(facetKey)) {
    if (profile.broughtCar === false && profile.usedParking === false) {
      blocked = true;
      reasons.push("guest did not use a car or parking");
    } else if (profile.broughtCar === true || profile.usedParking === true) {
      delta += 0.08;
      reasons.push("parking is relevant to this guest");
    }
  }

  if (facetKey === "ROOM_SERVICE:dietary_options") {
    if (profile.hasChildren === false && profile.hasDietaryRestrictions === false) {
      blocked = true;
      reasons.push("children / dietary angle does not fit this guest");
    }
    if (profile.usedBreakfast === false) {
      delta -= 0.15;
      reasons.push("guest likely did not use breakfast");
    }
    if (profile.hasChildren === true || profile.hasDietaryRestrictions === true) {
      delta += 0.12;
      reasons.push("children / dietary angle fits this guest");
    }
  }

  if (facetKey === "ROOM_SERVICE:breakfast_included") {
    if (profile.usedBreakfast === false) {
      delta -= 0.12;
      reasons.push("guest likely skipped breakfast");
    }
    if (profile.usedBreakfast === true) {
      delta += 0.08;
      reasons.push("guest used breakfast");
    }
  }

  if (facetKey === "HOTEL_INFRA:shuttle") {
    if (profile.needsAirportShuttle === true) {
      delta += 0.12;
      reasons.push("airport shuttle matters to this guest");
    }
    if (profile.broughtCar === true && profile.needsAirportShuttle !== true) {
      delta -= 0.10;
      reasons.push("guest drove, so shuttle is less relevant");
    }
  }

  if (facetKey === "HOTEL_INFRA:public_transport") {
    if (profile.broughtCar === true) {
      delta -= 0.10;
      reasons.push("guest drove, so public transport matters less");
    }
    if (profile.broughtCar === false) {
      delta += 0.08;
      reasons.push("guest may rely on public transport");
    }
  }

  if (facetKey === "HOTEL_INFRA:elevator") {
    if (profile.mobilityNeeds === true || profile.hasChildren === true) {
      delta += 0.08;
      reasons.push("elevator is more relevant for this guest");
    }
  }

  if (["ROOM_INFRA:wifi_available", "ROOM_INFRA:wifi_fee", "NOISE:external_noise", "NOISE:hvac_noise"].includes(facetKey)) {
    if (profile.travelerType === "business") {
      delta += 0.08;
      reasons.push("business traveler profile boosts this question");
    }
  }

  if (facetKey === "ROOM_SERVICE:late_food") {
    if (profile.lateArrival === true) {
      delta += 0.08;
      reasons.push("late arrival makes late-food coverage more relevant");
    }
  }

  const adjustedScore = Math.max(0, Math.min(1, Number((candidate.score + delta).toFixed(3))));

  return {
    blocked,
    delta: Number(delta.toFixed(3)),
    adjustedScore,
    reasons,
    profile,
  };
}
