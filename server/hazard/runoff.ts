/**
 * Pure functions for USDA SCS Curve Number (CN) rainfall-runoff calculation
 * and localized flow accumulation / ponding.
 */

export type AMC = 'dry' | 'moderate' | 'saturated'; // Antecedent Moisture Condition I, II, III

/**
 * Adjusts Curve Number (CN II) for Antecedent Moisture Condition (dry AMC I or wet AMC III).
 */
export function adjustCNForAMC(cn2: number, amc: AMC): number {
  if (amc === 'moderate') return cn2;
  
  if (amc === 'dry') {
    // AMC I: Dry conditions
    return Math.round((4.2 * cn2) / (10 - 0.058 * cn2));
  } else {
    // AMC III: Saturated soil (common in monsoon/pre-cyclone rains)
    return Math.round((23 * cn2) / (10 + 0.13 * cn2));
  }
}

/**
 * Computes SCS Direct Runoff (in mm) from precipitation P (mm) and Curve Number CN.
 * Formula:
 * S = (25400 / CN) - 254 (Max potential retention in mm)
 * Ia = 0.2 * S (Initial abstraction)
 * If P > Ia: Q = (P - Ia)^2 / (P - Ia + S)
 * Else: Q = 0
 */
export function calculateSCSDirectRunoffMm(
  precipitationMm: number,
  curveNumber: number,
  amc: AMC = 'moderate'
): number {
  if (precipitationMm <= 0 || curveNumber <= 0) return 0;
  
  const effectiveCN = adjustCNForAMC(Math.min(99, Math.max(30, curveNumber)), amc);
  const S = (25400 / effectiveCN) - 254;
  const Ia = 0.2 * S;

  if (precipitationMm <= Ia) {
    return 0;
  }

  const numerator = Math.pow(precipitationMm - Ia, 2);
  const denominator = (precipitationMm - Ia) + S;
  const runoff = numerator / denominator;

  return Math.round(runoff * 10) / 10;
}

/**
 * Estimates localized flood ponding depth (mm) from runoff and terrain slope / accumulation.
 * In coastal flat lowlands (slope < 0.5%), runoff ponds with high retention.
 */
export function estimatePondingDepthMm(
  runoffMm: number,
  slopeDegrees: number = 0.2,
  isDepression: boolean = false
): number {
  if (runoffMm <= 0) return 0;
  
  // Flat terrain accumulates runoff from surrounding catchment
  const slopeFactor = Math.max(0.5, 3.0 / (1 + slopeDegrees * 2.5));
  const depressionFactor = isDepression ? 1.8 : 1.0;
  
  const ponding = runoffMm * slopeFactor * depressionFactor;
  return Math.round(ponding * 10) / 10;
}
