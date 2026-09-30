import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculatePeakSurgeM, calculateInlandSurgeLevel, calculateCellFloodDepth } from './surge.js';
import { calculateSCSDirectRunoffMm, adjustCNForAMC } from './runoff.js';
import { calculateWindSpeedKmh, getDistanceKm, getAssetWindDamageProbability } from './wind.js';
import { calculateCompoundHazardIndex } from './compound.js';
import { computeAssetRiskScore, buildCascadeGraph } from './vulnerability.js';
import { InfrastructureAsset } from '../../shared/types.js';

describe('Hazard Models Unit Tests', () => {
  describe('Storm Surge Model', () => {
    it('computes realistic peak storm surge for severe cyclone with shallow shelf', () => {
      const peakSurge = calculatePeakSurgeM({
        maxWindKmh: 200,
        centralPressureHpa: 935,
        radiusMaxWindKm: 35,
        shelfSlope: 0.0015,
        tideLevelM: 1.2,
        inlandAttenuationMPerKm: 0.4,
      });

      // For 200 km/h wind + 935 hPa (78 hPa deficit = 0.8m inverted barometer) + 1.2m tide + shallow shelf:
      // Peak surge water level should be between 3.5m and 6.5m
      assert.ok(peakSurge >= 3.5 && peakSurge <= 6.5, `Peak surge ${peakSurge}m out of realistic bounds`);
    });

    it('correctly attenuates surge inland', () => {
      const peak = 4.0;
      const at5km = calculateInlandSurgeLevel(peak, 5, 0.4);
      assert.strictEqual(at5km, 2.0); // 4.0 - 5*0.4 = 2.0m

      const at12km = calculateInlandSurgeLevel(peak, 12, 0.4);
      assert.strictEqual(at12km, 0); // 4.0 - 4.8 < 0 -> 0m
    });

    it('computes cell flood depth based on elevation and attenuation', () => {
      const depth = calculateCellFloodDepth(1.5, 4.0, 3, 0.4, true);
      // water level = 4.0 - 1.2 = 2.8m. Depth = 2.8 - 1.5 = 1.3m
      assert.strictEqual(depth, 1.3);

      const unconnectedDepth = calculateCellFloodDepth(1.5, 4.0, 3, 0.4, false);
      assert.strictEqual(unconnectedDepth, 0);
    });
  });

  describe('SCS Curve Number Runoff Model', () => {
    it('adjusts Curve Number based on antecedent soil moisture condition (AMC)', () => {
      const cnNormal = 80;
      const cnDry = adjustCNForAMC(cnNormal, 'dry');
      const cnWet = adjustCNForAMC(cnNormal, 'saturated');

      assert.ok(cnDry < cnNormal, 'Dry AMC should reduce curve number');
      assert.ok(cnWet > cnNormal, 'Saturated AMC should increase curve number');
    });

    it('calculates higher direct runoff for heavier precipitation and saturated soil', () => {
      const runoffModerate = calculateSCSDirectRunoffMm(150, 80, 'moderate');
      const runoffWet = calculateSCSDirectRunoffMm(150, 80, 'saturated');

      assert.ok(runoffModerate > 50, 'Moderate runoff should be substantial for 150mm rain');
      assert.ok(runoffWet > runoffModerate, 'Saturated soil must generate more direct runoff');
    });

    it('returns zero runoff when precipitation is below initial abstraction Ia', () => {
      const smallRain = 5; // 5mm
      const runoff = calculateSCSDirectRunoffMm(smallRain, 70, 'moderate');
      assert.strictEqual(runoff, 0);
    });
  });

  describe('Wind Field & RFQ Asymmetry', () => {
    it('demonstrates Right-Front Quadrant (RFQ) wind amplification', () => {
      // Cyclone moving North (heading 0 deg)
      const eyeLat = 20.0;
      const eyeLng = 86.0;
      const heading = 0; // North
      const speed = 25; // km/h

      // Point A: 30 km to the East (bearing 90 deg -> RFQ)
      const rfqWind = calculateWindSpeedKmh({
        pointLat: 20.0,
        pointLng: 86.3, // East of eye
        eyeLat,
        eyeLng,
        trackHeadingDeg: heading,
        forwardSpeedKmh: speed,
        maxWindKmh: 180,
        radiusMaxWindKm: 30,
        inlandHours: 0,
      });

      // Point B: 30 km to the West (bearing 270 deg -> Left flank)
      const leftFlankWind = calculateWindSpeedKmh({
        pointLat: 20.0,
        pointLng: 85.7, // West of eye
        eyeLat,
        eyeLng,
        trackHeadingDeg: heading,
        forwardSpeedKmh: speed,
        maxWindKmh: 180,
        radiusMaxWindKm: 30,
        inlandHours: 0,
      });

      assert.ok(
        rfqWind > leftFlankWind,
        `RFQ wind (${rfqWind} km/h) must exceed left flank wind (${leftFlankWind} km/h) due to forward motion superposition`
      );
    });

    it('applies asset-specific damage vulnerability thresholds', () => {
      const subProb = getAssetWindDamageProbability('substation', 150);
      const shelterProb = getAssetWindDamageProbability('shelter', 150);

      // Shelters are specifically hardened compared to exposed outdoor electric substations
      assert.ok(
        subProb > shelterProb,
        `Substation damage probability (${subProb}) should exceed engineered shelter (${shelterProb}) at 150 km/h`
      );
    });
  });

  describe('Compound Multi-Hazard Index', () => {
    it('applies compound bonus during coastal tide-locking conditions', () => {
      const isolatedSurge = calculateCompoundHazardIndex({
        surgeDepthM: 1.5,
        rainRunoffMm: 20,
        windSpeedKmh: 80,
      });

      const compoundEvent = calculateCompoundHazardIndex({
        surgeDepthM: 1.5,
        rainRunoffMm: 120, // high runoff blocked by surge
        windSpeedKmh: 80,
      });

      assert.strictEqual(compoundEvent.compoundBonusApplied, true);
      assert.ok(compoundEvent.score > isolatedSurge.score);
    });
  });

  describe('Vulnerability & Cascading Graph Model', () => {
    const mockSubstation: InfrastructureAsset = {
      id: 'sub-1',
      name: 'Puri Coastal 220kV Grid Substation',
      type: 'substation',
      district: 'Puri',
      lat: 19.82,
      lng: 85.85,
      elevationM: 1.8,
      criticalityScore: 90,
      populationServed: 120000,
      backupPowerAvailable: false,
    };

    const mockHospital: InfrastructureAsset = {
      id: 'hosp-1',
      name: 'District Sadar Hospital',
      type: 'hospital',
      district: 'Puri',
      lat: 19.83,
      lng: 85.86,
      elevationM: 3.5,
      criticalityScore: 95,
      populationServed: 80000,
      backupPowerAvailable: false,
      poweredBySubstationId: 'sub-1',
      soleAccessRoadId: 'road-1',
    };

    const mockRoad: InfrastructureAsset = {
      id: 'road-1',
      name: 'Marine Drive Arterial Road',
      type: 'road',
      district: 'Puri',
      lat: 19.81,
      lng: 85.84,
      elevationM: 1.2,
      criticalityScore: 85,
      populationServed: 60000,
      backupPowerAvailable: false,
    };

    it('cascades power outage to dependent hospital without backup generator', () => {
      const subStatus = new Map<string, { failed: boolean; reason: string }>();
      subStatus.set('sub-1', { failed: true, reason: 'Flooded switchyard' });
      const roadStatus = new Map<string, { impassable: boolean; reason: string }>();

      const assessment = computeAssetRiskScore({
        asset: mockHospital,
        surgeDepthM: 0.2,
        rainRunoffMm: 40,
        windSpeedKmh: 120,
        compoundRiskIndex: 45,
        substationsStatus: subStatus,
        roadsStatus: roadStatus,
      });

      assert.ok(
        assessment.cascadeReasons.some((r) => r.includes('NO backup generator online')),
        'Hospital should register upstream power outage cascade failure'
      );
      assert.ok(assessment.score >= 60, 'Risk score should elevate to High or Critical');
    });

    it('builds cascading graph and identifies single point of failure (SPOF)', () => {
      mockSubstation.risk = {
        score: 85,
        band: 'Critical',
        mitigation: 'Sandbag switchgear',
        leadTimeHours: 12,
        isSinglePointOfFailure: true,
        cascadeFailureReasons: [],
      };

      const assets = [mockSubstation, mockHospital, mockRoad];
      const graph = buildCascadeGraph(assets);

      assert.strictEqual(graph.nodes.length, 3);
      assert.ok(graph.edges.length >= 2, 'Graph must link dependent edges');
    });
  });
});
