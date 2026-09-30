import React from 'react';
import { DispatchRecord } from '../../shared/types.js';
import { ShieldCheck, Clock, Mail, MessageSquare, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

interface AuditLogTabProps {
  dispatches: DispatchRecord[];
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ dispatches }) => {
  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-hidden">
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-100 text-xs">Early-Warning Dispatch Audit Trail</span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Immutable log of authorized public & municipal alerts
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
          {dispatches.length} Total Records
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {dispatches.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No early-warning advisories have been dispatched yet.
          </div>
        ) : (
          dispatches.map((record) => {
            const isDelivered = record.status === 'Delivered';

            return (
              <div
                key={record.id}
                className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                        {record.audience}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] text-slate-400">{record.district}</span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-xs leading-snug">
                      {record.previewText}
                    </h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold shrink-0 ${
                      isDelivered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>

                {/* Audit Meta */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[10px] font-mono text-slate-300">
                  <div>
                    Channel: <strong className="text-cyan-300">{record.channel}</strong> ({record.payload.recipientCount} recipients)
                  </div>
                  <div>
                    Alert Level: <strong className="text-rose-400">{record.alertLevel}</strong>
                  </div>
                  <div className="col-span-2">
                    Authorized By: <strong className="text-slate-200">{record.approver}</strong>
                  </div>
                  <div className="col-span-2 text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>

                {/* Payload snippet */}
                {record.payload.details && (
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-900 truncate">
                    Payload: {record.payload.details}
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
