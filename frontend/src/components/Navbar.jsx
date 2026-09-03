import React from 'react';

export default function Navbar({ activeTab, setActiveTab, health }) {
  const isHealthy = health && (health.status === 'healthy' || health.status === 'HEALTHY');
  const isOffline = health?.offline ?? true;

  const tabs = [
    { id: 'integrated', label: 'PS7 + PS2 Engine (Chat & QA)', icon: '💬' },
    { id: 'sandbox', label: 'PS2 Verification Sandbox', icon: '🔬' },
    { id: 'docs', label: 'API Docs & Diagnostics', icon: '📖' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-xl font-bold text-white">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                VeriQuery <span className="text-emerald-400 font-mono text-sm">/ SentinelQA</span>
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                HackWithAMYPO 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Offline RAG (PS7) + AI Hallucination & Fact Verifier (PS2)
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Live System Status Indicator (Green/Red Pill) */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border shadow-sm ${
              isHealthy && isOffline
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                isHealthy && isOffline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              }`}
            />
            <span>
              {isHealthy && isOffline ? 'Local System: Healthy & Offline' : 'Local System: Degraded / Error'}
            </span>
          </div>

          {health?.ram_usage_mb !== undefined && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="text-slate-500">RAM:</span>
              <span className="text-cyan-400 font-medium">
                {Math.round(health.ram_usage_mb)} MB
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-500">8 GB Limit</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
