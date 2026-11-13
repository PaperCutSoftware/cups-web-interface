import React from 'react';
import { Printer as PrinterIcon, RefreshCw, ShieldCheck, Moon, Sun, Cpu, AlertTriangle } from 'lucide-react';
import type { SystemStatus } from '../types/cups';

interface NavbarProps {
  status: SystemStatus | null;
  loading: boolean;
  onRefresh: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenFleetAudit?: () => void;
  rosettaRiskCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  loading,
  onRefresh,
  darkMode,
  onToggleDarkMode,
  onOpenFleetAudit,
  rosettaRiskCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm">
            <PrinterIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Web interface for CUPS
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                v0.1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Modern Printing Management for macOS &amp; UNIX
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {status && (
            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                CUPS <strong>{status.cups_version}</strong> ({status.daemon_running ? 'Daemon Active' : 'Offline'})
              </span>
            </div>
          )}

          {onOpenFleetAudit && (
            <button
              onClick={onOpenFleetAudit}
              title="Rosetta 2 & Apple Silicon Fleet Migration Audit"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Rosetta 2 Audit</span>
              {rosettaRiskCount > 0 ? (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                  <span>{rosettaRiskCount} at risk</span>
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Ready
                </span>
              )}
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh printers and jobs"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
