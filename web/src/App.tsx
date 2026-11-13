import { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import type { Printer, Job, SystemStatus } from './types/cups';
import { Navbar } from './components/Navbar';
import { PrinterTable } from './components/PrinterTable';
import { JobQueueTable } from './components/JobQueueTable';
import { StuckJobsBanner } from './components/StuckJobsBanner';
import { PrinterConfigModal, type ConfigModalTab } from './components/PrinterConfigModal';
import { DeletePrinterModal } from './components/DeletePrinterModal';
import { FleetAuditModal } from './components/FleetAuditModal';
import { AddPrinterModal } from './components/AddPrinterModal';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { LogsViewer } from './components/LogsViewer';
import {
  Printer as PrinterIcon,
  CheckCircle2,
  Clock,
  Info,
  AlertCircle,
  Cpu,
  FileText,
  Terminal,
} from 'lucide-react';

export function App() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Top-level navigation tab: 'printers' | 'jobs' | 'logs'
  const [activeTab, setActiveTab] = useState<'printers' | 'jobs' | 'logs'>('printers');

  // Modal states for PPD configuration & Rosetta 2 audit
  const [configModalPrinter, setConfigModalPrinter] = useState<Printer | null>(null);
  const [configModalTab, setConfigModalTab] = useState<ConfigModalTab>('preferences');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isFleetAuditOpen, setIsFleetAuditOpen] = useState(false);

  // Phase 4 modals: Add Printer & Server Settings
  const [isAddPrinterOpen, setIsAddPrinterOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);

  // Delete printer modal state
  const [deleteModalPrinter, setDeleteModalPrinter] = useState<Printer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Dark mode (defaults to light mode)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [sysStatus, prs, actJobs, compJobs] = await Promise.all([
        api.getSystemStatus(),
        api.getPrinters(),
        api.getJobs('active'),
        api.getJobs('completed'),
      ]);
      setStatus(sysStatus);
      const sortedPrs = [...prs].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setPrinters(sortedPrs);
      setActiveJobs(actJobs);
      setCompletedJobs(compJobs);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with CUPS backend';
      setError(msg);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);

    // Real-time updates via Server-Sent Events (SSE)
    const unsubscribe = api.subscribeEvents((event) => {
      if (event.type === 'job_update' || event.type === 'printer_update') {
        fetchData(false);
      }
    });

    // 5-second polling fallback
    const interval = setInterval(() => {
      fetchData(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchData]);

  // Printer Actions
  const handlePausePrinter = async (name: string) => {
    try {
      await api.pausePrinter(name);
      showToast(`Printer "${name}" paused`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pause printer';
      showToast(msg, 'error');
    }
  };

  const handleResumePrinter = async (name: string) => {
    try {
      await api.resumePrinter(name);
      showToast(`Printer "${name}" resumed`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume printer';
      showToast(msg, 'error');
    }
  };

  const handleSetDefaultPrinter = async (name: string) => {
    // Optimistically update printer state immediately
    setPrinters((prev) =>
      prev
        .map((p) => ({
          ...p,
          is_default: p.name === name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    );
    try {
      await api.setDefaultPrinter(name);
      showToast(`Printer "${name}" set as default`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set default printer';
      showToast(msg, 'error');
      await fetchData(false);
    }
  };

  const handlePurgePrinter = async (name: string) => {
    try {
      await api.purgePrinter(name);
      showToast(`Queue "${name}" purged`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to purge queue';
      showToast(msg, 'error');
    }
  };

  const handleDeletePrinter = async (name: string) => {
    try {
      await api.deletePrinter(name);
      showToast(`Printer queue "${name}" deleted`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete printer queue';
      showToast(msg, 'error');
      throw err;
    }
  };

  // Job Actions
  const handleCancelJob = async (id: string) => {
    try {
      await api.cancelJob(id);
      showToast(`Print job #${id} cancelled`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel job';
      showToast(msg, 'error');
    }
  };

  const handleHoldJob = async (id: string) => {
    try {
      await api.holdJob(id);
      showToast(`Print job #${id} held indefinitely`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to hold job';
      showToast(msg, 'error');
    }
  };

  const handleReleaseJob = async (id: string) => {
    try {
      await api.releaseJob(id);
      showToast(`Print job #${id} released`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release job';
      showToast(msg, 'error');
    }
  };

  const handleRestartJob = async (id: string) => {
    try {
      await api.restartJob(id);
      showToast(`Print job #${id} restarted for printing`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restart job';
      showToast(msg, 'error');
    }
  };

  const handlePrintTestPage = async (printerName: string) => {
    try {
      const jobId = await api.printTestPage(printerName);
      showToast(`Diagnostic test page sent to "${printerName}" (CUPS Job #${jobId})`);
      await fetchData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit test page';
      showToast(msg, 'error');
    }
  };

  const stuckJobs = activeJobs.filter((j) => j.is_stuck);
  const rosettaRiskCount = printers.filter((p) => p.arch_readiness?.rosetta_required).length;
  const diagnosticIssueCount =
    printers.filter((p) => p.diagnostic || p.state === 'error' || p.state === 'stopped').length +
    activeJobs.filter((j) => j.diagnostic || j.is_stuck).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        status={status}
        loading={loading}
        onRefresh={() => fetchData(false)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenFleetAudit={() => setIsFleetAuditOpen(true)}
        rosettaRiskCount={rosettaRiskCount}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <span className="font-semibold">Backend Communication Error:</span> {error}
            </div>
          </div>
        )}

        {/* Stuck Jobs Alert (Persistent Notification if any job is stuck) */}
        {stuckJobs.length > 0 && (
          <StuckJobsBanner stuckJobs={stuckJobs} onCancelJob={handleCancelJob} />
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
              <PrinterIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Installed Printers</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {printers.length}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">System Default</p>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[160px]" title={status?.default_printer || 'None'}>
                {status?.default_printer || 'Not configured'}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Print Jobs</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {activeJobs.length}
              </h2>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center space-x-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-600 dark:text-purple-400">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">CUPS Engine</p>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {status?.cups_version || 'CUPS 2.x'}
              </h2>
            </div>
          </div>
        </div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('printers')}
            className={`inline-flex items-center space-x-2.5 px-5 py-3 text-sm font-semibold transition cursor-pointer -mb-px rounded-t-xl ${
              activeTab === 'printers'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-t border-x border-slate-200 dark:border-slate-700 border-b-2 border-b-blue-600 dark:border-b-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-t border-x border-b-2 border-transparent'
            }`}
          >
            <PrinterIcon className={`w-4 h-4 shrink-0 ${activeTab === 'printers' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Printers &amp; Queues</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition ${
                activeTab === 'printers'
                  ? 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-slate-700 dark:text-white dark:border dark:border-slate-600'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700'
              }`}
            >
              {printers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`inline-flex items-center space-x-2.5 px-5 py-3 text-sm font-semibold transition cursor-pointer -mb-px rounded-t-xl ${
              activeTab === 'jobs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-t border-x border-slate-200 dark:border-slate-700 border-b-2 border-b-blue-600 dark:border-b-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-t border-x border-b-2 border-transparent'
            }`}
          >
            <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'jobs' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Print Jobs &amp; Document Queue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition ${
                activeTab === 'jobs'
                  ? 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-slate-700 dark:text-white dark:border dark:border-slate-600'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700'
              }`}
            >
              {activeJobs.length}
            </span>
            {stuckJobs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${stuckJobs.length} stuck job(s)`} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center space-x-2.5 px-5 py-3 text-sm font-semibold transition cursor-pointer -mb-px rounded-t-xl ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-t border-x border-slate-200 dark:border-slate-700 border-b-2 border-b-blue-600 dark:border-b-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-t border-x border-b-2 border-transparent'
            }`}
          >
            <Terminal className={`w-4 h-4 shrink-0 ${activeTab === 'logs' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Logs &amp; Diagnostics</span>
            {diagnosticIssueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-600">
                {diagnosticIssueCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Printers & Queues Table View */}
        {activeTab === 'printers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Printers &amp; Queues
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage physical devices, virtual proxies, PPD configurations, and queue status
                </p>
              </div>

              {rosettaRiskCount > 0 && (
                <button
                  onClick={() => setIsFleetAuditOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer self-start sm:self-auto"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{rosettaRiskCount} {rosettaRiskCount === 1 ? 'queue relies' : 'queues rely'} on Rosetta 2</span>
                </button>
              )}
            </div>

            {loading && printers.length === 0 ? (
              <div className="h-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 animate-pulse" />
            ) : printers.length === 0 ? (
              <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center text-slate-500 dark:text-slate-400">
                <PrinterIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-base text-slate-900 dark:text-white">
                  No Printers Configured
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  CUPS does not currently have any active printer destinations registered.
                </p>
              </div>
            ) : (
              <PrinterTable
                printers={printers}
                onPause={handlePausePrinter}
                onResume={handleResumePrinter}
                onSetDefault={handleSetDefaultPrinter}
                onPurge={handlePurgePrinter}
                onConfigure={(p, tab) => {
                  setConfigModalPrinter(p);
                  setConfigModalTab(tab || 'preferences');
                  setIsConfigModalOpen(true);
                }}
                onDelete={(p) => {
                  setDeleteModalPrinter(p);
                  setIsDeleteModalOpen(true);
                }}
                onAddPrinter={() => setIsAddPrinterOpen(true)}
                onOpenServerSettings={() => setIsServerSettingsOpen(true)}
                onPrintTestPage={handlePrintTestPage}
              />
            )}
          </div>
        )}

        {/* Tab 2: Print Jobs & Document Queue */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Print Jobs &amp; Document Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live monitoring of print spooler jobs with hold, release, restart, and cancellation controls
              </p>
            </div>

            <JobQueueTable
              activeJobs={activeJobs}
              completedJobs={completedJobs}
              onCancelJob={handleCancelJob}
              onHoldJob={handleHoldJob}
              onReleaseJob={handleReleaseJob}
              onRestartJob={handleRestartJob}
            />
          </div>
        )}

        {/* Tab 3: System Logs & Intelligent Diagnostics Engine */}
        {activeTab === 'logs' && (
          <LogsViewer />
        )}

        {/* Slide-over Drawer for PPD Configuration, Details, Driver & Rosetta 2 Audit */}
        <PrinterConfigModal
          printer={configModalPrinter}
          initialTab={configModalTab}
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSaveSuccess={() => fetchData(false)}
        />

        {/* Phase 4: Add Printer Modal (Right-side slide drawer with Safe Naming) */}
        <AddPrinterModal
          isOpen={isAddPrinterOpen}
          onClose={() => setIsAddPrinterOpen(false)}
          onSuccess={(newName) => {
            showToast(`Print queue "${newName}" created successfully!`);
            fetchData(false);
          }}
          onConfigureCreated={(printer) => {
            setConfigModalPrinter(printer);
            setConfigModalTab('preferences');
            setIsConfigModalOpen(true);
            fetchData(false);
          }}
        />

        {/* Phase 4: CUPS Server Settings Modal (cupsctl) */}
        <ServerSettingsModal
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          onSuccess={() => {
            showToast('CUPS server daemon settings applied successfully');
            fetchData(false);
          }}
        />

        {/* Delete Confirmation Modal */}
        <DeletePrinterModal
          printer={deleteModalPrinter}
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirmDelete={handleDeletePrinter}
        />

        {/* Fleet Audit Modal */}
        <FleetAuditModal
          printers={printers}
          isOpen={isFleetAuditOpen}
          onClose={() => setIsFleetAuditOpen(false)}
          onSelectPrinterForAudit={(printer) => {
            setConfigModalPrinter(printer);
            setConfigModalTab('audit');
            setIsConfigModalOpen(true);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              Web interface for CUPS • Bound strictly to loopback{' '}
              <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">127.0.0.1:6310</code>
            </p>
            <p>Designed for macOS &amp; UNIX</p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 text-center">
            Copyright &copy; 2007-2022 Apple Inc. CUPS 2.2 and earlier are provided under the terms of the{' '}
            <a
              href="https://www.cups.org/doc/old-license.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              GNU GPL2 and LGPL2 with exceptions
            </a>{' '}
            while CUPS 2.3 and later are provided under the terms of the{' '}
            <a
              href="https://www.cups.org/doc/license.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Apache License, Version 2.0
            </a>
            . CUPS, the CUPS logo, and macOS are trademarks of{' '}
            <a
              href="https://www.apple.com/legal/intellectual-property/trademark/appletmlist.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Apple Inc.
            </a>{' '}
            All other trademarks are the property of their respective owners.{' '}
            <a
              href="https://www.apple.com/legal/privacy/en-ww/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Apple Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
