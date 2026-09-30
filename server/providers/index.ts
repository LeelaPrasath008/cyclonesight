import { TerrainProvider } from './terrain-provider.interface.js';
import { MockTerrainProvider } from './mock-terrain-provider.js';
import { GeeTerrainProvider } from './gee-terrain-provider.js';

export function getTerrainProvider(): TerrainProvider {
  const providerType = (process.env.TERRAIN_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'gee') {
    return new GeeTerrainProvider();
  }

  return new MockTerrainProvider();
}

export * from './terrain-provider.interface.js';
export * from './mock-terrain-provider.js';
export * from './gee-terrain-provider.js';
