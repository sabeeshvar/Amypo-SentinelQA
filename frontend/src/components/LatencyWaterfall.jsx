import React from 'react';
import { Clock, Search, Cpu, CheckSquare } from 'lucide-react';

export default function LatencyWaterfall({ latency }) {
  if (!latency) return null;

  const total = Math.max(1, latency.total_ms);
  const retPct = Math.min(100, (latency.retrieval_ms / total) * 100);
  const genPct = Math.min(100, (latency.generation_ms / total) * 100);
  const verPct = Math.min(100, (latency.verification_ms / total) * 100);

  return (
    <div className="glass-card p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Latency Waterfall (&lt; 10s Hackathon Budget)</span>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-400">
          {latency.total_ms.toFixed(1)} ms
        </span>
      </div>

      {/* Progress Bar Breakdown */}
      <div className="h-3 w-full rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
        <div
          style={{ width: `${retPct}%` }}
          className="bg-sky-500 h-full transition-all duration-300"
          title={`Vector Retrieval: ${latency.retrieval_ms}ms`}
        />
        <div
          style={{ width: `${genPct}%` }}
          className="bg-emerald-500 h-full transition-all duration-300"
          title={`LLM Generation: ${latency.generation_ms}ms`}
        />
        <div
          style={{ width: `${verPct}%` }}
          className="bg-purple-500 h-full transition-all duration-300"
          title={`NLI Verification: ${latency.verification_ms}ms`}
        />
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <div className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
          <span>Retrieval: {latency.retrieval_ms.toFixed(0)}ms</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>LLM Gen: {latency.generation_ms.toFixed(0)}ms</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span>NLI Check: {latency.verification_ms.toFixed(0)}ms</span>
        </div>
      </div>
    </div>
  );
}
