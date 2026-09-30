import { CycloneScenario, HazardCell, HazardSummary, InfrastructureAsset, AlertLevel, InsuranceTriggerConfig } from '../shared/types.js';
import { getTerrainProvider } from './providers/index.js';
import { calculatePeakSurgeM, calculateCellFloodDepth } from './hazard/surge.js';
import { calculateSCSDirectRunoffMm, estimatePondingDepthMm } from './hazard/runoff.js';
import { calculateWindSpeedKmh, getDistanceKm } from './hazard/wind.js';
import { calculateCompoundHazardIndex } from './hazard/compound.js';
import { computeAssetRiskScore, buildCascadeGraph } from './hazard/vulnerability.js';
import { runParametricInsuranceSimulation } from './hazard/insurance.js';

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  summary: HazardSummary;
  gridBounds: [number, number, number, number];
  gridCells: HazardCell[];
  assets: InfrastructureAsset[];
  cascadeGraph: ReturnType<typeof buildCascadeGraph>;
  insuranceTriggers: ReturnType<typeof runParametricInsuranceSimulation>;
  computedAt: string;
  cacheKey: string;
}

// In-memory cache for fast simulation retrieval
const simulationCache = new Map<string, SimulationResult>();

export async function runSimulation(scenario: CycloneScenario, landfallShiftKm: number = 0): Promise<SimulationResult> {
  const p = scenario.parameters;
  const cacheKey = `${scenario.id}-${p.maxSustainedWindKmh}-${p.centralPressureHpa}-${p.radiusMaxWindKm}-${scenario.landfall.tideLevelM}-${p.rainfall24hMm}-${landfallShiftKm}-${p.inlandAttenuationMPerKm}`;

  if (simulationCache.has(cacheKey)) {
    return simulationCache.get(cacheKey)!;
  }

  const provider = getTerrainProvider();
  const terrain = await provider.getTerrainGrid(scenario.id, [
    scenario.center[0] - 1.2,
    scenario.center[1] - 1.2,
    scenario.center[0] + 1.2,
    scenario.center[1] + 1.2,
  ]);

  // Landfall coordinates (shifted if user tweaked slider)
  // Shift along coastline (approx +lng / +lat)
  const shiftLat = (landfallShiftKm / 111) * 0.707;
  const shiftLng = (landfallShiftKm / 111) * 0.707;
  const eyeLat = scenario.landfall.lat + shiftLat;
  const eyeLng = scenario.landfall.lng + shiftLng;

  // 1. Calculate Peak Coastal Surge
  const peakSurgeM = calculatePeakSurgeM({
    maxWindKmh: p.maxSustainedWindKmh,
    centralPressureHpa: p.centralPressureHpa,
    radiusMaxWindKm: p.radiusMaxWindKm,
    shelfSlope: p.shelfSlope || 0.0015,
    tideLevelM: scenario.landfall.tideLevelM,
    inlandAttenuationMPerKm: p.inlandAttenuationMPerKm || 0.4,
  });

  // 2. Evaluate Grid Cells
  const hazardCells: HazardCell[] = [];
  const districtPopMap = new Map<string, number>();
  const districtFloodedAreaMap = new Map<string, number>();
  const districtMaxSurge = new Map<string, number>();
  const districtMaxWind = new Map<string, number>();
  const districtMaxRain = new Map<string, number>();

  let totalPopAtRisk = 0;
  let maxSurge = 0;
  let maxWind = 0;

  for (const cell of terrain.cells) {
    // Surge depth
    const surgeDepth = calculateCellFloodDepth(
      cell.elevationM,
      peakSurgeM,
      cell.distanceToCoastKm,
      p.inlandAttenuationMPerKm || 0.4,
      cell.isHydrologicallyConnected
    );

    // Rainfall runoff
    const runoffMm = calculateSCSDirectRunoffMm(p.rainfall24hMm, cell.curveNumber, p.antecedentMoistureCondition);
    const pondingDepthMm = estimatePondingDepthMm(runoffMm, 0.2, cell.elevationM < 1.5);

    // Wind speed with RFQ asymmetry
    const cellWind = calculateWindSpeedKmh({
      pointLat: cell.lat,
      pointLng: cell.lng,
      eyeLat,
      eyeLng,
      trackHeadingDeg: 28, // approx Bay of Bengal northerly track
      forwardSpeedKmh: p.forwardSpeedKmh,
      maxWindKmh: p.maxSustainedWindKmh,
      radiusMaxWindKm: p.radiusMaxWindKm,
      inlandHours: 0,
    });

    // Compound score
    const compound = calculateCompoundHazardIndex({
      surgeDepthM: surgeDepth,
      rainRunoffMm: runoffMm,
      windSpeedKmh: cellWind,
    });

    const isInundated = surgeDepth > 0.1 || pondingDepthMm > 150;
    if (isInundated) {
      totalPopAtRisk += cell.population;
      districtPopMap.set(cell.district, (districtPopMap.get(cell.district) || 0) + cell.population);
      // approximate area per cell ~ resolution^2 km^2
      const cellArea = Math.pow(terrain.resolutionKm, 2);
      districtFloodedAreaMap.set(cell.district, (districtFloodedAreaMap.get(cell.district) || 0) + cellArea);
    }

    districtMaxSurge.set(cell.district, Math.max(districtMaxSurge.get(cell.district) || 0, surgeDepth));
    districtMaxWind.set(cell.district, Math.max(districtMaxWind.get(cell.district) || 0, cellWind));
    districtMaxRain.set(cell.district, Math.max(districtMaxRain.get(cell.district) || 0, runoffMm));

    maxSurge = Math.max(maxSurge, surgeDepth);
    maxWind = Math.max(maxWind, cellWind);

    hazardCells.push({
      lat: cell.lat,
      lng: cell.lng,
      elevationM: cell.elevationM,
      surgeDepthM: surgeDepth,
      rainRunoffMm: runoffMm,
      windSpeedKmh: cellWind,
      compoundRisk: compound.score,
      isInundated,
    });
  }

  // 3. Load & Assess Infrastructure Assets
  const rawAssets = await provider.getInfrastructureAssets(scenario.id);
  
  // Track substation and road status
  const substationsStatus = new Map<string, { failed: boolean; reason: string }>();
  const roadsStatus = new Map<string, { impassable: boolean; reason: string }>();

  // Pass 1: Evaluate physical exposure for substations and roads
  for (const asset of rawAssets) {
    const distToEye = getDistanceKm(eyeLat, eyeLng, asset.lat, asset.lng);
    const distToCoast = Math.max(0, (asset.lat - 21.6) * 105);

    const assetSurge = calculateCellFloodDepth(
      asset.elevationM,
      peakSurgeM,
      distToCoast,
      p.inlandAttenuationMPerKm || 0.4,
      true
    );

    const assetWind = calculateWindSpeedKmh({
      pointLat: asset.lat,
      pointLng: asset.lng,
      eyeLat,
      eyeLng,
      trackHeadingDeg: 28,
      forwardSpeedKmh: p.forwardSpeedKmh,
      maxWindKmh: p.maxSustainedWindKmh,
      radiusMaxWindKm: p.radiusMaxWindKm,
      inlandHours: 0,
    });

    if (asset.type === 'substation') {
      if (assetSurge >= 0.25 || assetWind >= 155) {
        substationsStatus.set(asset.id, {
          failed: true,
          reason: assetSurge >= 0.25 ? `Switchyard inundated (${assetSurge}m)` : `High wind structural failure (${assetWind} km/h)`,
        });
      }
    }

    if (asset.type === 'road' || asset.type === 'bridge') {
      if (assetSurge >= 0.35 || assetWind >= 145) {
        roadsStatus.set(asset.id, {
          impassable: true,
          reason: assetSurge >= 0.35 ? `Corridor overtopped by surge (${assetSurge}m)` : `Blocked by fallen trees & transmission towers`,
        });
      }
    }
  }

  // Pass 2: Assess full risk score and cascading dependencies for all assets
  const assessedAssets: InfrastructureAsset[] = [];
  let totalCriticalCount = 0;
  const districtCriticalCount = new Map<string, number>();
  const districtHighCount = new Map<string, number>();

  for (const asset of rawAssets) {
    const distToCoast = Math.max(0, (asset.lat - 21.6) * 105);
    const assetSurge = calculateCellFloodDepth(
      asset.elevationM,
      peakSurgeM,
      distToCoast,
      p.inlandAttenuationMPerKm || 0.4,
      true
    );

    const assetWind = calculateWindSpeedKmh({
      pointLat: asset.lat,
      pointLng: asset.lng,
      eyeLat,
      eyeLng,
      trackHeadingDeg: 28,
      forwardSpeedKmh: p.forwardSpeedKmh,
      maxWindKmh: p.maxSustainedWindKmh,
      radiusMaxWindKm: p.radiusMaxWindKm,
      inlandHours: 0,
    });

    const runoff = calculateSCSDirectRunoffMm(p.rainfall24hMm, 85, p.antecedentMoistureCondition);
    const compound = calculateCompoundHazardIndex({
      surgeDepthM: assetSurge,
      rainRunoffMm: runoff,
      windSpeedKmh: assetWind,
    });

    const risk = computeAssetRiskScore({
      asset,
      surgeDepthM: assetSurge,
      rainRunoffMm: runoff,
      windSpeedKmh: assetWind,
      compoundRiskIndex: compound.score,
      substationsStatus,
      roadsStatus,
    });

    if (risk.band === 'Critical') {
      totalCriticalCount++;
      districtCriticalCount.set(asset.district, (districtCriticalCount.get(asset.district) || 0) + 1);
    } else if (risk.band === 'High') {
      districtHighCount.set(asset.district, (districtHighCount.get(asset.district) || 0) + 1);
    }

    assessedAssets.push({
      ...asset,
      exposure: {
        surgeDepthM: assetSurge,
        rainfallRunoffMm: runoff,
        windSpeedKmh: assetWind,
        compoundRiskIndex: compound.score,
      },
      risk: {
        score: risk.score,
        band: risk.band,
        mitigation: risk.mitigation,
        leadTimeHours: risk.leadTimeHours,
        isSinglePointOfFailure: risk.isSinglePointOfFailure,
        cascadeFailureReasons: risk.cascadeReasons,
      },
    });
  }

  // Build cascading dependency graph
  const cascadeGraph = buildCascadeGraph(assessedAssets);

  // Derive Alert Level from hours to landfall
  const hoursToLandfall = scenario.track.find((t) => t.hoursToLandfall >= 0)?.hoursToLandfall || 24;
  let alertLevel: AlertLevel = 'Emergency (24h)';
  if (hoursToLandfall > 60) alertLevel = 'Watch (72h)';
  else if (hoursToLandfall > 36) alertLevel = 'Warning (48h)';
  else if (hoursToLandfall <= 8) alertLevel = 'Landfall (0-6h)';

  // Build district statistics
  const uniqueDistricts = Array.from(new Set(terrain.cells.map((c) => c.district)));
  const districtStats = uniqueDistricts.map((district) => ({
    district,
    populationAtRisk: districtPopMap.get(district) || 0,
    peakSurgeM: Math.round((districtMaxSurge.get(district) || 0) * 10) / 10,
    peakRainfallMm: Math.round(districtMaxRain.get(district) || p.rainfall24hMm),
    peakWindKmh: Math.round(districtMaxWind.get(district) || p.maxSustainedWindKmh * 0.7),
    floodedAreaKm2: Math.round(districtFloodedAreaMap.get(district) || 0),
    criticalAssetsCount: districtCriticalCount.get(district) || 0,
    highAssetsCount: districtHighCount.get(district) || 0,
  }));

  const summary: HazardSummary = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    timestamp: new Date().toISOString(),
    districtStats,
    overallPopulationAtRisk: totalPopAtRisk,
    totalCriticalAssets: totalCriticalCount,
    maxSurgeDepthM: Math.round(maxSurge * 10) / 10,
    maxWindSpeedKmh: Math.round(maxWind),
    hoursToLandfall,
    alertLevel,
  };

  // Parametric Insurance Trigger calculation
  const triggerConfigs: InsuranceTriggerConfig[] = [
    {
      id: 'ins-01',
      district: 'South 24 Parganas',
      windSpeedThresholdKmh: 140,
      distanceThresholdKm: 85,
      surgeDepthThresholdM: 2.2,
      rainfall72hThresholdMm: 220,
      baselinePayoutUSD: 12000000,
    },
    {
      id: 'ins-02',
      district: 'East Medinipur',
      windSpeedThresholdKmh: 130,
      distanceThresholdKm: 75,
      surgeDepthThresholdM: 1.8,
      rainfall72hThresholdMm: 200,
      baselinePayoutUSD: 8500000,
    },
    {
      id: 'ins-03',
      district: 'Puri',
      windSpeedThresholdKmh: 155,
      distanceThresholdKm: 65,
      surgeDepthThresholdM: 2.5,
      rainfall72hThresholdMm: 180,
      baselinePayoutUSD: 10000000,
    },
    {
      id: 'ins-04',
      district: 'Jagatsinghpur',
      windSpeedThresholdKmh: 150,
      distanceThresholdKm: 70,
      surgeDepthThresholdM: 2.4,
      rainfall72hThresholdMm: 190,
      baselinePayoutUSD: 9500000,
    },
  ];

  const districtCoords: Record<string, { lat: number; lng: number }> = {
    'South 24 Parganas': { lat: 21.9, lng: 88.3 },
    'East Medinipur': { lat: 21.7, lng: 87.6 },
    Puri: { lat: 19.82, lng: 85.83 },
    Jagatsinghpur: { lat: 20.25, lng: 86.65 },
  };

  const insuranceTriggers = runParametricInsuranceSimulation({
    configs: triggerConfigs.filter((c) => uniqueDistricts.some((d) => d.includes(c.district) || c.district.includes(d))),
    eyeLat,
    eyeLng,
    maxWindKmh: p.maxSustainedWindKmh,
    centralPressureHpa: p.centralPressureHpa,
    radiusMaxWindKm: p.radiusMaxWindKm,
    tideLevelM: scenario.landfall.tideLevelM,
    rainfallMm: p.rainfall24hMm,
    districtCoordinates: districtCoords,
    iterations: 500,
  });

  const result: SimulationResult = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    summary,
    gridBounds: terrain.bounds,
    gridCells: hazardCells,
    assets: assessedAssets,
    cascadeGraph,
    insuranceTriggers,
    computedAt: new Date().toISOString(),
    cacheKey,
  };

  simulationCache.set(cacheKey, result);
  return result;
}
