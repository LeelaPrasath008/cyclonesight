import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { 
  CycloneScenario, 
  HazardCell, 
  HazardSummary, 
  InfrastructureAsset, 
  RiskBand 
} from '../../shared/types.js';
import { 
  Camera, 
  Layers, 
  Eye, 
  ShieldAlert, 
  Waves, 
  Wind, 
  CloudRain, 
  Sparkles, 
  Loader2, 
  ExternalLink 
} from 'lucide-react';

interface MapViewProps {
  scenario: CycloneScenario;
  summary?: HazardSummary;
  gridCells: HazardCell[];
  assets: InfrastructureAsset[];
  isSelectingLandfallOnMap: boolean;
  onMapClickLandfall: (lat: number, lng: number) => void;
  onSelectAsset: (asset: InfrastructureAsset) => void;
  selectedAssetId?: string;
  onAnalyzeMapScreenshot: (base64Image: string) => void;
  isAnalyzingImagery: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  scenario,
  summary,
  gridCells,
  assets,
  isSelectingLandfallOnMap,
  onMapClickLandfall,
  onSelectAsset,
  selectedAssetId,
  onAnalyzeMapScreenshot,
  isAnalyzingImagery,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer toggles
  const [showSurge, setShowSurge] = useState(true);
  const [showRain, setShowRain] = useState(true);
  const [showWind, setShowWind] = useState(false);
  const [showCompound, setShowCompound] = useState(false);
  const [showAssets, setShowAssets] = useState(true);
  const [showTrack, setShowTrack] = useState(true);

  // Layer groups refs
  const surgeLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const rainLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const windLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const compoundLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const assetsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const trackLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: scenario.center,
      zoom: scenario.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Dark Matter tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Add layer groups
    surgeLayerRef.current.addTo(map);
    rainLayerRef.current.addTo(map);
    windLayerRef.current.addTo(map);
    compoundLayerRef.current.addTo(map);
    assetsLayerRef.current.addTo(map);
    trackLayerRef.current.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view on scenario center/zoom change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(scenario.center, scenario.zoom, { animate: true });
    }
  }, [scenario.id]);

  // Handle map click for landfall relocation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isSelectingLandfallOnMap) {
        onMapClickLandfall(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isSelectingLandfallOnMap, onMapClickLandfall]);

  // Render Cyclone Track & Cone of Uncertainty
  useEffect(() => {
    const layer = trackLayerRef.current;
    layer.clearLayers();
    if (!showTrack) return;

    const trackPoints = scenario.track.map((pt) => [pt.lat, pt.lng] as [number, number]);

    // Track polyline
    const polyline = L.polyline(trackPoints, {
      color: '#38bdf8',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.85,
    });
    layer.addLayer(polyline);

    // Waypoint circle markers
    scenario.track.forEach((pt) => {
      const isLandfall = pt.hoursToLandfall === 0;
      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: isLandfall ? 9 : 5,
        fillColor: isLandfall ? '#ef4444' : '#0284c7',
        fillOpacity: 0.9,
        color: '#ffffff',
        weight: isLandfall ? 2.5 : 1.5,
      });

      marker.bindTooltip(
        `<div class="p-1 font-mono text-xs">
          <strong>${isLandfall ? 'LANDFALL EYE' : `T-${pt.hoursToLandfall}h`}</strong><br/>
          Wind: ${pt.maxWindKmh} km/h<br/>
          Pressure: ${pt.centralPressureHpa} hPa
        </div>`,
        { className: 'bg-slate-900 text-slate-100 border border-slate-700 rounded shadow-lg' }
      );

      layer.addLayer(marker);
    });

    // Eye Landfall Radius of Max Winds Circle
    const rmwCircle = L.circle([scenario.landfall.lat, scenario.landfall.lng], {
      radius: scenario.parameters.radiusMaxWindKm * 1000,
      color: '#f43f5e',
      weight: 2,
      fillColor: '#f43f5e',
      fillOpacity: 0.12,
      dashArray: '4, 4',
    });
    rmwCircle.bindTooltip(`Radius of Maximum Winds: ${scenario.parameters.radiusMaxWindKm} km`, {
      className: 'bg-slate-900 text-slate-200 border border-slate-700',
    });
    layer.addLayer(rmwCircle);
  }, [scenario, showTrack]);

  // Render Storm Surge Inundation Grid
  useEffect(() => {
    const layer = surgeLayerRef.current;
    layer.clearLayers();
    if (!showSurge) return;

    for (const cell of gridCells) {
      if (cell.surgeDepthM <= 0.1) continue;

      let color = '#22d3ee'; // < 1.0m (Cyan)
      let fillOpacity = 0.45;
      if (cell.surgeDepthM >= 3.5) {
        color = '#dc2626'; // > 3.5m (Red)
        fillOpacity = 0.75;
      } else if (cell.surgeDepthM >= 2.0) {
        color = '#f97316'; // 2.0 - 3.5m (Orange/Amber)
        fillOpacity = 0.65;
      } else if (cell.surgeDepthM >= 1.0) {
        color = '#0284c7'; // 1.0 - 2.0m (Blue)
        fillOpacity = 0.55;
      }

      const circle = L.circle([cell.lat, cell.lng], {
        radius: 4200, // cell radius in meters
        color,
        weight: 1,
        fillColor: color,
        fillOpacity,
      });

      circle.bindTooltip(
        `<div class="p-1 font-mono text-xs">
          <strong>Surge Inundation</strong><br/>
          Depth: <span class="font-bold text-cyan-400">${cell.surgeDepthM} m</span><br/>
          Terrain Elev: ${cell.elevationM} m
        </div>`,
        { className: 'bg-slate-950 text-slate-100 border border-slate-700' }
      );

      layer.addLayer(circle);
    }
  }, [gridCells, showSurge]);

  // Render Rain Runoff & Ponding Grid
  useEffect(() => {
    const layer = rainLayerRef.current;
    layer.clearLayers();
    if (!showRain) return;

    for (const cell of gridCells) {
      if (cell.rainRunoffMm <= 60) continue;

      const circle = L.circle([cell.lat, cell.lng], {
        radius: 3800,
        color: '#6366f1',
        weight: 0.8,
        fillColor: '#818cf8',
        fillOpacity: Math.min(0.6, (cell.rainRunoffMm / 300) * 0.6),
      });

      circle.bindTooltip(
        `<div class="p-1 font-mono text-xs">
          <strong>Rainfall Runoff Ponding</strong><br/>
          Runoff: <span class="font-bold text-indigo-300">${cell.rainRunoffMm} mm</span>
        </div>`,
        { className: 'bg-slate-950 text-slate-100 border border-slate-700' }
      );

      layer.addLayer(circle);
    }
  }, [gridCells, showRain]);

  // Render Wind Field Isotachs
  useEffect(() => {
    const layer = windLayerRef.current;
    layer.clearLayers();
    if (!showWind) return;

    for (const cell of gridCells) {
      if (cell.windSpeedKmh < 80) continue;

      let color = '#38bdf8';
      if (cell.windSpeedKmh >= 180) color = '#f43f5e';
      else if (cell.windSpeedKmh >= 140) color = '#fb923c';
      else if (cell.windSpeedKmh >= 110) color = '#facc15';

      const circle = L.circle([cell.lat, cell.lng], {
        radius: 4000,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.4,
      });

      circle.bindTooltip(
        `<div class="p-1 font-mono text-xs">
          <strong>Sustained Wind</strong><br/>
          Speed: ${cell.windSpeedKmh} km/h (RFQ Asymmetric)
        </div>`,
        { className: 'bg-slate-950 text-slate-100 border border-slate-700' }
      );

      layer.addLayer(circle);
    }
  }, [gridCells, showWind]);

  // Render Compound Multi-Hazard
  useEffect(() => {
    const layer = compoundLayerRef.current;
    layer.clearLayers();
    if (!showCompound) return;

    for (const cell of gridCells) {
      if (cell.compoundRisk < 40) continue;

      const circle = L.circle([cell.lat, cell.lng], {
        radius: 4200,
        color: cell.compoundRisk > 75 ? '#e11d48' : '#eab308',
        weight: 1.5,
        fillColor: cell.compoundRisk > 75 ? '#e11d48' : '#eab308',
        fillOpacity: 0.55,
      });

      circle.bindTooltip(
        `<div class="p-1 font-mono text-xs">
          <strong>Compound Multi-Hazard Index</strong><br/>
          Score: <span class="font-bold text-amber-400">${cell.compoundRisk} / 100</span><br/>
          (Surge + Rainfall Runoff + Wind Field)
        </div>`,
        { className: 'bg-slate-950 text-slate-100 border border-slate-700' }
      );

      layer.addLayer(circle);
    }
  }, [gridCells, showCompound]);

  // Render Infrastructure Assets Markers
  useEffect(() => {
    const layer = assetsLayerRef.current;
    layer.clearLayers();
    if (!showAssets) return;

    assets.forEach((asset) => {
      const riskScore = asset.risk?.score || 0;
      const band = asset.risk?.band || 'Low';

      // Color-blind safe colors:
      // Low: Slate-400 (#94a3b8)
      // Moderate: Blue/Cyan (#38bdf8)
      // High: Amber (#f59e0b)
      // Critical: Rose/Crimson (#e11d48)
      let pinColor = '#38bdf8';
      if (band === 'Critical') pinColor = '#e11d48';
      else if (band === 'High') pinColor = '#f59e0b';
      else if (band === 'Low') pinColor = '#94a3b8';

      const isSelected = asset.id === selectedAssetId;

      // Icon symbol based on type
      const iconSymbol =
        asset.type === 'hospital'
          ? '🏥'
          : asset.type === 'substation'
          ? '⚡'
          : asset.type === 'shelter'
          ? '🛡️'
          : asset.type === 'road'
          ? '🛣️'
          : asset.type === 'bridge'
          ? '🌉'
          : '🩺';

      const customIcon = L.divIcon({
        className: 'custom-asset-icon',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform transform ${
            isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'hover:scale-110'
          }" style="width: 32px; height: 32px;">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg border-2" style="background-color: #0f172a; border-color: ${pinColor}; box-shadow: 0 0 12px ${pinColor}80;">
              ${iconSymbol}
            </div>
            ${
              asset.risk?.isSinglePointOfFailure
                ? `<span class="absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-black px-1 rounded-full border border-black animate-pulse">SPOF</span>`
                : ''
            }
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([asset.lat, asset.lng], { icon: customIcon });

      const popupContent = `
        <div class="text-xs font-sans text-slate-100 p-1 min-w-[240px] space-y-2">
          <div class="border-b border-slate-700 pb-1.5 flex items-start justify-between gap-2">
            <div>
              <span class="text-[10px] font-mono uppercase text-slate-400 font-bold">${asset.type}</span>
              <h4 class="font-bold text-sm text-white">${asset.name}</h4>
              <span class="text-[10px] text-slate-400">${asset.district} | Elev: ${asset.elevationM}m</span>
            </div>
            <span class="px-2 py-0.5 rounded font-mono font-bold text-[10px]" style="background-color: ${pinColor}25; color: ${pinColor}; border: 1px solid ${pinColor}60;">
              ${band} (${riskScore})
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1 text-[11px] font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
            <div>Surge Depth: <strong class="text-cyan-300">${asset.exposure?.surgeDepthM || 0}m</strong></div>
            <div>Peak Wind: <strong class="text-purple-300">${asset.exposure?.windSpeedKmh || 0} km/h</strong></div>
            <div>Backup Power: <strong>${asset.backupPowerAvailable ? '✅ Yes' : '❌ NONE'}</strong></div>
            <div>Pop Served: <strong>${asset.populationServed.toLocaleString()}</strong></div>
          </div>

          ${
            asset.risk?.cascadeFailureReasons?.length
              ? `<div class="bg-rose-950/40 border border-rose-800/80 p-1.5 rounded text-[11px] text-rose-300 space-y-0.5">
                  <strong class="font-bold text-[10px] uppercase block">⚠️ Cascading Disruption:</strong>
                  ${asset.risk.cascadeFailureReasons.map((r) => `<div>• ${r}</div>`).join('')}
                </div>`
              : ''
          }

          <div class="bg-cyan-950/40 border border-cyan-800/60 p-1.5 rounded text-[11px] text-cyan-200">
            <strong class="font-bold text-[10px] uppercase block text-cyan-300">Recommended Mitigation:</strong>
            ${asset.risk?.mitigation || 'Inspect perimeter'}
            <div class="mt-1 font-mono text-[10px] text-cyan-400">⏱️ Lead-time requirement: ${asset.risk?.leadTimeHours || 12} hours</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup bg-slate-950 text-slate-100 rounded-lg shadow-2xl',
        maxWidth: 320,
      });

      marker.on('click', () => {
        onSelectAsset(asset);
      });

      layer.addLayer(marker);
    });
  }, [assets, showAssets, selectedAssetId, onSelectAsset]);

  // Capture Screenshot for Multimodal AI Analysis
  const handleCaptureScreenshot = async () => {
    if (!mapContainerRef.current) return;
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617',
        scale: 1.5,
      });
      const base64 = canvas.toDataURL('image/png');
      onAnalyzeMapScreenshot(base64);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
    }
  };

  return (
    <div className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden">
      {/* Map Element */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Crosshair Notice when Landfall Selection is Active */}
      {isSelectingLandfallOnMap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-rose-600/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-rose-400 animate-pulse pointer-events-none flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span>Click anywhere on the map to relocate the Cyclone Eye Landfall point</span>
        </div>
      )}

      {/* Floating Layer Controls */}
      <div className="absolute top-3 right-3 z-10 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 shadow-xl text-xs space-y-2 w-48">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-mono uppercase font-bold text-slate-300 text-[10px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Hazard Layers
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Toggle</span>
        </div>

        <div className="space-y-1">
          <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Waves className="w-3.5 h-3.5" /> Storm Surge
            </span>
            <input
              type="checkbox"
              checked={showSurge}
              onChange={(e) => setShowSurge(e.target.checked)}
              className="rounded accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <CloudRain className="w-3.5 h-3.5" /> Rain Runoff
            </span>
            <input
              type="checkbox"
              checked={showRain}
              onChange={(e) => setShowRain(e.target.checked)}
              className="rounded accent-indigo-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5 text-yellow-300">
              <Wind className="w-3.5 h-3.5" /> Wind Field (RFQ)
            </span>
            <input
              type="checkbox"
              checked={showWind}
              onChange={(e) => setShowWind(e.target.checked)}
              className="rounded accent-yellow-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5 text-rose-300">
              <ShieldAlert className="w-3.5 h-3.5" /> Compound Risk
            </span>
            <input
              type="checkbox"
              checked={showCompound}
              onChange={(e) => setShowCompound(e.target.checked)}
              className="rounded accent-rose-400 cursor-pointer"
            />
          </label>

          <div className="h-px bg-slate-800 my-1" />

          <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span>🏥</span> Infrastructure
            </span>
            <input
              type="checkbox"
              checked={showAssets}
              onChange={(e) => setShowAssets(e.target.checked)}
              className="rounded accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span>🌀</span> Track & Cone
            </span>
            <input
              type="checkbox"
              checked={showTrack}
              onChange={(e) => setShowTrack(e.target.checked)}
              className="rounded accent-cyan-400 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Multimodal AI Vision Screenshot Action Button */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleCaptureScreenshot}
          disabled={isAnalyzingImagery}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-2xl shadow-purple-950 transition-all cursor-pointer ring-1 ring-white/30 disabled:opacity-50"
        >
          {isAnalyzingImagery ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-200" />
          )}
          <span>{isAnalyzingImagery ? 'Gemini Analyzing...' : 'Analyze Map View with Gemini AI'}</span>
        </button>

        {/* Legend */}
        <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 shadow-xl text-[11px] font-mono space-y-1.5 text-slate-300 max-w-xs">
          <div className="font-bold text-slate-200 uppercase text-[10px]">Hazard Inundation Scale</div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shrink-0" />
            <span>&lt; 1.0 m (Shallow inundation)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shrink-0" />
            <span>1.0 - 2.5 m (Severe flooding)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
            <span>2.5 - 4.0 m (Extreme storm surge)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0" />
            <span>&gt; 4.0 m (Catastrophic sea intrusion)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
