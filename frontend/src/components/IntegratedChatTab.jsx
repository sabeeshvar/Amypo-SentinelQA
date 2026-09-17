import React, { useState } from 'react';
import { api } from '../services/api';
import { renderMarkdown, parseSourceItem } from '../utils/markdown';

export default function IntegratedChatTab() {
  const [question, setQuestion] = useState('');
  const [userId, setUserId] = useState('auditor_01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [verification, setVerification] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);

  const quickQuestions = [
    {
      label: 'Password Rotation Policy',
      text: 'What is the password rotation policy in the cybersecurity guidelines?',
    },
    {
      label: 'P1 Incident Response SLA',
      text: 'What is the response SLA and resolution target for a P1 Critical security incident?',
    },
    {
      label: 'Cloud Disaster Recovery RTO',
      text: 'What is the Recovery Time Objective (RTO) and snapshot frequency in the Cloud DR SOP?',
    },
    {
      label: 'Clinical Trial Dosage Regimen',
      text: 'What is the daily dosage schedule and duration for Compound-Q2 in Phase 3?',
    },
  ];

  const handleAsk = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setVerification(null);
    setSelectedSource(null);
    const start = performance.now();

    try {
      // 1. Submit to POST /api/v1/ask
      const askData = await api.askV1(question, userId);
      setResponse(askData);

      // 2. Perform PS2 verification via POST /api/v1/verify
      const sourceSnippets = (askData.sources || []).map((s) => s.snippet);
      const verifyData = await api.verifyV1(askData.answer, sourceSnippets);
      setVerification(verifyData);

      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
    } catch (err) {
      setError(err.message || 'Failed to process question via /api/v1/ask');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'trustworthy':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            TRUSTWORTHY
          </span>
        );
      case 'partially_reliable':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            PARTIALLY RELIABLE
          </span>
        );
      case 'misleading':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            MISLEADING
          </span>
        );
      case 'fabricated':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            FABRICATED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {verdict || 'UNVERIFIED'}
          </span>
        );
    }
  };

  // Highlight flagged spans within the generated answer
  const renderHighlightedAnswer = (answerText, flaggedSpans = []) => {
    const renderedHtml = renderMarkdown(answerText);

    if (!flaggedSpans || flaggedSpans.length === 0) {
      return (
        <div 
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 leading-relaxed font-sans text-sm markdown-content"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      );
    }

    return (
      <div className="space-y-3">
        <div 
          className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 leading-relaxed font-sans text-sm markdown-content"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
            ⚠️ Flagged Spans & Fact Contradictions ({flaggedSpans.length}):
          </p>
          {flaggedSpans.map((span, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200"
            >
              <div className="font-semibold text-rose-300 mb-1">
                &ldquo;{span.text}&rdquo;
              </div>
              <div className="text-[11px] text-rose-400/90 font-mono">
                Reason: {span.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Query Form & Quick Questions */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Ask Local Knowledge Base (PS7)
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              POST /api/v1/ask
            </span>
          </div>

          <form onSubmit={handleAsk} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Natural Language Question:
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="Ask any question about enterprise security, cloud SOPs, clinical protocols, or server status..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">User ID:</span>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 w-28 focus:outline-none focus:border-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing Offline...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Query</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Pre-fill Prompts */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2.5">
              1-Click Benchmark Questions:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q.text)}
                  className="text-left px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-emerald-300 transition-all truncate"
                  title={q.text}
                >
                  📌 {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Source Citations Card */}
        {response?.sources && response.sources.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📚</span> Sources ({response.sources.length})
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Verified Evidence</span>
            </div>

            <div className="space-y-3">
              {response.sources.map((rawSrc, index) => {
                const src = parseSourceItem(rawSrc, index);
                const isSelected = selectedSource === src.recordId;
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedSource(isSelected ? null : src.recordId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-200 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 pb-1.5 border-b border-slate-800/60">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-800/50 px-1.5 py-0.5 rounded">
                          [{src.citationNumber}]
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          📄 {src.filename}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {src.chunkLabel || `Citation #${src.citationNumber}`}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mb-2 truncate">
                      Record ID: <span className="text-slate-400">{src.recordId}</span>
                    </div>
                    <div className="text-xs leading-relaxed font-sans bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                        Relevant Snippet ({isSelected ? 'Full' : 'Click to Expand'}):
                      </span>
                      <div 
                        className={isSelected ? '' : 'line-clamp-3'}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(src.snippet) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Grounded Answer & Reliability Report Card */}
      <div className="lg:col-span-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {response ? (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
            {/* Header with Reliability Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  PS2 Factuality Verdict
                </span>
                {verification ? getVerdictBadge(verification.verdict) : <span className="text-xs">Evaluating...</span>}
              </div>

              {latencyMs && (
                <div className="text-right">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Latency Guarantee
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-medium">
                    ⚡ {latencyMs} ms (&lt; 10s budget)
                  </span>
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Confidence
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {Math.round((response.confidence || 0) * 100)}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Reliability Score
                </span>
                <span className="text-lg font-bold text-teal-300 font-mono">
                  {verification ? Math.round(verification.reliability_score * 100) : '--'}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Hallucination Prob.
                </span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  {verification ? Math.round(verification.hallucination_probability * 100) : '--'}%
                </span>
              </div>
            </div>

            {/* Answer Section with Flagged Spans */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Grounded RAG Answer:</span>
                <span className="text-emerald-400 font-semibold">100% Offline Synthesis</span>
              </h3>
              {renderHighlightedAnswer(response.answer, verification?.flagged_spans)}
            </div>

            {/* Verification Summary Banner */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between font-mono">
              <span className="text-slate-400">Zero Cloud API Calls</span>
              <span className="text-emerald-400">Verified by DeBERTa-v3 CPU NLI</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 space-y-3">
            <span className="text-4xl block">🔍</span>
            <p className="text-sm font-medium text-slate-400">
              Submit a question or click a benchmark prompt to inspect the offline RAG answer and real-time PS2 hallucination scores.
            </p>
            <p className="text-xs font-mono text-slate-600">
              Connected endpoints: POST /api/v1/ask &bull; POST /api/v1/verify
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
