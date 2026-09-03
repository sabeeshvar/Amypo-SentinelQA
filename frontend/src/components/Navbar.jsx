import React from 'react';
import { ShieldCheck, Cpu, Database, FileText, CheckCircle2, Zap, Award } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, health }) {
  const tabs = [
    { id: 'chat', label: 'RAG & Fact-Checker', icon: ShieldCheck, badge: 'PS2 + PS7' },
    { id: 'database', label: 'Local SQL Studio', icon: Database, badge: 'PS7' },
    { id: 'documents', label: 'Knowledge Base', icon: FileText, count: health?.chroma_documents_count || 0 },
    { id: 'benchmarks', label: 'Hackathon Benchmarks', icon: Award },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                VeriQuery
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase tracking-wider">
                100% Offline
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              HackWithAMYPO 2026 • Local DB QA & Hallucination Verifier
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Footprint Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">RAM:</span>
            <span className="font-mono font-medium text-slate-200">
              {health?.ram_usage_mb ? `${health.ram_usage_mb.toFixed(0)} MB` : 'Optimal'}
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono">(&lt;8GB Limit)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <div className={`w-2 h-2 rounded-full ${health?.status === 'HEALTHY' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 text-[11px] font-medium font-mono">
              {health?.ollama_connected ? 'Ollama Online' : 'Offline Mode'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
