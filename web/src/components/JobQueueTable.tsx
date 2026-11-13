import React, { useState } from 'react';
import {
  FileText,
  XCircle,
  Clock,
  User,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Search,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { Job } from '../types/cups';
import { formatBytes } from '../utils/format';

interface JobQueueTableProps {
  activeJobs: Job[];
  completedJobs: Job[];
  onCancelJob: (id: string) => Promise<void>;
  onHoldJob: (id: string) => Promise<void>;
  onReleaseJob: (id: string) => Promise<void>;
  onRestartJob: (id: string) => Promise<void>;
}

export const JobQueueTable: React.FC<JobQueueTableProps> = ({
  activeJobs,
  completedJobs,
  onCancelJob,
  onHoldJob,
  onReleaseJob,
  onRestartJob,
}) => {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [search, setSearch] = useState('');
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const currentJobs = tab === 'active' ? activeJobs : completedJobs;

  const filteredJobs = currentJobs.filter((job) => {
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.user.toLowerCase().includes(q) ||
      job.printer.toLowerCase().includes(q) ||
      job.id.includes(q)
    );
  });

  const handleCancel = async (id: string) => {
    setBusyJobId(id);
    try {
      await onCancelJob(id);
    } finally {
      setBusyJobId(null);
    }
  };

  const handleHold = async (id: string) => {
    setBusyJobId(id);
    try {
      await onHoldJob(id);
    } finally {
      setBusyJobId(null);
    }
  };

  const handleRelease = async (id: string) => {
    setBusyJobId(id);
    try {
      await onReleaseJob(id);
    } finally {
      setBusyJobId(null);
    }
  };

  const handleRestart = async (id: string) => {
    setBusyJobId(id);
    try {
      await onRestartJob(id);
    } finally {
      setBusyJobId(null);
    }
  };

  const getStatusBadge = (job: Job) => {
    if (job.is_stuck) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3" />
          <span>Stuck</span>
        </span>
      );
    }

    switch (job.state) {
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            <span>Printing</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            <span>Queued</span>
          </span>
        );
      case 'held':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            <Pause className="w-3 h-3" />
            <span>Held</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {job.state}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
      {/* Header with Tabs & Search */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 p-1 rounded-xl">
          <button
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'active'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/80 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active Queues ({activeJobs.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'completed'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/80 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Completed History ({completedJobs.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, printers, users..."
            className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-semibold">Job ID</th>
              <th className="py-3 px-4 font-semibold">Document Title</th>
              <th className="py-3 px-4 font-semibold">Target Printer</th>
              <th className="py-3 px-4 font-semibold">User</th>
              <th className="py-3 px-4 font-semibold">Size</th>
              <th className="py-3 px-4 font-semibold">Submitted</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-slate-500 dark:text-slate-400"
                >
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-sm">
                    {tab === 'active' ? 'No active print jobs' : 'No completed jobs recorded'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tab === 'active'
                      ? 'Queues are clear and ready to accept print requests.'
                      : 'Recently finished jobs will be logged here.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr
                  key={`${job.printer}-${job.id}`}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition ${
                    job.is_stuck ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                    #{job.id}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                    {job.title}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                      <HardDrive className="w-3.5 h-3.5 opacity-60" />
                      <span>{job.printer}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 opacity-60" />
                      <span>{job.user}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                    {formatBytes(job.size_bytes)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 opacity-60" />
                      <span>{job.raw_date || 'Recently'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(job)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {tab === 'active' ? (
                        <>
                          {job.state === 'held' ? (
                            <button
                              onClick={() => handleRelease(job.id)}
                              disabled={busyJobId === job.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 hover:text-white dark:text-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-600 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                              title="Resume printing this held job"
                            >
                              <Play className="w-3 h-3" />
                              <span>{busyJobId === job.id ? 'Resuming...' : 'Release'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleHold(job.id)}
                              disabled={busyJobId === job.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-700 hover:text-white dark:text-amber-400 hover:bg-amber-600 dark:hover:bg-amber-600 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                              title="Hold this job indefinitely"
                            >
                              <Pause className="w-3 h-3" />
                              <span>{busyJobId === job.id ? 'Holding...' : 'Hold'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleCancel(job.id)}
                            disabled={busyJobId === job.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:text-white dark:text-rose-400 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                            title="Cancel this print job"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>{busyJobId === job.id ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestart(job.id)}
                          disabled={busyJobId === job.id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="Reprint / Restart this job"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{busyJobId === job.id ? 'Restarting...' : 'Reprint'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
