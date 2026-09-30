import { TerrainProvider, TerrainGrid, GridCellData } from './terrain-provider.interface.js';
import { InfrastructureAsset } from '../../shared/types.js';

export class MockTerrainProvider implements TerrainProvider {
  public name = 'Mock Geospatial Provider (SRTM & WorldPop Offline Replica)';

  public isConfigured(): boolean {
    return true;
  }

  public async getTerrainGrid(regionId: string, bounds?: [number, number, number, number]): Promise<TerrainGrid> {
    // Generate realistic DEM grid based on region
    const isOdisha = regionId.toLowerCase().includes('odisha') || regionId.toLowerCase().includes('fani');
    const isMichaung = regionId.toLowerCase().includes('michaung') || regionId.toLowerCase().includes('andhra');
    const isMocha = regionId.toLowerCase().includes('mocha') || regionId.toLowerCase().includes('myanmar');

    if (isOdisha) {
      return this.generateOdishaGrid();
    } else if (isMichaung) {
      return this.generateMichaungGrid();
    } else if (isMocha) {
      return this.generateMochaGrid();
    } else {
      // Default: West Bengal & Sundarbans (Amphan)
      return this.generateSundarbansGrid();
    }
  }

  private generateSundarbansGrid(): TerrainGrid {
    // Lat: 21.4 to 22.8 (South to North), Lng: 87.8 to 89.2 (West to East)
    const south = 21.5;
    const west = 87.8;
    const north = 22.8;
    const east = 89.2;
    const stepsLat = 18;
    const stepsLng = 20;

    const cells: GridCellData[] = [];

    for (let i = 0; i < stepsLat; i++) {
      const lat = south + (i / (stepsLat - 1)) * (north - south);
      for (let j = 0; j < stepsLng; j++) {
        const lng = west + (j / (stepsLng - 1)) * (east - west);

        // Coastline is roughly around lat 21.6 - 21.8, with delta estuaries
        // Distance to coast calculation (km)
        const distToCoast = Math.max(0, (lat - 21.58) * 111);
        
        // Sundarbans delta elevation: 0.8m at outer islands (Sagar, Gosaba) to 6m near Kolkata (lat 22.5)
        let elev = 0.5 + (distToCoast * 0.04) + Math.sin(lat * 15) * 0.4 + Math.cos(lng * 12) * 0.3;
        if (lat < 21.65 && lng > 88.3) elev = Math.max(0.4, elev * 0.6); // outer mangrove islands

        // Assign land cover & curve numbers
        let landCover: GridCellData['landCover'] = 'cropland';
        let cn = 78;
        let pop = Math.round(500 + Math.random() * 2500);
        let district = 'South 24 Parganas';

        if (elev < 1.2 && lat < 22.0) {
          landCover = 'mangrove';
          cn = 88;
          pop = Math.round(100 + Math.random() * 800);
        } else if (lat > 22.45 && lng < 88.5) {
          // Kolkata metropolitan core
          landCover = 'urban';
          cn = 92;
          pop = Math.round(8000 + Math.random() * 15000);
          district = 'Kolkata Urban';
          elev = Math.max(4.5, elev);
        } else if (lng < 88.1) {
          district = 'East Medinipur (Digha/Haldia)';
          if (lat < 21.75) {
            landCover = 'wetland';
            cn = 85;
          }
        } else if (lng > 88.8) {
          district = 'North 24 Parganas / Bangladesh Border';
        }

        cells.push({
          lat: Math.round(lat * 1000) / 1000,
          lng: Math.round(lng * 1000) / 1000,
          elevationM: Math.round(Math.max(0.3, elev) * 10) / 10,
          landCover,
          curveNumber: cn,
          population: pop,
          distanceToCoastKm: Math.round(distToCoast * 10) / 10,
          isHydrologicallyConnected: distToCoast < 45,
          district,
        });
      }
    }

    return {
      regionId: 'sundarbans-amphan',
      regionName: 'West Bengal & Sundarbans Delta',
      bounds: [south, west, north, east],
      resolutionKm: 8.0,
      rows: stepsLat,
      cols: stepsLng,
      cells,
    };
  }

  private generateOdishaGrid(): TerrainGrid {
    const south = 19.3;
    const west = 84.8;
    const north = 20.8;
    const east = 86.9;
    const stepsLat = 18;
    const stepsLng = 20;

    const cells: GridCellData[] = [];

    for (let i = 0; i < stepsLat; i++) {
      const lat = south + (i / (stepsLat - 1)) * (north - south);
      for (let j = 0; j < stepsLng; j++) {
        const lng = west + (j / (stepsLng - 1)) * (east - west);

        // Odisha coast runs southwest to northeast
        // Distance to coast
        const coastLngApprox = 85.0 + (lat - 19.3) * 1.35;
        const distToCoast = Math.max(0, (coastLngApprox - lng) * 105);

        let elev = 1.0 + (distToCoast * 0.07) + Math.sin(lat * 10) * 0.6;
        let district = 'Puri';
        let landCover: GridCellData['landCover'] = 'cropland';
        let cn = 76;
        let pop = Math.round(800 + Math.random() * 2000);

        if (lat > 20.1 && lng > 86.2) {
          district = 'Jagatsinghpur (Paradip)';
          if (distToCoast < 6) {
            landCover = 'wetland';
            cn = 86;
            elev = 1.2;
          }
        } else if (lat > 20.4) {
          district = 'Kendrapara';
        } else if (lng < 85.5 && lat > 20.0) {
          district = 'Khordha (Bhubaneswar)';
          landCover = 'urban';
          cn = 90;
          elev = Math.max(12, elev);
          pop = Math.round(6000 + Math.random() * 9000);
        } else if (lat < 19.6) {
          district = 'Ganjam (Gopalpur)';
        }

        cells.push({
          lat: Math.round(lat * 1000) / 1000,
          lng: Math.round(lng * 1000) / 1000,
          elevationM: Math.round(Math.max(0.5, elev) * 10) / 10,
          landCover,
          curveNumber: cn,
          population: pop,
          distanceToCoastKm: Math.round(distToCoast * 10) / 10,
          isHydrologicallyConnected: distToCoast < 35,
          district,
        });
      }
    }

    return {
      regionId: 'odisha-fani',
      regionName: 'Odisha Coastal Corridor',
      bounds: [south, west, north, east],
      resolutionKm: 8.5,
      rows: stepsLat,
      cols: stepsLng,
      cells,
    };
  }

  private generateMichaungGrid(): TerrainGrid {
    const south = 13.0;
    const west = 79.8;
    const north = 15.2;
    const east = 80.8;
    const stepsLat = 16;
    const stepsLng = 16;
    const cells: GridCellData[] = [];

    for (let i = 0; i < stepsLat; i++) {
      const lat = south + (i / (stepsLat - 1)) * (north - south);
      for (let j = 0; j < stepsLng; j++) {
        const lng = west + (j / (stepsLng - 1)) * (east - west);
        const distToCoast = Math.max(0, (80.3 - lng) * 105);
        const elev = Math.max(1.2, 1.0 + distToCoast * 0.08);
        const district = lat < 13.6 ? 'Chennai North' : lat < 14.5 ? 'Nellore' : 'Bapatla';

        cells.push({
          lat: Math.round(lat * 1000) / 1000,
          lng: Math.round(lng * 1000) / 1000,
          elevationM: Math.round(elev * 10) / 10,
          landCover: lat < 13.5 ? 'urban' : 'cropland',
          curveNumber: lat < 13.5 ? 90 : 78,
          population: lat < 13.5 ? 12000 : 1500,
          distanceToCoastKm: Math.round(distToCoast * 10) / 10,
          isHydrologicallyConnected: distToCoast < 28,
          district,
        });
      }
    }

    return {
      regionId: 'michaung-andhra',
      regionName: 'Andhra Pradesh & North TN Coast',
      bounds: [south, west, north, east],
      resolutionKm: 9.0,
      rows: stepsLat,
      cols: stepsLng,
      cells,
    };
  }

  private generateMochaGrid(): TerrainGrid {
    const south = 19.8;
    const west = 92.4;
    const north = 21.8;
    const east = 93.6;
    const stepsLat = 16;
    const stepsLng = 16;
    const cells: GridCellData[] = [];

    for (let i = 0; i < stepsLat; i++) {
      const lat = south + (i / (stepsLat - 1)) * (north - south);
      for (let j = 0; j < stepsLng; j++) {
        const lng = west + (j / (stepsLng - 1)) * (east - west);
        const distToCoast = Math.max(0, (lng - 92.6) * 100);
        const elev = Math.max(0.8, 1.2 + distToCoast * 0.12);
        const district = lat > 21.0 ? 'Cox\'s Bazar' : 'Sittwe (Rakhine)';

        cells.push({
          lat: Math.round(lat * 1000) / 1000,
          lng: Math.round(lng * 1000) / 1000,
          elevationM: Math.round(elev * 10) / 10,
          landCover: 'mangrove',
          curveNumber: 82,
          population: 3000,
          distanceToCoastKm: Math.round(distToCoast * 10) / 10,
          isHydrologicallyConnected: distToCoast < 20,
          district,
        });
      }
    }

    return {
      regionId: 'mocha-myanmar',
      regionName: 'Myanmar Rakhine & Cox\'s Bazar Coast',
      bounds: [south, west, north, east],
      resolutionKm: 9.0,
      rows: stepsLat,
      cols: stepsLng,
      cells,
    };
  }

  public async getInfrastructureAssets(regionId: string): Promise<InfrastructureAsset[]> {
    const isOdisha = regionId.toLowerCase().includes('odisha') || regionId.toLowerCase().includes('fani');
    
    if (isOdisha) {
      return this.getOdishaAssets();
    } else {
      // Default: West Bengal & Sundarbans
      return this.getSundarbansAssets();
    }
  }

  private getSundarbansAssets(): InfrastructureAsset[] {
    return [
      // Substations
      {
        id: 'sub-sundar-01',
        name: 'Kakdwip 132/33kV Main Transmission Substation',
        type: 'substation',
        district: 'South 24 Parganas',
        lat: 21.874,
        lng: 88.188,
        elevationM: 1.4,
        criticalityScore: 92,
        populationServed: 185000,
        backupPowerAvailable: false,
      },
      {
        id: 'sub-sundar-02',
        name: 'Gosaba Island 33/11kV Distribution Substation',
        type: 'substation',
        district: 'South 24 Parganas',
        lat: 22.164,
        lng: 88.802,
        elevationM: 1.1,
        criticalityScore: 88,
        populationServed: 95000,
        backupPowerAvailable: false,
      },
      {
        id: 'sub-sundar-03',
        name: 'Canning 132kV Estuary Grid Hub',
        type: 'substation',
        district: 'South 24 Parganas',
        lat: 22.312,
        lng: 88.665,
        elevationM: 2.2,
        criticalityScore: 84,
        populationServed: 160000,
        backupPowerAvailable: true,
      },
      {
        id: 'sub-sundar-04',
        name: 'Digha Coastal 132kV Tourist & Naval Substation',
        type: 'substation',
        district: 'East Medinipur',
        lat: 21.628,
        lng: 87.512,
        elevationM: 1.8,
        criticalityScore: 78,
        populationServed: 110000,
        backupPowerAvailable: false,
      },
      {
        id: 'sub-sundar-05',
        name: 'Haldia Industrial Port 220kV Extra High Voltage Hub',
        type: 'substation',
        district: 'East Medinipur',
        lat: 22.062,
        lng: 88.085,
        elevationM: 3.1,
        criticalityScore: 95,
        populationServed: 240000,
        backupPowerAvailable: true,
      },

      // Hospitals & Medical
      {
        id: 'hosp-sundar-01',
        name: 'Kakdwip Sub-Divisional General Hospital',
        type: 'hospital',
        district: 'South 24 Parganas',
        lat: 21.881,
        lng: 88.192,
        elevationM: 1.9,
        criticalityScore: 96,
        populationServed: 140000,
        backupPowerAvailable: false, // vulnerable!
        poweredBySubstationId: 'sub-sundar-01',
        soleAccessRoadId: 'road-sundar-01',
      },
      {
        id: 'hosp-sundar-02',
        name: 'Gosaba Rural Hospital & Trauma Center',
        type: 'hospital',
        district: 'South 24 Parganas',
        lat: 22.158,
        lng: 88.809,
        elevationM: 1.3,
        criticalityScore: 91,
        populationServed: 65000,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-sundar-02',
        soleAccessRoadId: 'road-sundar-02',
      },
      {
        id: 'hosp-sundar-03',
        name: 'Canning Sub-Divisional Referral Hospital',
        type: 'hospital',
        district: 'South 24 Parganas',
        lat: 22.316,
        lng: 88.662,
        elevationM: 2.6,
        criticalityScore: 89,
        populationServed: 175000,
        backupPowerAvailable: true,
        poweredBySubstationId: 'sub-sundar-03',
        soleAccessRoadId: 'road-sundar-03',
      },
      {
        id: 'hosp-sundar-04',
        name: 'Digha State General Hospital',
        type: 'hospital',
        district: 'East Medinipur',
        lat: 21.632,
        lng: 87.525,
        elevationM: 2.1,
        criticalityScore: 86,
        populationServed: 80000,
        backupPowerAvailable: true,
        poweredBySubstationId: 'sub-sundar-04',
        soleAccessRoadId: 'road-sundar-04',
      },
      {
        id: 'clinic-sundar-01',
        name: 'Sagar Island Block Primary Health Centre',
        type: 'clinic',
        district: 'South 24 Parganas',
        lat: 21.645,
        lng: 88.081,
        elevationM: 1.2,
        criticalityScore: 82,
        populationServed: 45000,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-sundar-01',
      },

      // Shelters
      {
        id: 'shelter-sundar-01',
        name: 'Sagar Island South Multipurpose Cyclone Shelter (CS-14)',
        type: 'shelter',
        district: 'South 24 Parganas',
        lat: 21.615,
        lng: 88.055,
        elevationM: 2.8,
        criticalityScore: 94,
        populationServed: 3500,
        backupPowerAvailable: true,
        poweredBySubstationId: 'sub-sundar-01',
      },
      {
        id: 'shelter-sundar-02',
        name: 'Namkhana Embankment Community Cyclone Shelter',
        type: 'shelter',
        district: 'South 24 Parganas',
        lat: 21.765,
        lng: 88.232,
        elevationM: 2.2,
        criticalityScore: 90,
        populationServed: 2800,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-sundar-01',
        soleAccessRoadId: 'road-sundar-01',
      },
      {
        id: 'shelter-sundar-03',
        name: 'Basanti Estuary High School Disaster Shelter',
        type: 'shelter',
        district: 'South 24 Parganas',
        lat: 22.195,
        lng: 88.715,
        elevationM: 1.7,
        criticalityScore: 87,
        populationServed: 2200,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-sundar-02',
        soleAccessRoadId: 'road-sundar-02',
      },
      {
        id: 'shelter-sundar-04',
        name: 'Digha Coastal High School Shelter',
        type: 'shelter',
        district: 'East Medinipur',
        lat: 21.638,
        lng: 87.545,
        elevationM: 3.2,
        criticalityScore: 79,
        populationServed: 1800,
        backupPowerAvailable: true,
        poweredBySubstationId: 'sub-sundar-04',
      },

      // Arterial Roads & Bridges
      {
        id: 'road-sundar-01',
        name: 'NH-117 Diamond Harbour - Kakdwip Arterial Highway',
        type: 'road',
        district: 'South 24 Parganas',
        lat: 21.912,
        lng: 88.181,
        elevationM: 1.5,
        criticalityScore: 95,
        populationServed: 250000,
        backupPowerAvailable: false,
      },
      {
        id: 'road-sundar-02',
        name: 'Gosaba - Gadkhali Island Ferry Access Causeway',
        type: 'road',
        district: 'South 24 Parganas',
        lat: 22.172,
        lng: 88.791,
        elevationM: 0.9,
        criticalityScore: 92,
        populationServed: 95000,
        backupPowerAvailable: false,
      },
      {
        id: 'road-sundar-03',
        name: 'SH-3 Canning - Baruipur Coastal Access Corridor',
        type: 'road',
        district: 'South 24 Parganas',
        lat: 22.325,
        lng: 88.648,
        elevationM: 2.1,
        criticalityScore: 88,
        populationServed: 190000,
        backupPowerAvailable: false,
      },
      {
        id: 'road-sundar-04',
        name: 'NH-116B Contai - Digha Coastal Lifeline',
        type: 'road',
        district: 'East Medinipur',
        lat: 21.642,
        lng: 87.538,
        elevationM: 1.8,
        criticalityScore: 90,
        populationServed: 140000,
        backupPowerAvailable: false,
      },
      {
        id: 'bridge-sundar-01',
        name: 'Hatania-Doania River Bridge (Namkhana)',
        type: 'bridge',
        district: 'South 24 Parganas',
        lat: 21.775,
        lng: 88.241,
        elevationM: 4.8,
        criticalityScore: 96,
        populationServed: 300000,
        backupPowerAvailable: false,
      },
    ];
  }

  private getOdishaAssets(): InfrastructureAsset[] {
    return [
      {
        id: 'sub-odisha-01',
        name: 'Puri Samuka 220/132kV Coastal Grid Substation',
        type: 'substation',
        district: 'Puri',
        lat: 19.805,
        lng: 85.815,
        elevationM: 2.1,
        criticalityScore: 94,
        populationServed: 210000,
        backupPowerAvailable: false,
      },
      {
        id: 'sub-odisha-02',
        name: 'Paradip Port 220kV Heavy Industrial Substation',
        type: 'substation',
        district: 'Jagatsinghpur',
        lat: 20.275,
        lng: 86.685,
        elevationM: 2.8,
        criticalityScore: 97,
        populationServed: 280000,
        backupPowerAvailable: true,
      },
      {
        id: 'sub-odisha-03',
        name: 'Kendrapara 132/33kV District Transmission Hub',
        type: 'substation',
        district: 'Kendrapara',
        lat: 20.505,
        lng: 86.425,
        elevationM: 3.4,
        criticalityScore: 86,
        populationServed: 160000,
        backupPowerAvailable: false,
      },
      {
        id: 'sub-odisha-04',
        name: 'Bhubaneswar South Chandaka 400kV Super Grid',
        type: 'substation',
        district: 'Khordha',
        lat: 20.298,
        lng: 85.782,
        elevationM: 22.0,
        criticalityScore: 99,
        populationServed: 850000,
        backupPowerAvailable: true,
      },

      // Hospitals
      {
        id: 'hosp-odisha-01',
        name: 'District Sadar Hospital Puri',
        type: 'hospital',
        district: 'Puri',
        lat: 19.814,
        lng: 85.828,
        elevationM: 3.2,
        criticalityScore: 96,
        populationServed: 180000,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-odisha-01',
        soleAccessRoadId: 'road-odisha-01',
      },
      {
        id: 'hosp-odisha-02',
        name: 'Paradip Port Trust Hospital & ICU',
        type: 'hospital',
        district: 'Jagatsinghpur',
        lat: 20.282,
        lng: 86.692,
        elevationM: 2.9,
        criticalityScore: 93,
        populationServed: 95000,
        backupPowerAvailable: true,
        poweredBySubstationId: 'sub-odisha-02',
        soleAccessRoadId: 'road-odisha-02',
      },
      {
        id: 'hosp-odisha-03',
        name: 'AIIMS Bhubaneswar Tertiary Trauma Center',
        type: 'hospital',
        district: 'Khordha',
        lat: 20.231,
        lng: 85.775,
        elevationM: 18.5,
        criticalityScore: 98,
        populationServed: 500000,
        backupPowerAvailable: true,
        poweredBySubstationId: 'sub-odisha-04',
      },

      // Shelters
      {
        id: 'shelter-odisha-01',
        name: 'Astaranga Coastal Multipurpose Cyclone Shelter',
        type: 'shelter',
        district: 'Puri',
        lat: 19.982,
        lng: 86.265,
        elevationM: 2.2,
        criticalityScore: 92,
        populationServed: 3200,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-odisha-01',
      },
      {
        id: 'shelter-odisha-02',
        name: 'Ersama Super-Cyclone Memorial Shelter',
        type: 'shelter',
        district: 'Jagatsinghpur',
        lat: 20.185,
        lng: 86.612,
        elevationM: 1.9,
        criticalityScore: 95,
        populationServed: 4000,
        backupPowerAvailable: false,
        poweredBySubstationId: 'sub-odisha-02',
        soleAccessRoadId: 'road-odisha-02',
      },

      // Roads
      {
        id: 'road-odisha-01',
        name: 'NH-316 Bhubaneswar - Puri Jagannath Expressway',
        type: 'road',
        district: 'Puri',
        lat: 19.865,
        lng: 85.835,
        elevationM: 2.8,
        criticalityScore: 97,
        populationServed: 400000,
        backupPowerAvailable: false,
      },
      {
        id: 'road-odisha-02',
        name: 'SH-12 Cuttack - Paradip Port Heavy Freight Highway',
        type: 'road',
        district: 'Jagatsinghpur',
        lat: 20.292,
        lng: 86.645,
        elevationM: 2.0,
        criticalityScore: 94,
        populationServed: 280000,
        backupPowerAvailable: false,
      },
    ];
  }
}
