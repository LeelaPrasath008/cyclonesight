import React, { useState } from 'react';
import { InfrastructureAsset, AssetType, RiskBand } from '../../shared/types.js';
import { 
  Download, 
  Search, 
  Filter, 
  ShieldAlert, 
  ArrowUpDown, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface RiskRankingTabProps {
  assets: InfrastructureAsset[];
  onSelectAsset: (asset: InfrastructureAsset) => void;
  selectedAssetId?: string;
}

export const RiskRankingTab: React.FC<RiskRankingTabProps> = ({
  assets,
  onSelectAsset,
  selectedAssetId,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [bandFilter, setBandFilter] = useState<string>('all');

  const uniqueDistricts = Array.from(new Set(assets.map((a) => a.district)));

  const filteredAssets = assets
    .filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (districtFilter !== 'all' && a.district !== districtFilter) return false;
      if (bandFilter !== 'all' && a.risk?.band !== bandFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(query) ||
          a.district.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0));

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Asset Name',
      'Type',
      'District',
      'Elevation (m)',
      'Surge Depth (m)',
      'Wind Speed (km/h)',
      'Backup Power',
      'Population Served',
      'Risk Score (0-100)',
      'Risk Band',
      'Single Point of Failure',
      'Cascade Reason',
      'Lead Time (Hours)',
      'Recommended Pre-Landfall Mitigation',
    ];

    const rows = filteredAssets.map((a) => [
      `"${a.id}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.type}"`,
      `"${a.district}"`,
      a.elevationM,
      a.exposure?.surgeDepthM || 0,
      a.exposure?.windSpeedKmh || 0,
      a.backupPowerAvailable ? 'Yes' : 'No',
      a.populationServed,
      a.risk?.score || 0,
      `"${a.risk?.band || 'Low'}"`,
      a.risk?.isSinglePointOfFailure ? 'YES' : 'NO',
      `"${(a.risk?.cascadeFailureReasons || []).join('; ').replace(/"/g, '""')}"`,
      a.risk?.leadTimeHours || 12,
      `"${(a.risk?.mitigation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CycloneSight_Asset_Vulnerability_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-3 text-xs overflow-hidden">
      {/* Top Controls: Search, Filters & Export */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hospitals, substations, highways..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium cursor-pointer transition-colors shrink-0"
            title="Export filtered assets to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="all">All Types ({assets.length})</option>
            <option value="hospital">Hospitals</option>
            <option value="substation">Substations</option>
            <option value="shelter">Cyclone Shelters</option>
            <option value="road">Roads / Highways</option>
            <option value="clinic">Clinics</option>
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="all">All Districts</option>
            {uniqueDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="all">All Risk Bands</option>
            <option value="Critical">Critical (80-100)</option>
            <option value="High">High (60-79)</option>
            <option value="Moderate">Moderate (35-59)</option>
            <option value="Low">Low (&lt;35)</option>
          </select>
        </div>
      </div>

      {/* Summary Stat */}
      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span>Showing {filteredAssets.length} of {assets.length} infrastructure assets</span>
        <span className="text-rose-400 font-bold">
          {filteredAssets.filter((a) => a.risk?.band === 'Critical').length} Critical Action Required
        </span>
      </div>

      {/* Ranked Asset List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No infrastructure assets match the active filters.
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isSelected = asset.id === selectedAssetId;
            const band = asset.risk?.band || 'Low';
            const score = asset.risk?.score || 0;

            const badgeBg =
              band === 'Critical'
                ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                : band === 'High'
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : band === 'Moderate'
                ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-400';

            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                        {asset.type}
                      </span>
                      {asset.risk?.isSinglePointOfFailure && (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/50 text-[9px] px-1 py-0.2 rounded font-mono font-black animate-pulse">
                          SPOF
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-100 text-xs hover:text-cyan-300 transition-colors">
                      {asset.name}
                    </h4>
                    <div className="text-[11px] text-slate-400">
                      {asset.district} • Elev: {asset.elevationM}m • Pop: {asset.populationServed.toLocaleString()}
                    </div>
                  </div>

                  {/* Risk Score Pill */}
                  <div className={`px-2 py-1 rounded border font-mono text-center shrink-0 ${badgeBg}`}>
                    <div className="text-sm font-black">{score}</div>
                    <div className="text-[9px] uppercase tracking-wider">{band}</div>
                  </div>
                </div>

                {/* Exposure Details */}
                <div className="mt-2 grid grid-cols-3 gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800/80 text-[10px] font-mono">
                  <div>Surge: <strong className="text-cyan-300">{asset.exposure?.surgeDepthM || 0}m</strong></div>
                  <div>Wind: <strong className="text-purple-300">{asset.exposure?.windSpeedKmh || 0} km/h</strong></div>
                  <div>Backup: <strong className={asset.backupPowerAvailable ? 'text-emerald-400' : 'text-rose-400'}>{asset.backupPowerAvailable ? 'Yes' : 'NO'}</strong></div>
                </div>

                {/* Cascading issues if any */}
                {asset.risk?.cascadeFailureReasons?.length ? (
                  <div className="mt-1.5 text-[10px] text-rose-300 bg-rose-950/30 p-1 rounded border border-rose-900/50">
                    ⚠️ {asset.risk.cascadeFailureReasons[0]}
                  </div>
                ) : null}

                {/* Mitigation & Lead Time */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-cyan-200">
                  <span className="truncate pr-2">🛠️ {asset.risk?.mitigation}</span>
                  <span className="shrink-0 font-mono text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> T-{asset.risk?.leadTimeHours || 12}h
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
