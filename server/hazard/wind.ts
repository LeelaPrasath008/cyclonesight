/**
 * Pure functions for parametric cyclone wind field modeling with Right-Front-Quadrant (RFQ)
 * asymmetry, radius of maximum winds, and inland decay.
 */

export interface WindPointParams {
  pointLat: number;
  pointLng: number;
  eyeLat: number;
  eyeLng: number;
  trackHeadingDeg: number; // Cyclone heading in degrees (0 = North, 90 = East)
  forwardSpeedKmh: number;
  maxWindKmh: number;
  radiusMaxWindKm: number;
  inlandHours: number; // hours since landfall (0 if offshore)
}

/**
 * Calculates great-circle distance between two lat/lng coordinates in km.
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates bearing from point 1 to point 2 in degrees (0 to 360).
 */
export function getBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Computes wind speed at any given location based on Holland wind profile + asymmetry + inland decay.
 */
export function calculateWindSpeedKmh(params: WindPointParams): number {
  const {
    pointLat,
    pointLng,
    eyeLat,
    eyeLng,
    trackHeadingDeg,
    forwardSpeedKmh,
    maxWindKmh,
    radiusMaxWindKm,
    inlandHours,
  } = params;

  const r = Math.max(1, getDistanceKm(eyeLat, eyeLng, pointLat, pointLng));
  const rmw = Math.max(10, radiusMaxWindKm);

  // 1. Holland profile shape parameter B (typically 1.1 to 1.6 in Bay of Bengal)
  const B = 1.35;
  const ratio = rmw / r;
  
  // Holland rotational wind speed
  let vRot = maxWindKmh * Math.sqrt(Math.pow(ratio, B) * Math.exp(1 - Math.pow(ratio, B)));
  if (isNaN(vRot)) vRot = 0;

  // 2. Right-Front-Quadrant (RFQ) asymmetry:
  // In the Northern Hemisphere, cyclonic rotation is counter-clockwise.
  // The forward translation vector adds constructively to the right of the storm track.
  const bearingFromEye = getBearingDeg(eyeLat, eyeLng, pointLat, pointLng);
  // Angle relative to storm motion vector
  const relativeAngleRad = ((bearingFromEye - trackHeadingDeg) * Math.PI) / 180;
  
  // RFQ boost factor: max on the right flank (approx 90 deg clockwise of heading)
  const asymmetryFactor = 0.5 * (1 + Math.sin(relativeAngleRad));
  const translationalContribution = forwardSpeedKmh * 0.7 * (asymmetryFactor - 0.5);

  let totalWind = vRot + translationalContribution;

  // 3. Inland decay (Kaplan & DeMaria model: exponential decay after landfall)
  if (inlandHours > 0) {
    const decayRate = 0.085; // decay factor per hour over rough land terrain
    totalWind = totalWind * Math.exp(-decayRate * inlandHours);
  }

  return Math.max(15, Math.round(totalWind));
}

/**
 * Returns damage probability [0.0 to 1.0] for a given asset type based on sustained wind speed.
 */
export function getAssetWindDamageProbability(assetType: string, windSpeedKmh: number): number {
  // Vulnerability curves calibrated for coastal infrastructure
  switch (assetType) {
    case 'substation':
      // Open air transformers & distribution lines damaged by flying debris > 120 km/h
      if (windSpeedKmh < 90) return 0.05;
      if (windSpeedKmh < 130) return 0.25;
      if (windSpeedKmh < 170) return 0.65;
      return 0.95;

    case 'hospital':
    case 'clinic':
      // Structural damage or glass breakage
      if (windSpeedKmh < 110) return 0.02;
      if (windSpeedKmh < 150) return 0.20;
      if (windSpeedKmh < 190) return 0.50;
      return 0.85;

    case 'shelter':
      // Engineered cyclone shelters are hardened up to 200 km/h
      if (windSpeedKmh < 140) return 0.01;
      if (windSpeedKmh < 185) return 0.15;
      return 0.40;

    case 'road':
    case 'bridge':
      // Blocked by uprooted trees and fallen poles
      if (windSpeedKmh < 80) return 0.05;
      if (windSpeedKmh < 120) return 0.40;
      if (windSpeedKmh < 160) return 0.75;
      return 0.95;

    default:
      if (windSpeedKmh < 100) return 0.1;
      if (windSpeedKmh < 150) return 0.4;
      return 0.8;
  }
}
