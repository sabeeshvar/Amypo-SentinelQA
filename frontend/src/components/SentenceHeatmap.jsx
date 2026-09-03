import React from 'react';
import { CheckCircle2, HelpCircle, AlertOctagon } from 'lucide-react';

export default function SentenceHeatmap({ claims, selectedClaimId, onSelectClaim }) {
  if (!claims || claims.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
          Sentence-Level Groundedness & NLI Heatmap
        </span>
        <span className="text-[11px] italic">Click a sentence to inspect its evidence trace</span>
      </div>

      <div className="p-4 rounded-xl glass-card leading-relaxed text-sm space-y-2 border border-slate-700/60">
        {claims.map((claim) => {
          const isSelected = selectedClaimId === claim.claim_id;
          let badgeClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20';
          let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />;

          if (claim.status === 'CONTRADICTION') {
            badgeClass = 'bg-rose-500/15 text-rose-200 border-rose-500/40 hover:bg-rose-500/25 glow-red';
            icon = <AlertOctagon className="w-3.5 h-3.5 text-rose-400 inline mr-1" />;
          } else if (claim.status === 'NEUTRAL') {
            badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20';
            icon = <HelpCircle className="w-3.5 h-3.5 text-amber-400 inline mr-1" />;
          }

          return (
            <span
              key={claim.claim_id}
              onClick={() => onSelectClaim(claim.claim_id)}
              className={`inline-block cursor-pointer px-2 py-1 rounded-md border mr-1.5 mb-1 transition-all duration-150 ${badgeClass} ${
                isSelected ? 'ring-2 ring-emerald-400 font-medium scale-[1.01]' : ''
              }`}
            >
              {icon}
              <span>{claim.claim_text}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
