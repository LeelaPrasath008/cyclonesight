import React, { useState } from 'react';
import { CascadeNode, CascadeEdge, InfrastructureAsset } from '../../shared/types.js';
import { Zap, AlertTriangle, ArrowRight, ShieldCheck, Activity, Link2, Info } from 'lucide-react';

interface CascadeGraphTabProps {
  cascadeGraph?: {
    nodes: CascadeNode[];
    edges: CascadeEdge[];
    spofAssetIds: string[];
  };
  assets: InfrastructureAsset[];
  onSelectAsset: (asset: InfrastructureAsset) => void;
  selectedAssetId?: string;
}

export const CascadeGraphTab: React.FC<CascadeGraphTabProps> = ({
  cascadeGraph,
  assets,
  onSelectAsset,
  selectedAssetId,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'spof' | 'failed'>('all');

  if (!cascadeGraph || cascadeGraph.nodes.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        No cascading dependency relationships generated for this scenario.
      </div>
    );
  }

  const { nodes, edges, spofAssetIds } = cascadeGraph;

  // Filter nodes
  const displayNodes = nodes.filter((n) => {
    if (activeFilter === 'spof') return spofAssetIds.includes(n.id);
    if (activeFilter === 'failed') return n.status === 'failed';
    return true;
  });

  // Group by primary upstream providers (Substations and Key Arterial Roads)
  const rootProviders = nodes.filter((n) => n.type === 'substation' || n.type === 'road');

  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-hidden">
      {/* Intro info */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Cascading Vulnerability Dependencies
          </span>
          <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
            {spofAssetIds.length} Single Points of Failure
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Simulates how coastal surge inundation tripping power substations triggers simultaneous power failure at dependent hospitals and shelters, while flooded causeways cut emergency road access.
        </p>

        {/* Filter buttons */}
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
              activeFilter === 'all' ? 'bg-cyan-900 border border-cyan-500 text-white font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            All Nodes ({nodes.length})
          </button>
          <button
            onClick={() => setActiveFilter('spof')}
            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
              activeFilter === 'spof' ? 'bg-amber-900 border border-amber-500 text-amber-200 font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            SPOF Only ({spofAssetIds.length})
          </button>
          <button
            onClick={() => setActiveFilter('failed')}
            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
              activeFilter === 'failed' ? 'bg-rose-900 border border-rose-500 text-rose-200 font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Failed ({nodes.filter((n) => n.status === 'failed').length})
          </button>
        </div>
      </div>

      {/* Dependency Trees */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {rootProviders.map((root) => {
          const isSpof = spofAssetIds.includes(root.id);
          const outgoingEdges = edges.filter((e) => e.fromId === root.id);
          const childNodes = outgoingEdges
            .map((e) => ({
              edge: e,
              node: nodes.find((n) => n.id === e.toId),
            }))
            .filter((item): item is { edge: CascadeEdge; node: CascadeNode } => Boolean(item.node));

          if (activeFilter === 'spof' && !isSpof) return null;
          if (activeFilter === 'failed' && root.status !== 'failed' && !childNodes.some((c) => c.node.status === 'failed')) {
            return null;
          }

          const matchedAsset = assets.find((a) => a.id === root.id);

          return (
            <div
              key={root.id}
              className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                root.status === 'failed'
                  ? 'bg-rose-950/20 border-rose-800/80'
                  : root.status === 'at-risk'
                  ? 'bg-amber-950/20 border-amber-800/60'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              {/* Upstream Root Node */}
              <div
                onClick={() => matchedAsset && onSelectAsset(matchedAsset)}
                className="flex items-start justify-between gap-2 cursor-pointer hover:opacity-90"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      root.status === 'failed'
                        ? 'bg-rose-600 text-white'
                        : root.status === 'at-risk'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {root.type === 'substation' ? <Zap className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 text-xs">{root.name}</span>
                      {isSpof && (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/50 text-[9px] px-1 rounded font-mono font-black">
                          SPOF
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {root.type.toUpperCase()} • {root.district} • Supplies {childNodes.length} downstream facilities
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      root.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500'
                        : root.status === 'at-risk'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                    }`}
                  >
                    {root.status}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">Risk: {root.riskScore}/100</div>
                </div>
              </div>

              {/* Downstream Cascading Dependencies */}
              {childNodes.length > 0 && (
                <div className="pl-4 border-l-2 border-slate-700 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Cascades Downstream To:
                  </span>
                  {childNodes.map(({ edge, node }) => {
                    const childAsset = assets.find((a) => a.id === node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => childAsset && onSelectAsset(childAsset)}
                        className={`p-2 rounded-lg border flex items-center justify-between text-[11px] cursor-pointer transition-all ${
                          node.id === selectedAssetId
                            ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {edge.dependencyType === 'power' ? '⚡ Power Grid' : '🛣️ Road Route'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                          <span className="font-semibold text-slate-200">{node.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {node.failureReason && (
                            <span className="text-[9px] text-rose-400 bg-rose-950/40 px-1 py-0.5 rounded border border-rose-900 truncate max-w-[140px]">
                              {node.failureReason}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              node.status === 'failed'
                                ? 'text-rose-400 bg-rose-950/50'
                                : node.status === 'at-risk'
                                ? 'text-amber-400 bg-amber-950/50'
                                : 'text-emerald-400 bg-emerald-950/50'
                            }`}
                          >
                            {node.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
