import React from 'react';
import { CycloneScenario, AlertLevel, HazardSummary } from '../../shared/types.js';
import { 
  AlertTriangle, 
  Play, 
  CloudRain, 
  FileText, 
  HelpCircle, 
  Clock, 
  Users, 
  ShieldAlert, 
  Waves 
} from 'lucide-react';

interface TopBarProps {
  scenario: CycloneScenario;
  summary?: HazardSummary;
  onRunDemo: () => void;
  onSyncWeather: () => void;
  onOpenSitRep: () => void;
  onOpenAssumptions: () => void;
  isWeatherSyncing: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  scenario,
  summary,
  onRunDemo,
  onSyncWeather,
  onOpenSitRep,
  onOpenAssumptions,
  isWeatherSyncing,
}) => {
  const alertLevels: { level: AlertLevel; hours: string; color: string }[] = [
    { level: 'Watch (72h)', hours: '72h', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
    { level: 'Warning (48h)', hours: '48h', color: 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10' },
    { level: 'Emergency (24h)', hours: '24h', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
    { level: 'Landfall (0-6h)', hours: '0-6h', color: 'border-red-500/50 text-red-400 bg-red-500/10 animate-pulse' },
  ];

  const currentLevel = summary?.alertLevel || 'Emergency (24h)';

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Persistent Ethics & Safety Banner */}
      <div className="bg-amber-950/60 border-b border-amber-800/40 px-4 py-1 text-xs text-amber-300 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Decision-Support Prototype:</strong> Not an official operational forecast. Always adhere to IMD, NDMA, and national disaster authority advisories.
          </span>
        </div>
        <button
          onClick={onOpenAssumptions}
          className="text-amber-200 underline hover:text-white transition-colors cursor-pointer text-[11px]"
        >
          Model Assumptions & Limitations
        </button>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Active Scenario */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/20 text-white font-black text-sm">
              <span className="animate-spin duration-3000">🌀</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  CycloneSight
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                    APAC Pre-Landfall
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                AI Infrastructure Vulnerability & Parametric Forecaster
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Scenario Info Tag */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Replay:</span>
            <span className="font-semibold text-slate-200">{scenario.name}</span>
            {scenario.isApproximateReplay && (
              <span className="text-[10px] text-amber-400 bg-amber-950/50 px-1 rounded">Approximate</span>
            )}
          </div>
        </div>

        {/* Alert Ladder Stage */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-slate-400 hidden xl:inline">Alert Ladder:</span>
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            {alertLevels.map((lvl) => {
              const isActive = lvl.level === currentLevel;
              return (
                <div
                  key={lvl.level}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                    isActive
                      ? `${lvl.color} font-bold shadow-sm ring-1 ring-white/20`
                      : 'text-slate-500 opacity-60'
                  }`}
                  title={`Stage: ${lvl.level}`}
                >
                  {lvl.hours}
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Real-Time Metrics */}
        {summary && (
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Landfall:</span>
              <span className="font-mono font-bold text-cyan-300">T-{summary.hoursToLandfall}h</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Pop Exposed:</span>
              <span className="font-mono font-bold text-amber-300">
                {summary.overallPopulationAtRisk.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-slate-400">Critical Infra:</span>
              <span className="font-mono font-bold text-rose-300">
                {summary.totalCriticalAssets} Critical
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Peak Surge:</span>
              <span className="font-mono font-bold text-blue-300">{summary.maxSurgeDepthM}m</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* 1-Click Scripted Demo Button */}
          <button
            onClick={onRunDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950 transition-all cursor-pointer ring-1 ring-emerald-400/30"
            title="Launch automated Amphan 2020 walkthrough"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Demo</span>
          </button>

          {/* Sync Open-Meteo Live Forecast */}
          <button
            onClick={onSyncWeather}
            disabled={isWeatherSyncing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Fetch live rainfall and wind from Open-Meteo"
          >
            <CloudRain className={`w-3.5 h-3.5 text-cyan-400 ${isWeatherSyncing ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isWeatherSyncing ? 'Syncing...' : 'Live Weather'}</span>
          </button>

          {/* Export SitRep */}
          <button
            onClick={onOpenSitRep}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open Situation Report for printing or PDF export"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">SitRep</span>
          </button>

          {/* Assumptions */}
          <button
            onClick={onOpenAssumptions}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="View Model Assumptions & GEE Methodology"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
