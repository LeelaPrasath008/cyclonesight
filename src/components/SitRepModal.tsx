import React from 'react';
import { CycloneScenario, HazardSummary, InfrastructureAsset } from '../../shared/types.js';
import { Printer, Download, X, AlertTriangle, FileText } from 'lucide-react';

interface SitRepModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: CycloneScenario;
  summary?: HazardSummary;
  assets: InfrastructureAsset[];
}

export const SitRepModal: React.FC<SitRepModalProps> = ({
  isOpen,
  onClose,
  scenario,
  summary,
  assets,
}) => {
  if (!isOpen) return null;

  const topAssets = assets
    .filter((a) => a.risk?.band === 'Critical' || a.risk?.band === 'High')
    .slice(0, 10);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Pre-Landfall Situation Report (SitRep)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-200 space-y-4 font-sans print:bg-white print:text-black">
          {/* Header banner */}
          <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                EMERGENCY OPERATIONS INTELLIGENCE BRIEFING
              </div>
              <h1 className="text-xl font-black text-white mt-0.5">
                CycloneSight Incident SitRep: {scenario.name}
              </h1>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Generated: {new Date().toUTCString()} | Region: {scenario.regionName}
              </div>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold text-xs uppercase">
                {summary?.alertLevel || 'Emergency (24h)'}
              </span>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Landfall: <strong className="text-cyan-400">T-{summary?.hoursToLandfall || 24} Hours</strong>
              </div>
            </div>
          </div>

          {/* Key Incident Telemetry */}
          <div className="grid grid-cols-4 gap-2 font-mono text-center">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">MAX SUSTAINED WIND</div>
              <div className="text-lg font-black text-cyan-400">{scenario.parameters.maxSustainedWindKmh} km/h</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">PEAK STORM SURGE</div>
              <div className="text-lg font-black text-blue-400">{summary?.maxSurgeDepthM || 3.8} m</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">POPULATION EXPOSED</div>
              <div className="text-lg font-black text-amber-400">{summary?.overallPopulationAtRisk.toLocaleString() || '180,000'}</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">CRITICAL INFRA AT RISK</div>
              <div className="text-lg font-black text-rose-400">{summary?.totalCriticalAssets || 5} Facilities</div>
            </div>
          </div>

          {/* District Breakdown */}
          <div className="space-y-1.5">
            <h3 className="font-mono text-xs uppercase font-bold text-slate-300">
              District Impact & Evacuation Metrics
            </h3>
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900">
                  <th className="p-2">District</th>
                  <th className="p-2">Population at Risk</th>
                  <th className="p-2">Peak Surge</th>
                  <th className="p-2">Flooded Area</th>
                  <th className="p-2">Critical Assets</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.districtStats || []).map((d) => (
                  <tr key={d.district} className="border-b border-slate-800/60">
                    <td className="p-2 font-bold text-white">{d.district}</td>
                    <td className="p-2 text-amber-300">{d.populationAtRisk.toLocaleString()}</td>
                    <td className="p-2 text-cyan-300">{d.peakSurgeM} m</td>
                    <td className="p-2">{d.floodedAreaKm2} km²</td>
                    <td className="p-2 text-rose-400 font-bold">{d.criticalAssetsCount} Critical</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Vulnerable Assets Table */}
          <div className="space-y-1.5">
            <h3 className="font-mono text-xs uppercase font-bold text-slate-300">
              Top Infrastructure Vulnerability & Mitigation Directives
            </h3>
            <div className="space-y-2">
              {topAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase">
                        [{asset.type}]
                      </span>
                      <strong className="text-white">{asset.name}</strong>
                      <span className="text-[10px] text-slate-400">({asset.district})</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Mitigation: {asset.risk?.mitigation}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      Score: {asset.risk?.score} ({asset.risk?.band})
                    </span>
                    <div className="text-[10px] text-cyan-400 mt-1">
                      Lead Time: T-{asset.risk?.leadTimeHours}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer Footer */}
          <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500 leading-relaxed">
            ⚠️ <strong>Legal & Operational Disclaimer:</strong> CycloneSight is an AI-assisted geospatial decision-support prototype. Data is provided for pre-landfall planning and parametric index modeling. Not an official meteorological forecast. Final directives must follow the India Meteorological Department (IMD) and National Disaster Management Authority (NDMA).
          </div>
        </div>
      </div>
    </div>
  );
};
