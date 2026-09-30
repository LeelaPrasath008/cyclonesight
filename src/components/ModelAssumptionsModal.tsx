import React from 'react';
import { X, HelpCircle, Waves, CloudRain, Wind, Database, AlertTriangle } from 'lucide-react';

interface ModelAssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelAssumptionsModal: React.FC<ModelAssumptionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Model Assumptions, Physics & Scientific Limitations</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-300">
          {/* Section 1: Surge */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs">
              <Waves className="w-4 h-4" />
              <span>1. Storm Surge & Bathtub Inundation Model</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Formulation:</strong> Water level is computed as the superposition of astronomical tide, inverted-barometer pressure deficit (Δη_p ≈ 0.0102 × (1013 - P_c) meters), and empirical wind-stress setup calibrated for the extreme shallow continental shelf of the northern Bay of Bengal (shelf slope 0.0012 to 0.0022).
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Inland Attenuation:</strong> Water level decays inland at 0.4 m/km (configurable) due to surface friction and mangrove drag. Bathtub inundation checks hydrologic connectivity to sea/estuary cells.
            </p>
          </div>

          {/* Section 2: Runoff */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold font-mono text-xs">
              <CloudRain className="w-4 h-4" />
              <span>2. USDA SCS Curve Number Runoff & Tide Locking</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Formulation:</strong> Direct runoff Q = (P - Ia)² / (P - Ia + S) where initial abstraction Ia = 0.2 × S, S = (25400/CN) - 254. Curve numbers adjust across Antecedent Moisture Conditions (AMC I Dry, AMC II Normal, AMC III Saturated).
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Tide-Locking Compound Bonus:</strong> When high storm surge coincides with intense rainfall, coastal sluice gates cannot drain, causing non-linear upstream ponding.
            </p>
          </div>

          {/* Section 3: Wind */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-yellow-400 font-bold font-mono text-xs">
              <Wind className="w-4 h-4" />
              <span>3. Asymmetric Wind Field & Post-Landfall Decay</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Right-Front Quadrant (RFQ):</strong> Counter-clockwise cyclonic rotation in the Northern Hemisphere superimposes with forward translation speed, amplifying winds on the right flank by up to 25%.
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Inland Decay:</strong> Post-landfall wind speed follows Kaplan & DeMaria exponential decay (V(t) = V₀ · exp(-α · t)) over rough terrain.
            </p>
          </div>

          {/* Section 4: GEE Integration */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs">
              <Database className="w-4 h-4" />
              <span>4. Google Earth Engine (GEE) & Terrain Providers</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Implements the unified <code>TerrainProvider</code> interface. <code>MockTerrainProvider</code> bundles offline high-resolution replicas of SRTM 30m DEM, ESA WorldCover, and WorldPop population grids for West Bengal and Odisha. <code>GeeTerrainProvider</code> connects to Earth Engine when <code>GEE_SERVICE_ACCOUNT</code> and <code>GEE_PRIVATE_KEY</code> are provided.
            </p>
          </div>

          {/* Section 5: Limitations */}
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/60 text-rose-200 space-y-1">
            <div className="flex items-center gap-2 font-bold font-mono text-xs text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Operational Limitations & Uncertainty</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Local earthen embankment (polder) micro-crests below 30m resolution may not be captured without high-res LiDAR.</li>
              <li>Tidal phase synchronization uncertainty is ±45 minutes; small track shifts alter surge peak timing.</li>
              <li>Decision-support only. Not an official meteorological forecast. Adhere to IMD/NDMA bulletins.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
