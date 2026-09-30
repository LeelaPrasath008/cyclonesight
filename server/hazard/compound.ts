/**
 * Pure functions for compound hazard scoring and overlap bonus calculation.
 */

export interface CompoundInput {
  surgeDepthM: number;
  rainRunoffMm: number;
  windSpeedKmh: number;
}

/**
 * Calculates a compound hazard risk score between 0 and 100.
 * Includes non-linear compound penalty for tide locking:
 * when high storm surge coincides with intense rainfall, estuaries and
 * canals cannot drain to sea, magnifying inland flood depths.
 */
export function calculateCompoundHazardIndex(input: CompoundInput): {
  score: number;
  compoundBonusApplied: boolean;
} {
  const { surgeDepthM, rainRunoffMm, windSpeedKmh } = input;

  // Normalized hazard scales:
  // Surge: 0 to 4.0 meters -> 0 to 1
  const normSurge = Math.min(1.0, Math.max(0, surgeDepthM / 3.5));

  // Rainfall runoff: 0 to 300 mm -> 0 to 1
  const normRain = Math.min(1.0, Math.max(0, rainRunoffMm / 250));

  // Wind speed: 0 to 220 km/h -> 0 to 1
  const normWind = Math.min(1.0, Math.max(0, windSpeedKmh / 220));

  // Base weighted hazard
  let baseScore = (normSurge * 0.45 + normRain * 0.30 + normWind * 0.25) * 100;

  // Tide-locking compound effect:
  // If surge > 0.6m AND rainfall runoff > 80mm, drainage is heavily impeded
  let compoundBonusApplied = false;
  if (surgeDepthM > 0.6 && rainRunoffMm > 80) {
    compoundBonusApplied = true;
    const compoundMultiplier = 1 + (normSurge * normRain * 0.4);
    baseScore = baseScore * compoundMultiplier;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(baseScore)));
  return {
    score: finalScore,
    compoundBonusApplied,
  };
}
