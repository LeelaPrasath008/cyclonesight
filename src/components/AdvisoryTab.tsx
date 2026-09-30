import React, { useState } from 'react';
import { 
  AdvisoryData, 
  AudienceType, 
  HazardSummary, 
  LanguageCode, 
  DispatchRecord 
} from '../../shared/types.js';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Globe, 
  Clock, 
  FileText, 
  UserCheck, 
  Loader2 
} from 'lucide-react';

interface AdvisoryTabProps {
  summary?: HazardSummary;
  onDispatchSuccess: (record: DispatchRecord) => void;
}

export const AdvisoryTab: React.FC<AdvisoryTabProps> = ({ summary, onDispatchSuccess }) => {
  const [audience, setAudience] = useState<AudienceType>('District Collector');
  const [language, setLanguage] = useState<LanguageCode>('bn');
  const [district, setDistrict] = useState<string>(summary?.districtStats[0]?.district || 'South 24 Parganas');
  const [isGenerating, setIsGenerating] = useState(false);
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'local'>('en');

  // Dispatch Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<'Email' | 'Telegram' | 'SMS' | 'Multi-Channel'>('Multi-Channel');
  const [approverName, setApproverName] = useState('Duty Magistrate A. Roy, IAS (EOC)');
  const [approverNotes, setApproverNotes] = useState('Verified against simulated flood inundation boundary. Priority vertical evacuation approved.');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchRecord | null>(null);

  const audiences: AudienceType[] = [
    'District Collector',
    'Power Utility',
    'Hospital Administrator',
    'Road/Highway Authority',
    'General Public',
  ];

  const languages: { code: LanguageCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'bn', label: 'Bengali (বাংলা)' },
    { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'hi', label: 'Hindi (हिन्दी)' },
    { code: 'ta', label: 'Tamil (தமிழ்)' },
    { code: 'te', label: 'Telugu (తెలుగు)' },
    { code: 'my', label: 'Burmese (မြန်မာ)' },
  ];

  const handleGenerateAdvisory = async () => {
    if (!summary) return;
    setIsGenerating(true);
    setDispatchResult(null);

    try {
      const res = await fetch('/api/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district,
          audience,
          hazardSummary: summary,
          language,
        }),
      });

      const data = await res.json();
      setAdvisory(data);
    } catch (err) {
      console.error('Failed to generate advisory:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecuteDispatch = async () => {
    if (!advisory || !approverName.trim()) return;
    setIsDispatching(true);

    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisory,
          channel: dispatchChannel,
          approver: approverName,
          notes: approverNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchResult(data.record);
        onDispatchSuccess(data.record);
        setShowDispatchModal(false);
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-hidden">
      {/* Header & Controls */}
      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Early-Warning Advisory Composer
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
            Gemini Multilingual Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Audience */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Target Authority:</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AudienceType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {audiences.map((aud) => (
                <option key={aud} value={aud}>
                  {aud}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Target District:</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {(summary?.districtStats || []).map((d) => (
                <option key={d.district} value={d.district}>
                  {d.district}
                </option>
              ))}
            </select>
          </div>

          {/* Local Language */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Local Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateAdvisory}
          disabled={isGenerating || !summary}
          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>{isGenerating ? 'Synthesizing Tailored Directive...' : 'Generate Early-Warning Advisory'}</span>
        </button>
      </div>

      {/* Dispatched Toast Notification */}
      {dispatchResult && (
        <div className="bg-emerald-950/80 border border-emerald-500/80 p-2.5 rounded-lg text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="block text-white">Advisory Dispatched to Audit Log!</strong>
              <span className="text-[11px] text-emerald-300">
                Status: {dispatchResult.status} via {dispatchResult.channel} | Approved by {dispatchResult.approver}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded">
            ID: {dispatchResult.id}
          </span>
        </div>
      )}

      {/* Advisory Content & Editor */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {!advisory ? (
          <div className="text-center py-14 text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Select target authority, district, and local language, then click Generate.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Language Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveLangTab('en')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    activeLangTab === 'en'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English Operational Copy
                </button>
                <button
                  onClick={() => setActiveLangTab('local')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    activeLangTab === 'local'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {advisory.languages.local.langName}
                </button>
              </div>

              {/* Review & Approve Button */}
              <button
                onClick={() => setShowDispatchModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Review & Approve Dispatch</span>
              </button>
            </div>

            {/* Advisory Preview Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>VALID UNTIL: {advisory.validUntil}</span>
                  <span className="text-rose-400 font-bold uppercase">{advisory.alertLevel}</span>
                </div>
                <h3 className="font-bold text-white text-sm leading-snug">
                  {activeLangTab === 'en' ? advisory.languages.en.headline : advisory.languages.local.headline}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeLangTab === 'en' ? advisory.languages.en.summary : advisory.languages.local.summary}
                </p>
              </div>

              {/* Priority Action Table */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 block">
                  Mandatory Operational Actions:
                </span>
                <div className="space-y-1.5">
                  {advisory.actions.map((act, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-cyan-300">
                            STEP {i + 1} • T-{act.deadlineHours}h
                          </span>
                          <span className="text-[9px] px-1.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {act.owner}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs">{act.action}</p>
                      </div>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase font-bold shrink-0">
                        {act.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Designated Evacuation Zones & Resources */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Evacuation Sectors:
                  </span>
                  {advisory.evacuationZones.map((z, i) => (
                    <div key={i} className="text-slate-300">• {z}</div>
                  ))}
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Staged Resources:
                  </span>
                  {advisory.resources.map((r, i) => (
                    <div key={i} className="text-slate-300">• {r}</div>
                  ))}
                </div>
              </div>

              {/* Instructions in Local Language */}
              {activeLangTab === 'local' && advisory.languages.local.instructions && (
                <div className="bg-purple-950/30 border border-purple-900/60 p-2.5 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono uppercase text-purple-300 font-bold block">
                    স্থানীয় নির্দেশনা (Directives):
                  </span>
                  {advisory.languages.local.instructions.map((ins, i) => (
                    <p key={i} className="text-slate-200 text-xs">{ins}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Review & Approve Dispatch Modal */}
      {showDispatchModal && advisory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Review & Human Approval Gate</h3>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-950/40 border border-amber-800/80 p-2.5 rounded-lg text-[11px] text-amber-200 flex items-start gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Mandatory Protocol:</strong> Advisories cannot be automated without human review. Confirm recipient details and operational requirements before authorization.
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Dispatch Channel:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Multi-Channel', 'Telegram', 'SMS', 'Email'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setDispatchChannel(ch)}
                      className={`py-1.5 rounded text-xs font-semibold cursor-pointer border transition-colors ${
                        dispatchChannel === ch
                          ? 'bg-cyan-900 border-cyan-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Authorizing Officer Name & Title (Required):</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="e.g. Officer On Special Duty (EOC)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Operational Authorization Notes:</label>
                <textarea
                  rows={2}
                  value={approverNotes}
                  onChange={(e) => setApproverNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                <div>Recipient: <strong className="text-slate-200">{advisory.audience}</strong> ({advisory.district})</div>
                <div>Alert Level: <strong className="text-rose-400">{advisory.alertLevel}</strong></div>
                <div>Mode: <strong className="text-amber-400">Dry Run Simulated (Audit Log Enabled)</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDispatch}
                disabled={isDispatching || !approverName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Authorize & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
