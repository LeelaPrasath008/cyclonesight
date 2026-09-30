/**
 * Pure functions for storm surge estimation and hydrologically-connected inundation.
 */

export interface SurgeParams {
  maxWindKmh: number;
  centralPressureHpa: number;
  radiusMaxWindKm: number;
  shelfSlope: number; // e.g. 0.0015 (shallow Bay of Bengal)
  tideLevelM: number;
  inlandAttenuationMPerKm: number; // default 0.4 m/km
}

/**
 * Calculates peak coastal storm surge height (meters above MSL) including astronomical tide.
 * Uses empirical inverted-barometer + wind-stress shelf slope formulation calibrated for northern Bay of Bengal.
 */
export function calculatePeakSurgeM(params: SurgeParams): number {
  const { maxWindKmh, centralPressureHpa, radiusMaxWindKm, shelfSlope, tideLevelM } = params;

  // 1. Inverted Barometer Effect: ~ 1 cm rise per 1 hPa pressure drop below ambient (1013 hPa)
  const pressureDeficit = Math.max(0, 1013 - centralPressureHpa);
  const invertedBarometerM = pressureDeficit * 0.0102; // meters

  // 2. Wind stress surge: proportional to wind speed squared, shallow bathymetry factor, and RMW
  // Bay of Bengal has extreme shallow continental shelf (shelfSlope 0.001 - 0.002) which piles up water
  const windMps = maxWindKmh / 3.6;
  const bathymetryFactor = Math.min(3.5, 0.003 / Math.max(0.0005, shelfSlope));
  const rmwFactor = Math.pow(Math.max(15, radiusMaxWindKm) / 35, 0.45);
  
  // Empirical wind surge height calibrated for Bay of Bengal shallow bathymetry
  const windSurgeM = 0.00105 * Math.pow(windMps, 1.85) * bathymetryFactor * rmwFactor;

  // Total peak storm water level above mean sea level
  const totalWaterLevel = invertedBarometerM + windSurgeM + Math.max(0, tideLevelM);

  return Math.round(totalWaterLevel * 100) / 100;
}

/**
 * Calculates surge water level at a given inland distance from the coast (in km)
 * considering inland friction and topographical attenuation.
 */
export function calculateInlandSurgeLevel(
  peakSurgeM: number,
  distanceFromCoastKm: number,
  attenuationMPerKm: number = 0.4
): number {
  if (distanceFromCoastKm <= 0) return peakSurgeM;
  const attenuatedLevel = peakSurgeM - (distanceFromCoastKm * attenuationMPerKm);
  return Math.max(0, Math.round(attenuatedLevel * 100) / 100);
}

/**
 * Calculates flood depth for a cell given its elevation, distance from coast,
 * and whether it has hydrological connectivity to the sea / estuary.
 */
export function calculateCellFloodDepth(
  elevationM: number,
  peakSurgeM: number,
  distanceFromCoastKm: number,
  attenuationMPerKm: number = 0.4,
  isHydrologicallyConnected: boolean = true
): number {
  if (!isHydrologicallyConnected) return 0;
  
  const waterLevel = calculateInlandSurgeLevel(peakSurgeM, distanceFromCoastKm, attenuationMPerKm);
  if (waterLevel <= elevationM) return 0;
  
  return Math.round((waterLevel - elevationM) * 100) / 100;
}
