import React, { useState, useEffect, useRef } from 'react';
import {
  Printer as PrinterIcon,
  Star,
  Pause,
  Play,
  MapPin,
  Sliders,
  MoreVertical,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Plus,
  Settings,
  Layers,
  Network,
  FileText,
  Wrench,
} from 'lucide-react';
import type { Printer } from '../types/cups';
import type { ConfigModalTab } from './PrinterConfigModal';
import { formatAlert } from '../utils/format';

interface PrinterTableProps {
  printers: Printer[];
  onPause: (name: string) => Promise<void>;
  onResume: (name: string) => Promise<void>;
  onSetDefault: (name: string) => Promise<void>;
  onPurge: (name: string) => Promise<void>;
  onConfigure: (printer: Printer, tab?: ConfigModalTab) => void;
  onDelete: (printer: Printer) => void;
  onAddPrinter: () => void;
  onOpenServerSettings: () => void;
  onPrintTestPage: (name: string) => Promise<void>;
}

export const PrinterTable: React.FC<PrinterTableProps> = ({
  printers,
  onPause,
  onResume,
  onSetDefault,
  onPurge,
  onConfigure,
  onDelete,
  onAddPrinter,
  onOpenServerSettings,
  onPrintTestPage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKebab, setActiveKebab] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveKebab(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPrinters = printers
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.info && p.info.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.uri && p.uri.toLowerCase().includes(q)) ||
        (p.arch_readiness && p.arch_readiness.label.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const isEnabledSince = (msg?: string) => {
    if (!msg) return false;
    const lower = msg.toLowerCase().trim();
    return lower.startsWith('enabled since') || lower.startsWith('disabled since');
  };

  const handleToggleState = async (printer: Printer) => {
    setActionLoading(printer.name);
    try {
      if (printer.state === 'stopped') {
        await onResume(printer.name);
      } else {
        await onPause(printer.name);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakeDefault = async (printer: Printer) => {
    setActiveKebab(null);
    setActionLoading(printer.name);
    try {
      await onSetDefault(printer.name);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurge = async (printer: Printer) => {
    setActiveKebab(null);
    setActionLoading(printer.name);
    try {
      await onPurge(printer.name);
    } finally {
      setActionLoading(null);
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'idle':
        return {
          pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          label: 'Ready',
        };
      case 'printing':
        return {
          pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
          dot: 'bg-blue-500 animate-pulse',
          label: 'Printing',
        };
      case 'stopped':
        return {
          pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          dot: 'bg-amber-500',
          label: 'Paused',
        };
      case 'error':
      default:
        return {
          pill: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
          dot: 'bg-rose-500',
          label: state === 'error' ? 'Error' : state,
        };
    }
  };

  const getArchBadge = (printer: Printer) => {
    if (!printer.arch_readiness) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span>Driver (PPD)</span>
        </span>
      );
    }

    const { status, label } = printer.arch_readiness;
    switch (status) {
      case 'universal':
      case 'native_arm64':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Universal (ARM64)</span>
          </span>
        );
      case 'rosetta_dependent':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Rosetta 2 (x86_64)</span>
          </span>
        );
      case 'driverless':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Driverless</span>
          </span>
        );
      case 'missing_binary':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{label || 'Missing Binary'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by queue name, driver, location, or URI..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onOpenServerSettings}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
            title="Configure CUPS daemon parameters (cupsctl)"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>CUPS Settings</span>
          </button>

          <button
            type="button"
            onClick={onAddPrinter}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
            title="Create a new CUPS printer queue"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Printer Queue</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/80">
                <th className="py-3.5 px-4 sm:px-6">Queue / Printer</th>
                <th className="hidden sm:table-cell py-3.5 px-4">Status</th>
                <th className="hidden xl:table-cell py-3.5 px-4">Driver (PPD) &amp; Arch</th>
                <th className="hidden lg:table-cell py-3.5 px-4">Location &amp; Connection</th>
                <th className="hidden md:table-cell py-3.5 px-4 text-center">Jobs</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredPrinters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <PrinterIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">
                      No matching printers found
                    </p>
                    <p className="text-xs mt-0.5">
                      Try adjusting your search query or clear the filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPrinters.map((printer) => {
                  const stateStyle = getStateBadge(printer.state);
                  const isMenuOpen = activeKebab === printer.name;

                  return (
                    <tr
                      key={printer.name}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Queue / Printer Name Column */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <PrinterIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span
                                className="font-bold text-sm text-slate-900 dark:text-white truncate"
                                title={printer.name}
                              >
                                {printer.name}
                              </span>

                              {/* Compact Status Indicator for screens where Status column is hidden (< sm) */}
                              <span
                                className={`sm:hidden inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${stateStyle.pill}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${stateStyle.dot}`} />
                                <span>{stateStyle.label}</span>
                              </span>

                              {printer.is_default && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>Default</span>
                                </span>
                              )}

                              {printer.is_class && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                  Pool
                                </span>
                              )}
                            </div>

                            <p
                              className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-sm"
                              title={printer.info || printer.name}
                            >
                              {printer.info || printer.name}
                            </p>

                            {/* Alerts / Warnings if any */}
                            {printer.alerts && printer.alerts.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {printer.alerts.map((alert) => {
                                  const { label, severity } = formatAlert(alert);
                                  const color =
                                    severity === 'error'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
                                  return (
                                    <span
                                      key={alert}
                                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color}`}
                                    >
                                      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                      <span>{label}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Column: Hidden on < sm */}
                      <td className="hidden sm:table-cell py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${stateStyle.pill}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${stateStyle.dot}`} />
                            <span>{stateStyle.label}</span>
                          </span>

                          {printer.diagnostic && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800"
                              title={`${printer.diagnostic.title}: ${printer.diagnostic.explanation}`}
                            >
                              <Wrench className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[130px]">{printer.diagnostic.title}</span>
                            </span>
                          )}

                          {printer.state_message && !isEnabledSince(printer.state_message) && !printer.diagnostic && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[140px] truncate" title={printer.state_message}>
                              {printer.state_message}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Driver (PPD) & Arch Readiness: Hidden on < xl */}
                      <td className="hidden xl:table-cell py-4 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onConfigure(printer, 'audit')}
                          className="group inline-flex items-center space-x-1 hover:opacity-85 transition cursor-pointer"
                          title="Click to view Mach-O architecture & driver audit"
                        >
                          {getArchBadge(printer)}
                        </button>
                      </td>

                      {/* Location & Connection Column: Hidden on < lg */}
                      <td className="hidden lg:table-cell py-4 px-4">
                        <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]" title={printer.location || 'Local'}>
                            {printer.location || 'Local / Direct'}
                          </span>
                        </div>
                        <div
                          className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]"
                          title={printer.uri}
                        >
                          {printer.uri}
                        </div>
                      </td>

                      {/* Jobs Column: Hidden on < md */}
                      <td className="hidden md:table-cell py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            printer.queued_jobs_count > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {printer.queued_jobs_count} {printer.queued_jobs_count === 1 ? 'job' : 'jobs'}
                        </span>
                      </td>

                      {/* Actions Column: Always visible */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-2">
                          {/* Inline Pause / Resume Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleState(printer)}
                            disabled={actionLoading === printer.name}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                              printer.state === 'stopped'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                            title={printer.state === 'stopped' ? 'Resume printer queue' : 'Pause printer queue'}
                          >
                            {printer.state === 'stopped' ? (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Resume</span>
                              </>
                            ) : (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>Pause</span>
                              </>
                            )}
                          </button>

                          {/* Kebab Menu Container */}
                          <div className="relative inline-block text-left" ref={isMenuOpen ? menuRef : undefined}>
                            <button
                              type="button"
                              onClick={() => setActiveKebab(isMenuOpen ? null : printer.name)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Popover */}
                            {isMenuOpen && (
                              <div className="origin-top-right absolute right-0 mt-2 w-52 rounded-2xl shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                                    Queue: {printer.name}
                                  </p>
                                </div>

                                {/* Print Test Page Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKebab(null);
                                    onPrintTestPage(printer.name);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center space-x-2.5 transition cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>Print Test Page</span>
                                </button>

                                {/* Default Options */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKebab(null);
                                    onConfigure(printer, 'preferences');
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center space-x-2.5 transition cursor-pointer"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>Default Options...</span>
                                </button>

                                {/* Queue Details Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKebab(null);
                                    onConfigure(printer, 'details');
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center space-x-2.5 transition cursor-pointer"
                                >
                                  <Network className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>Queue Details &amp; URI...</span>
                                </button>

                                {/* Swap Driver Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKebab(null);
                                    onConfigure(printer, 'driver');
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center space-x-2.5 transition cursor-pointer"
                                >
                                  <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>Swap Driver / PPD...</span>
                                </button>

                                {/* Make Default Option */}
                                {!printer.is_default ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMakeDefault(printer)}
                                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center space-x-2.5 transition cursor-pointer"
                                  >
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Make Default</span>
                                  </button>
                                ) : (
                                  <div className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center space-x-2.5 cursor-default">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Current Default</span>
                                  </div>
                                )}

                                {/* Purge Jobs (if queue has jobs) */}
                                {printer.queued_jobs_count > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handlePurge(printer)}
                                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center space-x-2.5 transition cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Purge All Jobs ({printer.queued_jobs_count})</span>
                                  </button>
                                )}

                                <div className="border-t border-slate-100 dark:border-slate-700/60 my-1" />

                                {/* Delete Queue Option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKebab(null);
                                    onDelete(printer);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                  <span>Delete Queue...</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
