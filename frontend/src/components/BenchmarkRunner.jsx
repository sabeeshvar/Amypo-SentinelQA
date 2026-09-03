import React, { useState, useEffect } from 'react';
import { Award, Play, CheckCircle2, AlertOctagon, Clock, ShieldCheck, Database } from 'lucide-react';
import { api } from '../services/api';

export default function BenchmarkRunner({ onInspectBenchmarkResult }) {
  const [benchmarks, setBenchmarks] = useState([]);
  const [runningId, setRunningId] = useState(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    try {
      const data = await api.getBenchmarks();
      setBenchmarks(data);
    } catch (err) {
      console.error('Failed to load benchmarks:', err);
    }
  };

  const handleRunSingle = async (bm) => {
    setRunningId(bm.id);
    try {
      const isDb = bm.category.includes('SQL');
      const res = await api.query({
        query: bm.prompt,
        database_mode: isDb,
        verify_hallucinations: true,
      });
      setResults((prev) => ({ ...prev, [bm.id]: res }));
    } catch (err) {
      console.error(err);
    } finally {
      setRunningId(null);
    }
  };

  const handleRunAll = async () => {
    setLoading(true);
    for (const bm of benchmarks) {
      await handleRunSingle(bm);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">
              HackWithAMYPO 2026 Official Benchmarks
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated verification suite testing PS7 (Database QA & SQL) and PS2 (Hallucination Detection & NLI Groundedness).
          </p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>{loading ? 'Running Evaluation...' : 'Run All Benchmark Tests'}</span>
        </button>
      </div>

      {/* Benchmark Test Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benchmarks.map((bm) => {
          const res = results[bm.id];
          const isRunning = runningId === bm.id;
          const isSql = bm.category.includes('SQL');

          return (
            <div
              key={bm.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isSql ? (
                      <Database className="w-4 h-4 text-sky-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {bm.id}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                    {bm.category}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  {bm.prompt}
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  <span className="text-slate-300 font-medium">Expected: </span>
                  {bm.expected_outcome}
                </div>
              </div>

              {/* Execution Result */}
              {res && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-bold">
                      Reliability: {res.reliability.overall_score.toFixed(0)}%
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Latency: {(res.latency.total_ms / 1000).toFixed(2)}s
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {res.answer}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {res.reliability.hallucination_risk}
                    </span>
                    {onInspectBenchmarkResult && (
                      <button
                        onClick={() => onInspectBenchmarkResult(res)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                      >
                        Inspect Full Trace &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleRunSingle(bm)}
                disabled={isRunning}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Play className="w-3 h-3 fill-slate-200" />
                <span>{isRunning ? 'Evaluating...' : 'Run This Benchmark'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
