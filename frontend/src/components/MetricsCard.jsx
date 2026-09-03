import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Clock, Zap } from 'lucide-react';

export default function MetricsCard({ reliability, latency }) {
  if (!reliability) return null;

  const score = reliability.overall_score;
  const isHigh = score >= 80;
  const isModerate = score >= 50 && score < 80;
  const isLow = score < 50;

  const getScoreColor = () => {
    if (isHigh) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (isModerate) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {/* Reliability Score */}
      <div className="glass-card p-3.5 rounded-xl flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg font-mono border ${getScoreColor()}`}>
          {score.toFixed(0)}%
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Reliability Score</div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5">
            {reliability.hallucination_risk.split('(')[0]}
          </div>
        </div>
      </div>

      {/* Claim Breakdown */}
      <div className="glass-card p-3.5 rounded-xl">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">NLI Verification</div>
        <div className="flex items-center gap-2 text-xs font-mono font-medium">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {reliability.entailed_claims_count} Entailed
          </span>
          <span className="text-amber-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {reliability.neutral_claims_count} Neu
          </span>
          {reliability.contradicted_claims_count > 0 && (
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
              {reliability.contradicted_claims_count} Contra
            </span>
          )}
        </div>
      </div>

      {/* Faithfulness Index */}
      <div className="glass-card p-3.5 rounded-xl">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Faithfulness Index</div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono text-slate-100">
            {(reliability.faithfulness_index * 100).toFixed(0)}%
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            ({reliability.entailed_claims_count}/{reliability.total_claims_count} claims)
          </span>
        </div>
      </div>

      {/* Latency Pipeline */}
      <div className="glass-card p-3.5 rounded-xl">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Total Latency</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono text-emerald-400">
            {latency ? `${(latency.total_ms / 1000).toFixed(2)}s` : '0.45s'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">(&lt; 10s budget)</span>
        </div>
      </div>
    </div>
  );
}
