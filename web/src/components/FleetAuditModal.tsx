import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  PrinterIcon,
} from 'lucide-react';
import type { FleetAuditSummary, Printer } from '../types/cups';
import { api } from '../api/client';

interface FleetAuditModalProps {
  printers: Printer[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPrinterForAudit: (printer: Printer) => void;
}

export const FleetAuditModal: React.FC<FleetAuditModalProps> = ({
  printers,
  isOpen,
  onClose,
  onSelectPrinterForAudit,
}) => {
  const [summary, setSummary] = useState<FleetAuditSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api
      .getFleetAudit()
      .then((data) => setSummary(data))
      .catch((err) => console.error('Failed to load fleet audit:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                macOS Rosetta 2 Migration Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Binary slice analysis across all local print queues
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs">Scanning queue PPD filters & Mach-O headers...</p>
            </div>
          ) : (
            <>
              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Universal</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                    {summary?.universal_queues ?? 0}
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                    Apple Silicon Native
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Rosetta 2</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                    {summary?.rosetta_queues ?? 0}
                  </div>
                  <div className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                    Intel Only (At Risk)
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                  <div className="flex items-center space-x-1.5 text-sky-800 dark:text-sky-300 text-xs font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Driverless</span>
                  </div>
                  <div className="text-2xl font-bold text-sky-900 dark:text-sky-200 mt-1">
                    {summary?.driverless_queues ?? 0}
                  </div>
                  <div className="text-[10px] text-sky-700/80 dark:text-sky-400 mt-0.5">
                    AirPrint / IPP
                  </div>
                </div>
              </div>

              {/* Advisory Box */}
              {summary && summary.rosetta_queues > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Action Recommended for Future macOS Releases</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 pl-5.5">
                    {summary.rosetta_queues} {summary.rosetta_queues === 1 ? 'queue relies' : 'queues rely'} on Intel (x86_64) binaries. When Apple removes the Rosetta 2 translation layer in a future macOS update, these queues will crash with <code className="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.2 rounded">Filter failed</code>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>All queues are verified ready for an Apple Silicon world without Rosetta 2!</span>
                </div>
              )}

              {/* Queue List Breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Configured Queues Breakdown
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  {printers.map((p) => {
                    const isRosetta = p.arch_readiness?.rosetta_required;
                    const isDriverless = p.arch_readiness?.status === 'driverless';

                    return (
                      <div
                        key={p.name}
                        className="p-3 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
                        onClick={() => {
                          onClose();
                          onSelectPrinterForAudit(p);
                        }}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-3">
                          <PrinterIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              {p.info || p.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              isRosetta
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                                : isDriverless
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                            }`}
                          >
                            {p.arch_readiness?.label || 'Driver (PPD)'}
                          </span>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            Inspect →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
