import React, { useState } from 'react';
import { Send, Shield, Zap, Sparkles, Database, FileCheck, RefreshCw, AlertCircle } from 'lucide-react';
import MetricsCard from './MetricsCard';
import SentenceHeatmap from './SentenceHeatmap';
import { renderMarkdown } from '../utils/markdown';

export default function ChatInterface({
  onRunQuery,
  loading,
  currentResult,
  selectedClaimId,
  onSelectClaim,
}) {
  const [query, setQuery] = useState('');
  const [databaseMode, setDatabaseMode] = useState(false);
  const [verifyHallucinations, setVerifyHallucinations] = useState(true);

  const samplePrompts = [
    {
      title: 'SOC2 & Password Policy',
      query: 'What is the required password length and rotation policy in the cybersecurity guidelines?',
      tag: 'PS2 RAG',
    },
    {
      title: 'Disaster Recovery RTO',
      query: 'What is the automated snapshot cadence and failover RTO in the Cloud SOP?',
      tag: 'PS2 Grounding',
    },
    {
      title: 'Degraded Servers Audit',
      query: 'Which servers are degraded or in maintenance?',
      tag: 'PS7 Local SQL',
      db: true,
    },
    {
      title: 'Phase 3 Adverse Events',
      query: 'What is the adverse event reporting window and dosage for Compound-Q2?',
      tag: 'PS2 Medical QA',
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    onRunQuery({
      query: query.trim(),
      database_mode: databaseMode,
      verify_hallucinations: verifyHallucinations,
    });
  };

  const handleSelectSample = (sample) => {
    setQuery(sample.query);
    if (sample.db) {
      setDatabaseMode(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Query Input Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any question against local documents or SQLite databases..."
              className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm rounded-xl pl-4 pr-24 py-3.5 border border-slate-800 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Verifying...' : 'Query'}</span>
            </button>
          </div>

          {/* Quick Filter & Mode Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVerifyHallucinations(!verifyHallucinations)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  verifyHallucinations
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>NLI Hallucination Verifier</span>
              </button>

              <button
                type="button"
                onClick={() => setDatabaseMode(!databaseMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  databaseMode
                    ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>PS7 Database Mode</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Offline CPU Inference &bull; Zero API Keys</span>
            </div>
          </div>
        </form>

        {/* Quick Starter Prompts */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Curated Test Prompts (Hackathon PS7 & PS2)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSample(p)}
                className="text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-2 group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {p.query}
                  </div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono whitespace-nowrap">
                  {p.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer & Verification Response Area */}
      {currentResult && (
        <div className="space-y-4">
          {/* Top Reliability Telemetry Card */}
          <MetricsCard
            reliability={currentResult.reliability}
            latency={currentResult.latency}
          />

          {/* Answer Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Grounded Factual Answer
                </h3>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Engine: <span className="text-slate-200">{currentResult.model_used}</span>
              </div>
            </div>

            {/* Structured SQL Tabular Results if in Database Mode */}
            {currentResult.database_results && currentResult.database_results.rows && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-sky-400 font-semibold">
                  <span>Generated SQL:</span>
                  <span className="text-slate-400">{currentResult.database_results.row_count} rows returned</span>
                </div>
                <pre className="p-2.5 rounded-lg bg-black/50 text-xs font-mono text-sky-300 overflow-x-auto border border-sky-950">
                  {currentResult.database_results.generated_sql}
                </pre>
                {currentResult.database_results.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          {currentResult.database_results.columns.map((c, i) => (
                            <th key={i} className="py-1.5 px-2 font-medium">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentResult.database_results.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-slate-800/40 hover:bg-slate-800/30 text-slate-300">
                            {row.map((val, ci) => (
                              <td key={ci} className="py-1 px-2 font-mono text-[11px]">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Answer Text */}
            <div 
              className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 markdown-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(currentResult.answer) }}
            />

            {/* Sentence-by-Sentence Groundedness Heatmap */}
            <SentenceHeatmap
              claims={currentResult.claims}
              selectedClaimId={selectedClaimId}
              onSelectClaim={onSelectClaim}
            />
          </div>
        </div>
      )}
    </div>
  );
}
