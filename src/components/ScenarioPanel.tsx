import React from 'react';
import { CycloneScenario } from '../../shared/types.js';
import { 
  Wind, 
  Gauge, 
  Compass, 
  Activity, 
  MapPin, 
  CloudRain, 
  RotateCcw, 
  Sliders, 
  Layers,
  ChevronDown,
  Navigation
} from 'lucide-react';

interface ScenarioPanelProps {
  scenarios: CycloneScenario[];
  activeScenario: CycloneScenario;
  onSelectScenario: (scenario: CycloneScenario) => void;
  landfallShiftKm: number;
  onLandfallShiftChange: (shift: number) => void;
  onParameterChange: (key: keyof CycloneScenario['parameters'], value: any) => void;
  onTideChange: (tide: number) => void;
  onResetScenario: () => void;
  isSelectingLandfallOnMap: boolean;
  onToggleMapLandfallSelection: () => void;
  isCalculating: boolean;
}

export const ScenarioPanel: React.FC<ScenarioPanelProps> = ({
  scenarios,
  activeScenario,
  onSelectScenario,
  landfallShiftKm,
  onLandfallShiftChange,
  onParameterChange,
  onTideChange,
  onResetScenario,
  isSelectingLandfallOnMap,
  onToggleMapLandfallSelection,
  isCalculating,
}) => {
  const p = activeScenario.parameters;

  return (
    <div className="flex flex-col h-full bg-slate-950/95 border-r border-slate-800 text-slate-200 overflow-y-auto w-full md:w-80 lg:w-96 text-xs p-3.5 space-y-4">
      {/* Header & Scenario Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Cyclone Scenario Replay
          </label>
          {isCalculating && (
            <span className="text-[10px] text-cyan-400 animate-pulse font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Computing...
            </span>
          )}
        </div>

        <div className="relative">
          <select
            value={activeScenario.id}
            onChange={(e) => {
              const selected = scenarios.find((s) => s.id === e.target.value);
              if (selected) onSelectScenario(selected);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500 hover:border-slate-600 transition-colors"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} ({sc.year}) — {sc.regionName}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/80">
          {activeScenario.historicalNote}
        </p>
      </div>

      {/* Landfall Relocation Interactive Mode */}
      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            Landfall Position
          </span>
          <button
            onClick={onResetScenario}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset parameters to historical values"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex justify-between">
          <span>Lat: {activeScenario.landfall.lat.toFixed(2)}°N</span>
          <span>Lng: {activeScenario.landfall.lng.toFixed(2)}°E</span>
        </div>

        <button
          onClick={onToggleMapLandfallSelection}
          className={`w-full py-1.5 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
            isSelectingLandfallOnMap
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/30 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {isSelectingLandfallOnMap ? 'Click anywhere on map to drop eye' : 'Relocate Landfall by Map Click'}
        </button>

        {/* Coastal Shift Slider */}
        <div className="pt-1 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Shift along coastline:</span>
            <span className="font-mono text-cyan-300">
              {landfallShiftKm > 0 ? `+${landfallShiftKm} km (NE)` : landfallShiftKm < 0 ? `${landfallShiftKm} km (SW)` : '0 km (Exact)'}
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={landfallShiftKm}
            onChange={(e) => onLandfallShiftChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* What-If Intensity & Physics Sliders */}
      <div className="space-y-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            What-If Hazard Sliders
          </span>
          <span className="text-[10px] text-slate-500">Live Recalculation</span>
        </div>

        {/* 1. Max Sustained Wind */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-400" /> Max Sustained Wind:
            </span>
            <span className="font-mono font-bold text-cyan-300">{p.maxSustainedWindKmh} km/h</span>
          </div>
          <input
            type="range"
            min="100"
            max="260"
            step="5"
            value={p.maxSustainedWindKmh}
            onChange={(e) => onParameterChange('maxSustainedWindKmh', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Cat 1 (120)</span>
            <span>Cat 3 (165)</span>
            <span>Super Cyclone (220+)</span>
          </div>
        </div>

        {/* 2. Central Pressure */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-purple-400" /> Central Pressure:
            </span>
            <span className="font-mono font-bold text-purple-300">{p.centralPressureHpa} hPa</span>
          </div>
          <input
            type="range"
            min="900"
            max="995"
            step="2"
            value={p.centralPressureHpa}
            onChange={(e) => onParameterChange('centralPressureHpa', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
        </div>

        {/* 3. Astronomical Tide */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-blue-400" /> Landfall Tide Level:
            </span>
            <span className="font-mono font-bold text-blue-300">
              +{activeScenario.landfall.tideLevelM.toFixed(1)} m (MSL)
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="2.8"
            step="0.1"
            value={activeScenario.landfall.tideLevelM}
            onChange={(e) => onTideChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Neap (0.5m)</span>
            <span>Mean (1.2m)</span>
            <span>Spring High Tide (2.5m)</span>
          </div>
        </div>

        {/* 4. Radius of Max Winds */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Radius of Max Winds (RMW):</span>
            <span className="font-mono font-bold text-emerald-300">{p.radiusMaxWindKm} km</span>
          </div>
          <input
            type="range"
            min="15"
            max="70"
            step="1"
            value={p.radiusMaxWindKm}
            onChange={(e) => onParameterChange('radiusMaxWindKm', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* 5. 24h Precipitation */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-cyan-400" /> 24h Forecast Rainfall:
            </span>
            <span className="font-mono font-bold text-cyan-300">{p.rainfall24hMm} mm</span>
          </div>
          <input
            type="range"
            min="50"
            max="450"
            step="10"
            value={p.rainfall24hMm}
            onChange={(e) => onParameterChange('rainfall24hMm', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* 6. Inland Surge Attenuation */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Inland Surge Decay Rate:</span>
            <span className="font-mono font-bold text-amber-300">{p.inlandAttenuationMPerKm} m / km</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="0.8"
            step="0.05"
            value={p.inlandAttenuationMPerKm}
            onChange={(e) => onParameterChange('inlandAttenuationMPerKm', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* 7. Soil Moisture Condition (AMC) */}
        <div className="space-y-1">
          <span className="text-slate-400 text-[11px] block">Soil Saturation (SCS AMC):</span>
          <div className="grid grid-cols-3 gap-1">
            {(['dry', 'moderate', 'saturated'] as const).map((amc) => (
              <button
                key={amc}
                onClick={() => onParameterChange('antecedentMoistureCondition', amc)}
                className={`py-1 rounded text-[10px] font-mono uppercase cursor-pointer transition-all border ${
                  p.antecedentMoistureCondition === amc
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {amc === 'dry' ? 'AMC I (Dry)' : amc === 'moderate' ? 'AMC II (Norm)' : 'AMC III (Wet)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Track Waypoint History */}
      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          Track Trajectory ({activeScenario.track.length} Waypoints)
        </span>
        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
          {activeScenario.track.map((pt, idx) => (
            <div
              key={idx}
              className={`p-1.5 rounded flex items-center justify-between text-[10px] font-mono ${
                pt.hoursToLandfall === 0
                  ? 'bg-rose-950/60 border border-rose-800 text-rose-300 font-bold'
                  : 'bg-slate-900 border border-slate-800/80 text-slate-400'
              }`}
            >
              <div>
                <span>{pt.hoursToLandfall === 0 ? 'LANDFALL' : `T-${pt.hoursToLandfall}h`}</span>
                <span className="text-slate-500 ml-1.5">({pt.lat.toFixed(1)}°, {pt.lng.toFixed(1)}°)</span>
              </div>
              <div className="text-right">
                <span className="text-cyan-300 font-semibold">{pt.maxWindKmh} km/h</span>
                <span className="text-slate-500 ml-1">{pt.centralPressureHpa} hPa</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
