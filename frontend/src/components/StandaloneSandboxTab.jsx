import React, { useState } from 'react';
import { api } from '../services/api';

export default function StandaloneSandboxTab() {
  const [responseText, setResponseText] = useState(
    'Master passwords must contain at least 16 characters and be rotated every 90 days.'
  );
  const [sourceContext, setSourceContext] = useState(
    'Master passwords must contain at least 16 characters with uppercase, lowercase, numbers, and symbols. Passwords must be rotated every 90 days.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);

  const presets = [
    {
      title: '1. Factual Baseline (Trustworthy)',
      badge: 'Expected: Trustworthy',
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      response: 'Master passwords must contain at least 16 characters and be rotated every 90 days.',
      context: 'Master passwords must contain at least 16 characters with uppercase, lowercase, numbers, and symbols. Passwords must be rotated every 90 days.',
    },
    {
      title: '2. Direct Contradiction (Fabricated)',
      badge: 'Expected: Fabricated',
      badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      response: 'SMS-based authentication is completely allowed and recommended as the default authentication mechanism.',
      context: 'SMS-based authentication is strictly prohibited; hardware security keys (FIDO2) or TOTP authenticator apps must be used.',
    },
    {
      title: '3. Clinical Dosage Hallucination (Misleading)',
      badge: 'Expected: Misleading',
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      response: 'Adult participants in Cohort A receive an oral dose of 200mg Compound-Q2 twice daily for 24 weeks.',
      context: 'Eligible adult participants in Phase 3 Trial (Cohort A) will receive an oral dose of 50mg Compound-Q2 daily for 12 consecutive weeks.',
    },
    {
      title: '4. Cloud DR RTO Violation (Contradiction)',
      badge: 'Expected: Misleading',
      badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      response: 'The disaster recovery failover guarantees an RTO within 2 hours, and snapshots run once a week.',
      context: 'The Recovery Time Objective (RTO) is guaranteed within 15 minutes. Automated database snapshots execute every 6 hours.',
    },
  ];

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!responseText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    const start = performance.now();

    try {
      const data = await api.verifyV1(responseText, sourceContext);
      setResult(data);
      setLatencyMs(Math.round(performance.now() - start));
    } catch (err) {
      setError(err.message || 'Verification request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset) => {
    setResponseText(preset.response);
    setSourceContext(preset.context);
    setResult(null);
    setError(null);
  };

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'trustworthy':
        return {
          bg: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300',
          pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
          label: 'TRUSTWORTHY',
          sub: '100% of claims are strictly entailed and factual.',
        };
      case 'partially_reliable':
        return {
          bg: 'bg-amber-950/30 border-amber-500/40 text-amber-300',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          label: 'PARTIALLY RELIABLE',
          sub: 'Some claims lack explicit factual grounding in the context.',
        };
      case 'misleading':
        return {
          bg: 'bg-orange-950/30 border-orange-500/40 text-orange-300',
          pill: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          dot: 'bg-orange-400',
          label: 'MISLEADING',
          sub: 'Direct factual contradiction or altered numerical parameters detected.',
        };
      case 'fabricated':
        return {
          bg: 'bg-rose-950/40 border-rose-500/50 text-rose-300',
          pill: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-400',
          label: 'FABRICATED / CRITICAL HALLUCINATION',
          sub: 'Major contradictions found against authoritative ground truth.',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800 text-slate-300',
          pill: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
          label: verdict,
          sub: 'Verification completed.',
        };
    }
  };

  const style = result ? getVerdictStyle(result.verdict) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner: Benchmark Presets */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <span>⚡</span> 1-Click Evaluation Presets (HackWithAMYPO PS2 Benchmark Cases):
          </h2>
          <span className="text-[11px] font-mono text-cyan-400">Endpoint: POST /api/v1/verify</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => loadPreset(preset)}
              className="text-left p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 mb-2">
                {preset.title}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border self-start ${preset.badgeColor}`}>
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔬</span> Verification Sandbox Input
              </h3>
              <span className="text-xs text-slate-500 font-mono">Zero Cloud APIs &bull; Local CPU NLI</span>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Candidate Response Text (to verify):</span>
                  <span className="text-[11px] font-mono text-rose-400">*required</span>
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  placeholder="Paste generated answer or claim to test for hallucinations..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Reference Source Context:</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    optional (defaults to local ChromaDB if empty)
                  </span>
                </label>
                <textarea
                  value={sourceContext}
                  onChange={(e) => setSourceContext(e.target.value)}
                  rows={4}
                  placeholder="Paste reference premise or ground truth text..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResponseText('');
                    setSourceContext('');
                    setResult(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 font-mono"
                >
                  Clear Inputs
                </button>

                <button
                  type="submit"
                  disabled={loading || !responseText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2"
                >
                  {loading ? (
                    <span>Verifying NLI...</span>
                  ) : (
                    <>
                      <span>Run PS2 Verification</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel: Verification Results & Explainability */}
        <div className="lg:col-span-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {result ? (
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
              {/* Verdict Header Banner */}
              <div className={`p-5 rounded-xl border ${style.bg} transition-all`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider opacity-80">
                    Mandatory Contract Verdict:
                  </span>
                  {latencyMs && (
                    <span className="text-xs font-mono text-cyan-300 font-semibold">
                      ⚡ {latencyMs} ms
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full animate-pulse ${style.dot}`} />
                  <h4 className="text-lg font-bold tracking-wide font-mono">
                    {style.label}
                  </h4>
                </div>
                <p className="text-xs opacity-90 leading-relaxed font-sans">
                  {style.sub}
                </p>
              </div>

              {/* Metrics Meters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-slate-400">Reliability Score:</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {Math.round(result.reliability_score * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${Math.round(result.reliability_score * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                    Range: 0.0 - 1.0 (Higher = Grounded)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-slate-400">Hallucination Risk:</span>
                    <span className="text-base font-bold text-rose-400 font-mono">
                      {Math.round(result.hallucination_probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                      style={{ width: `${Math.round(result.hallucination_probability * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                    Range: 0.0 - 1.0 (Lower = Safer)
                  </span>
                </div>
              </div>

              {/* Flagged Spans Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                  <span>Flagged Spans / Contradictions ({result.flagged_spans.length}):</span>
                  {result.flagged_spans.length === 0 ? (
                    <span className="text-emerald-400 text-xs font-sans">✓ No Contradictions</span>
                  ) : (
                    <span className="text-rose-400 text-xs font-sans">⚠️ Contradictions Found</span>
                  )}
                </h4>

                {result.flagged_spans.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <div className="font-semibold">All Propositional Claims Verified</div>
                      <div className="text-[11px] text-emerald-400/80">
                        The candidate response text is fully entailed and corroborated by the reference context.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {result.flagged_spans.map((span, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs space-y-1.5"
                      >
                        <div className="font-semibold text-rose-300">
                          &ldquo;{span.text}&rdquo;
                        </div>
                        <div className="text-[11px] text-rose-200/80 font-mono">
                          {span.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 space-y-3">
              <span className="text-4xl block">📊</span>
              <p className="text-sm font-medium text-slate-400">
                Click any benchmark preset above or enter custom text to see real-time PS2 Cross-Encoder NLI classification.
              </p>
              <p className="text-xs font-mono text-slate-600">
                Verdicts: trustworthy &bull; partially_reliable &bull; misleading &bull; fabricated
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
