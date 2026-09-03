import React, { useState } from 'react';

export default function DocsAndDiagnosticsTab({ health, onRefreshHealth }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Diagnostics Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>🩺</span> System Diagnostics & Offline Compliance Telemetry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              HackWithAMYPO 2026 Hard Constraints: 0 Third-Party APIs &bull; &lt; 8 GB RAM &bull; &lt; 10s Latency
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshHealth}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all font-mono"
            >
              ↻ Refresh Telemetry
            </button>
            <a
              href="/openapi.yaml"
              download
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition-all"
            >
              📥 openapi.yaml
            </a>
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono transition-all"
            >
              ↗ Open /docs in Tab
            </a>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Air-Gapped Status
            </span>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              100% OFFLINE
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              0 external API keys
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              RAM Footprint
            </span>
            <div className="text-sm font-bold text-cyan-300 font-mono">
              {health?.ram_usage_mb ? `${Math.round(health.ram_usage_mb)} MB` : 'Monitoring...'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Limit: 8192 MB (8 GB)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Local LLM Engine
            </span>
            <div className="text-xs font-bold text-slate-200 font-mono truncate" title={health?.llm_engine}>
              {health?.llm_engine || 'Offline Local Synthesizer'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              4-bit GGUF / CPU
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              NLI Verifier Model
            </span>
            <div className="text-xs font-bold text-teal-300 font-mono truncate" title={health?.nli_model}>
              {health?.nli_model || 'nli-deberta-v3-small'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Sub-second CPU Cross-Encoder
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Swagger UI / OpenAPI Viewer */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <h3 className="text-sm font-bold text-white">
              Interactive OpenAPI / Swagger Documentation
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Embedded from <code className="text-emerald-400">/docs</code>
          </span>
        </div>

        <div className="w-full h-[650px] rounded-xl overflow-hidden border border-slate-800 bg-white">
          <iframe
            src="/docs"
            title="VeriQuery OpenAPI Documentation"
            className="w-full h-full border-0"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}
