import React from 'react';
import { ShieldCheck, AlertCircle, AlertOctagon, HelpCircle, CheckCircle2, FileSearch, Sparkles } from 'lucide-react';
import LatencyWaterfall from './LatencyWaterfall';
import SourceViewer from './SourceViewer';

export default function ExplainabilityPanel({ queryResponse, selectedClaimId, onSelectClaim }) {
  if (!queryResponse) {
    return (
      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center text-slate-500 h-[560px] border border-slate-800">
        <Sparkles className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-400">Explainability & Verification Inspector</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Submit a query to inspect real-time claim deconstruction, cross-encoder NLI scores, and latency metrics.
        </p>
      </div>
    );
  }

  const { claims, sources, reliability, latency, model_used } = queryResponse;
  const selectedClaim = claims.find((c) => c.claim_id === selectedClaimId) || claims[0];

  return (
    <div className="space-y-4">
      {/* Selected Claim Deep-Dive Card */}
      {selectedClaim && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Claim Verification Inspector #{selectedClaim.claim_id}
              </span>
            </div>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono border ${
                selectedClaim.status === 'ENTAILED'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : selectedClaim.status === 'CONTRADICTION'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {selectedClaim.status}
            </span>
          </div>

          {/* Proposition text */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 italic font-sans">
            "{selectedClaim.claim_text}"
          </div>

          {/* NLI Probability Distribution Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>NLI Inference Distribution</span>
              <span className="text-emerald-400 font-bold">
                Confidence: {(selectedClaim.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-900 flex overflow-hidden border border-slate-800">
              <div
                style={{ width: `${selectedClaim.entailment_prob * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Entailment: ${(selectedClaim.entailment_prob * 100).toFixed(1)}%`}
              />
              <div
                style={{ width: `${selectedClaim.neutral_prob * 100}%` }}
                className="bg-amber-500 h-full"
                title={`Neutral: ${(selectedClaim.neutral_prob * 100).toFixed(1)}%`}
              />
              <div
                style={{ width: `${selectedClaim.contradiction_prob * 100}%` }}
                className="bg-rose-500 h-full"
                title={`Contradiction: ${(selectedClaim.contradiction_prob * 100).toFixed(1)}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
              <span className="text-emerald-400">Entail: {(selectedClaim.entailment_prob * 100).toFixed(0)}%</span>
              <span className="text-amber-400">Neu: {(selectedClaim.neutral_prob * 100).toFixed(0)}%</span>
              <span className="text-rose-400">Contra: {(selectedClaim.contradiction_prob * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Verification Reasoning */}
          <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
              Factual Grounding Rationale:
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {selectedClaim.reasoning}
            </p>
          </div>

          {/* Best Matching Evidence Snippet */}
          {selectedClaim.evidence_snippet && (
            <div className="text-xs bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1">
                Corroborating Evidence in {selectedClaim.best_matching_doc || 'Source'}:
              </div>
              <p className="text-slate-300 text-[11px] font-mono leading-relaxed">
                "{selectedClaim.evidence_snippet}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Latency Waterfall Chart */}
      <LatencyWaterfall latency={latency} />

      {/* Sources list */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <SourceViewer
          sources={sources}
          highlightedChunkId={selectedClaim?.best_matching_chunk_id}
        />
      </div>
    </div>
  );
}
