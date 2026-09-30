import { InsuranceTriggerConfig, InsuranceTriggerStatus } from '../../shared/types.js';
import { calculatePeakSurgeM } from './surge.js';
import { calculateWindSpeedKmh, getDistanceKm } from './wind.js';

export interface MonteCarloSimulationInput {
  configs: InsuranceTriggerConfig[];
  eyeLat: number;
  eyeLng: number;
  maxWindKmh: number;
  centralPressureHpa: number;
  radiusMaxWindKm: number;
  tideLevelM: number;
  rainfallMm: number;
  districtCoordinates: Record<string, { lat: number; lng: number }>;
  iterations?: number;
}

/**
 * Runs a Monte Carlo simulation over track and intensity uncertainty (N=500)
 * to estimate parametric insurance trigger probabilities.
 */
export function runParametricInsuranceSimulation(input: MonteCarloSimulationInput): InsuranceTriggerStatus[] {
  const {
    configs,
    eyeLat,
    eyeLng,
    maxWindKmh,
    centralPressureHpa,
    radiusMaxWindKm,
    tideLevelM,
    rainfallMm,
    districtCoordinates,
    iterations = 500,
  } = input;

  return configs.map((config) => {
    const coords = districtCoordinates[config.district] || { lat: eyeLat, lng: eyeLng };
    const baseDist = getDistanceKm(eyeLat, eyeLng, coords.lat, coords.lng);

    // Compute base values for current scenario
    const baseSurge = calculatePeakSurgeM({
      maxWindKmh,
      centralPressureHpa,
      radiusMaxWindKm,
      shelfSlope: 0.0015,
      tideLevelM,
      inlandAttenuationMPerKm: 0.4,
    });

    const baseWind = calculateWindSpeedKmh({
      pointLat: coords.lat,
      pointLng: coords.lng,
      eyeLat,
      eyeLng,
      trackHeadingDeg: 25,
      forwardSpeedKmh: 20,
      maxWindKmh,
      radiusMaxWindKm,
      inlandHours: 0,
    });

    // Monte Carlo sampling
    let triggeredCount = 0;

    for (let i = 0; i < iterations; i++) {
      // Gaussian perturbation approximations
      const trackNoiseLat = (Math.random() + Math.random() + Math.random() - 1.5) * 0.45;
      const trackNoiseLng = (Math.random() + Math.random() + Math.random() - 1.5) * 0.45;
      const windNoise = (Math.random() - 0.5) * 28; // +/- 14 km/h
      const pressureNoise = (Math.random() - 0.5) * 16;
      const tideNoise = (Math.random() - 0.5) * 0.5;
      const rainNoise = (Math.random() - 0.5) * 60;

      const runEyeLat = eyeLat + trackNoiseLat;
      const runEyeLng = eyeLng + trackNoiseLng;
      const runMaxWind = Math.max(80, maxWindKmh + windNoise);
      const runPressure = Math.max(900, centralPressureHpa + pressureNoise);
      const runTide = Math.max(0, tideLevelM + tideNoise);
      const runRain = Math.max(0, rainfallMm + rainNoise);

      const runDist = getDistanceKm(runEyeLat, runEyeLng, coords.lat, coords.lng);
      
      const runWind = calculateWindSpeedKmh({
        pointLat: coords.lat,
        pointLng: coords.lng,
        eyeLat: runEyeLat,
        eyeLng: runEyeLng,
        trackHeadingDeg: 25,
        forwardSpeedKmh: 20,
        maxWindKmh: runMaxWind,
        radiusMaxWindKm,
        inlandHours: 0,
      });

      const runSurge = calculatePeakSurgeM({
        maxWindKmh: runMaxWind,
        centralPressureHpa: runPressure,
        radiusMaxWindKm,
        shelfSlope: 0.0015,
        tideLevelM: runTide,
        inlandAttenuationMPerKm: 0.4,
      });

      // Check parametric criteria:
      // 1. Wind > threshold AND distance < threshold
      // OR 2. Surge > threshold
      // OR 3. Rainfall > threshold
      const windTriggered = runWind >= config.windSpeedThresholdKmh && runDist <= config.distanceThresholdKm;
      const surgeTriggered = runSurge >= config.surgeDepthThresholdM;
      const rainTriggered = runRain >= config.rainfall72hThresholdMm;

      if (windTriggered || surgeTriggered || rainTriggered) {
        triggeredCount++;
      }
    }

    const probPct = Math.round((triggeredCount / iterations) * 100);

    const factorsTriggered: string[] = [];
    if (baseWind >= config.windSpeedThresholdKmh && baseDist <= config.distanceThresholdKm) {
      factorsTriggered.push(`Wind (${baseWind} km/h >= ${config.windSpeedThresholdKmh})`);
    }
    if (baseSurge >= config.surgeDepthThresholdM) {
      factorsTriggered.push(`Storm Surge (${baseSurge}m >= ${config.surgeDepthThresholdM}m)`);
    }
    if (rainfallMm >= config.rainfall72hThresholdMm) {
      factorsTriggered.push(`Rainfall (${rainfallMm}mm >= ${config.rainfall72hThresholdMm}mm)`);
    }

    const isTriggered = factorsTriggered.length > 0;
    const estimatedPayout = Math.round((probPct / 100) * config.baselinePayoutUSD);
    const recommendedPreposition = Math.round(estimatedPayout * 0.4); // 40% immediate pre-disaster emergency liquidity

    return {
      config,
      currentWindKmh: baseWind,
      currentSurgeM: baseSurge,
      currentRainfallMm: rainfallMm,
      distanceToEyeKm: Math.round(baseDist * 10) / 10,
      isTriggered,
      triggerProbabilityPct: probPct,
      estimatedPayoutUSD: estimatedPayout,
      recommendedPrepositionUSD: recommendedPreposition,
      recommendedTimingHours: 36, // pre-landfall liquidity transfer lead time
      factorsTriggered,
    };
  });
}
