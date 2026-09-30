import React, { useState } from 'react';
import { InsuranceTriggerStatus, HazardSummary } from '../../shared/types.js';
import { 
  ShieldCheck, 
  DollarSign, 
  Activity, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';

interface InsuranceTabProps {
  triggers: InsuranceTriggerStatus[];
  summary?: HazardSummary;
}

export const InsuranceTab: React.FC<InsuranceTabProps> = ({ triggers, summary }) => {
  const [selectedTrigger, setSelectedTrigger] = useState<InsuranceTriggerStatus | null>(triggers[0] || null);

  const totalEstimatedPayout = triggers.reduce((sum, t) => sum + t.estimatedPayoutUSD, 0);
  const totalPreposition = triggers.reduce((sum, t) => sum + t.recommendedPrepositionUSD, 0);

  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-hidden">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 p-3 rounded-xl space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Parametric Insurance Liquidity Engine
          </span>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
            Monte Carlo N=500
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Pre-landfall parametric triggers release rapid liquidity into municipal disaster accounts <strong>before</strong> the storm hits, funding fuel reserves, mobile generators, and immediate evacuation transport.
        </p>

        {/* Aggregated Payout Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
          <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Estimated Payout Demand</div>
            <div className="text-base font-black text-emerald-400">
              ${(totalEstimatedPayout / 1000000).toFixed(2)}M USD
            </div>
            <div className="text-[9px] text-slate-500">Illustrative Aggregate Pool</div>
          </div>

          <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Pre-position Liquidity (T-36h)</div>
            <div className="text-base font-black text-cyan-400">
              ${(totalPreposition / 1000000).toFixed(2)}M USD
            </div>
            <div className="text-[9px] text-slate-500">Recommended Instant Transfer</div>
          </div>
        </div>
      </div>

      {/* District Triggers List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
          District Parametric Trigger Tranches:
        </span>

        {triggers.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No active parametric triggers configured for this basin.
          </div>
        ) : (
          triggers.map((item) => {
            const isSelected = selectedTrigger?.config.id === item.config.id;
            const prob = item.triggerProbabilityPct;
            const isHighProb = prob >= 65;

            return (
              <div
                key={item.config.id}
                onClick={() => setSelectedTrigger(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-500 ring-1 ring-cyan-500 shadow-lg'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs">{item.config.district} Policy</h4>
                    <div className="text-[10px] font-mono text-slate-400">
                      Distance to Eye: <strong className="text-slate-200">{item.distanceToEyeKm} km</strong> | Max Surge: <strong className="text-cyan-300">{item.currentSurgeM}m</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        item.isTriggered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                          : isHighProb
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.isTriggered ? 'Trigger Met' : `${prob}% Likely`}
                    </span>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold mt-1">
                      ${(item.estimatedPayoutUSD / 1000000).toFixed(1)}M Payout
                    </div>
                  </div>
                </div>

                {/* Progress bar of trigger probability */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Monte Carlo Trigger Probability:</span>
                    <span className="font-bold text-cyan-300">{prob}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prob >= 75 ? 'bg-rose-500' : prob >= 40 ? 'bg-amber-400' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${prob}%` }}
                    />
                  </div>
                </div>

                {/* Criteria breakdown */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-300">
                  <div className="bg-slate-950/60 p-1 rounded">
                    Wind: {item.currentWindKmh} / {item.config.windSpeedThresholdKmh} km/h
                  </div>
                  <div className="bg-slate-950/60 p-1 rounded">
                    Surge: {item.currentSurgeM} / {item.config.surgeDepthThresholdM}m
                  </div>
                  <div className="bg-slate-950/60 p-1 rounded">
                    Rain: {item.currentRainfallMm} / {item.config.rainfall72hThresholdMm}mm
                  </div>
                </div>

                {item.factorsTriggered.length > 0 && (
                  <div className="mt-1.5 text-[10px] text-emerald-300 bg-emerald-950/40 p-1 rounded border border-emerald-900/60">
                    ✅ Trigger factors fulfilled: {item.factorsTriggered.join(', ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
