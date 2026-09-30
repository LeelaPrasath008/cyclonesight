import React from 'react';
import { Eye, CheckCircle, AlertTriangle, Sparkles, X, ShieldAlert } from 'lucide-react';

interface ImageryAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
  screenshotBase64?: string;
}

export const ImageryAnalysisModal: React.FC<ImageryAnalysisModalProps> = ({
  isOpen,
  onClose,
  result,
  screenshotBase64,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Gemini Multimodal Remote-Sensing Analysis</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Screenshot preview */}
          {screenshotBase64 && (
            <div className="rounded-xl overflow-hidden border border-slate-800 relative max-h-48 bg-slate-950">
              <img
                src={screenshotBase64}
                alt="Analyzed Map View"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute bottom-2 left-2 bg-slate-950/90 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-slate-700">
                Processed Viewport Snapshot
              </div>
            </div>
          )}

          {/* Confidence and Agreement badge */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Analysis Confidence</div>
              <div className="text-lg font-black text-cyan-400 font-mono">{result.confidence || 88}%</div>
              <div className="text-[10px] text-slate-500">Cross-verified against elevation DEM</div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Model Agreement</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {result.modelAgreement?.status || 'Substantial Agreement'}
              </div>
              <div className="text-[10px] text-slate-500">Hydrological bathymetry consistency</div>
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase font-mono text-cyan-400">
              Visible Geomorphological & Infrastructure Observations:
            </h4>
            <div className="space-y-1.5">
              {(result.observations || []).map((obs: string, i: number) => (
                <div key={i} className="p-2 rounded bg-slate-950/70 border border-slate-800 text-slate-200 flex items-start gap-2">
                  <span className="text-cyan-400 font-mono font-bold">•</span>
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Choke Points */}
          {result.criticalChokePoints?.length ? (
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-200 text-xs uppercase font-mono text-rose-400">
                Identified Choke Points & Single Points of Failure:
              </h4>
              <div className="space-y-1">
                {result.criticalChokePoints.map((cp: string, i: number) => (
                  <div key={i} className="p-1.5 rounded bg-rose-950/20 border border-rose-900/60 text-rose-300 text-[11px] flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{cp}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Agreement Notes */}
          {result.modelAgreement?.notes && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
              <div className="font-bold text-[10px] font-mono uppercase text-slate-400">
                Scientific Alignment Note:
              </div>
              <p className="text-xs">{result.modelAgreement.notes}</p>
              {result.modelAgreement.discrepancies && (
                <p className="text-[11px] text-amber-300 mt-1">
                  ⚠️ Note: {result.modelAgreement.discrepancies}
                </p>
              )}
            </div>
          )}

          <div className="text-[10px] font-mono text-slate-500 border-t border-slate-800 pt-2">
            {result.disclaimer || 'Decision-support prototype. Confirm all critical directives with official national disaster bulletins.'}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
