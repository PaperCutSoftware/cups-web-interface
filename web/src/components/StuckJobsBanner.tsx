import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { Job } from '../types/cups';

interface StuckJobsBannerProps {
  stuckJobs: Job[];
  onCancelJob: (id: string) => Promise<void>;
}

export const StuckJobsBanner: React.FC<StuckJobsBannerProps> = ({ stuckJobs, onCancelJob }) => {
  if (stuckJobs.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-400 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {stuckJobs.length === 1
                ? 'Stuck Print Job Detected'
                : `${stuckJobs.length} Stuck Print Jobs Detected`}
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
              These jobs have been pending or processing for an unusually long time and may be blocking your printer queue.
            </p>
            <div className="mt-2 space-y-1">
              {stuckJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center space-x-3 text-xs text-amber-900 dark:text-amber-200 bg-white/60 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-md border border-amber-200/60 dark:border-amber-800/40"
                >
                  <span className="font-mono font-medium">#{job.id}</span>
                  <span className="font-semibold truncate max-w-xs">{job.title}</span>
                  <span className="text-amber-700 dark:text-amber-400">Queue: {job.printer}</span>
                  <button
                    onClick={() => onCancelJob(job.id)}
                    className="ml-auto inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Job</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
