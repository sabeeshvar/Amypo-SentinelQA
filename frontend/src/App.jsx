import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ChatInterface from './components/ChatInterface';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import DatabaseStudio from './components/DatabaseStudio';
import DocumentManager from './components/DocumentManager';
import BenchmarkRunner from './components/BenchmarkRunner';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.warn('Backend offline or health check failed:', err);
    }
  };

  const handleRunQuery = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.query(params);
      setCurrentResult(res);
      if (res.claims && res.claims.length > 0) {
        setSelectedClaimId(res.claims[0].claim_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectBenchmarkResult = (res) => {
    setCurrentResult(res);
    if (res.claims && res.claims.length > 0) {
      setSelectedClaimId(res.claims[0].claim_id);
    }
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between">
            <span>Error: {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Conversational RAG & NLI Fact-Checker */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Query Interface & Answer */}
            <div className="lg:col-span-7">
              <ChatInterface
                onRunQuery={handleRunQuery}
                loading={loading}
                currentResult={currentResult}
                selectedClaimId={selectedClaimId}
                onSelectClaim={setSelectedClaimId}
              />
            </div>

            {/* Right Column: Explainability & Verification Inspector Panel */}
            <div className="lg:col-span-5">
              <ExplainabilityPanel
                queryResponse={currentResult}
                selectedClaimId={selectedClaimId}
                onSelectClaim={setSelectedClaimId}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Local Database SQL Studio (PS7) */}
        {activeTab === 'database' && <DatabaseStudio />}

        {/* Tab 3: Knowledge Base & Ingestion */}
        {activeTab === 'documents' && (
          <DocumentManager
            health={health}
            onRefreshHealth={fetchHealth}
          />
        )}

        {/* Tab 4: Benchmark Runner */}
        {activeTab === 'benchmarks' && (
          <BenchmarkRunner
            onInspectBenchmarkResult={handleInspectBenchmarkResult}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span>VeriQuery &copy; 2026 HackWithAMYPO &bull; PS7 + PS2 Offline AI Architecture</span>
          <span className="font-mono text-[11px] text-emerald-400/80">Latency Target &lt;10s &bull; RAM &lt;8GB &bull; 0 API Keys</span>
        </div>
      </footer>
    </div>
  );
}
