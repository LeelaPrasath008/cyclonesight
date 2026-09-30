export type CycloneCategory = 
  | 'Depression' 
  | 'Deep Depression' 
  | 'Cyclonic Storm' 
  | 'Severe Cyclonic Storm' 
  | 'Very Severe Cyclonic Storm' 
  | 'Extremely Severe Cyclonic Storm' 
  | 'Super Cyclonic Storm';

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string; // ISO string
  hoursToLandfall: number;
  maxWindKmh: number;
  centralPressureHpa: number;
  category: CycloneCategory;
}

export interface CycloneScenario {
  id: string;
  name: string;
  year: number;
  basin: 'Bay of Bengal' | 'Arabian Sea';
  regionName: string;
  historicalNote: string;
  isApproximateReplay: boolean;
  center: [number, number]; // [lat, lng]
  zoom: number;
  track: TrackPoint[];
  landfall: {
    lat: number;
    lng: number;
    estimatedTime: string;
    tideLevelM: number;
  };
  parameters: {
    maxSustainedWindKmh: number;
    centralPressureHpa: number;
    radiusMaxWindKm: number;
    forwardSpeedKmh: number;
    shelfSlope: number; // e.g., 0.001 to 0.003
    inlandAttenuationMPerKm: number; // default 0.4 m/km
    rainfall24hMm: number;
    antecedentMoistureCondition: 'dry' | 'moderate' | 'saturated';
  };
}

export type AlertLevel = 'Watch (72h)' | 'Warning (48h)' | 'Emergency (24h)' | 'Landfall (0-6h)';

export type AssetType = 'substation' | 'hospital' | 'shelter' | 'clinic' | 'road' | 'bridge';

export type RiskBand = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface InfrastructureAsset {
  id: string;
  name: string;
  type: AssetType;
  district: string;
  lat: number;
  lng: number;
  elevationM: number;
  criticalityScore: number; // 0 - 100
  populationServed: number;
  backupPowerAvailable: boolean;
  soleAccessRoadId?: string;
  poweredBySubstationId?: string;
  // Computed hazard exposure
  exposure?: {
    surgeDepthM: number;
    rainfallRunoffMm: number;
    windSpeedKmh: number;
    compoundRiskIndex: number; // 0 - 100
  };
  risk?: {
    score: number; // 0 - 100
    band: RiskBand;
    mitigation: string;
    leadTimeHours: number;
    isSinglePointOfFailure: boolean;
    cascadeFailureReasons: string[];
  };
}

export interface CascadeNode {
  id: string;
  name: string;
  type: AssetType;
  district: string;
  status: 'operational' | 'at-risk' | 'failed';
  riskScore: number;
  downstreamCount: number;
  upstreamId?: string;
  failureReason?: string;
}

export interface CascadeEdge {
  fromId: string;
  toId: string;
  dependencyType: 'power' | 'road-access';
  isVulnerable: boolean;
}

export interface HazardCell {
  lat: number;
  lng: number;
  elevationM: number;
  surgeDepthM: number;
  rainRunoffMm: number;
  windSpeedKmh: number;
  compoundRisk: number; // 0 - 100
  isInundated: boolean;
}

export interface HazardSummary {
  scenarioId: string;
  scenarioName: string;
  timestamp: string;
  districtStats: {
    district: string;
    populationAtRisk: number;
    peakSurgeM: number;
    peakRainfallMm: number;
    peakWindKmh: number;
    floodedAreaKm2: number;
    criticalAssetsCount: number;
    highAssetsCount: number;
  }[];
  overallPopulationAtRisk: number;
  totalCriticalAssets: number;
  maxSurgeDepthM: number;
  maxWindSpeedKmh: number;
  hoursToLandfall: number;
  alertLevel: AlertLevel;
}

export type AudienceType = 
  | 'District Collector' 
  | 'Power Utility' 
  | 'Hospital Administrator' 
  | 'Road/Highway Authority' 
  | 'General Public';

export type LanguageCode = 'en' | 'bn' | 'or' | 'hi' | 'ta' | 'te' | 'my';

export interface AdvisoryAction {
  action: string;
  deadlineHours: number;
  owner: string;
  priority: 'Immediate' | 'High' | 'Medium';
}

export interface AdvisoryData {
  alertLevel: AlertLevel;
  audience: AudienceType;
  district: string;
  headline: string;
  summary: string;
  actions: AdvisoryAction[];
  evacuationZones: string[];
  resources: string[];
  validUntil: string;
  languages: {
    en: {
      headline: string;
      summary: string;
      actions: AdvisoryAction[];
      instructions: string[];
    };
    local: {
      langName: string;
      headline: string;
      summary: string;
      actions: AdvisoryAction[];
      instructions: string[];
    };
  };
}

export interface DispatchRecord {
  id: string;
  timestamp: string;
  alertLevel: AlertLevel;
  audience: AudienceType;
  district: string;
  channel: 'Email' | 'Telegram' | 'SMS' | 'Multi-Channel';
  status: 'Simulated (Dry Run)' | 'Delivered' | 'Pending Review' | 'Failed';
  approver: string;
  previewText: string;
  payload: {
    recipientCount: number;
    primaryHeadline: string;
    deliveryTime: string;
    details: string;
  };
}

export interface AuthorityContact {
  id: string;
  name: string;
  title: string;
  agency: string;
  district: string;
  email: string;
  phone: string;
  telegramHandle: string;
  role: AudienceType;
}

export interface InsuranceTriggerConfig {
  id: string;
  district: string;
  windSpeedThresholdKmh: number;
  distanceThresholdKm: number;
  surgeDepthThresholdM: number;
  rainfall72hThresholdMm: number;
  baselinePayoutUSD: number;
}

export interface InsuranceTriggerStatus {
  config: InsuranceTriggerConfig;
  currentWindKmh: number;
  currentSurgeM: number;
  currentRainfallMm: number;
  distanceToEyeKm: number;
  isTriggered: boolean;
  triggerProbabilityPct: number; // from Monte Carlo
  estimatedPayoutUSD: number;
  recommendedPrepositionUSD: number;
  recommendedTimingHours: number;
  factorsTriggered: string[];
}
