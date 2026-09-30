import { InfrastructureAsset } from '../../shared/types.js';

export type LandCoverType = 'water' | 'mangrove' | 'urban' | 'cropland' | 'wetland' | 'forest';

export interface GridCellData {
  lat: number;
  lng: number;
  elevationM: number;
  landCover: LandCoverType;
  curveNumber: number;
  population: number;
  distanceToCoastKm: number;
  isHydrologicallyConnected: boolean;
  district: string;
}

export interface TerrainGrid {
  regionId: string;
  regionName: string;
  bounds: [number, number, number, number]; // [south, west, north, east]
  resolutionKm: number;
  rows: number;
  cols: number;
  cells: GridCellData[];
}

export interface TerrainProvider {
  name: string;
  isConfigured(): boolean;
  getTerrainGrid(regionId: string, bounds?: [number, number, number, number]): Promise<TerrainGrid>;
  getInfrastructureAssets(regionId: string): Promise<InfrastructureAsset[]>;
}
