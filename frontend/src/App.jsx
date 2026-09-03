import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import IntegratedChatTab from './components/IntegratedChatTab';
import StandaloneSandboxTab from './components/StandaloneSandboxTab';
import DocsAndDiagnosticsTab from './components/DocsAndDiagnosticsTab';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('integrated');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await api.getV1Health();
      setHealth(data);
    } catch (err) {
      console.warn('Backend offline or v1 health check failed:', err);
      // Fallback check to legacy health endpoint if v1 health endpoint fails
      try {
        const legacyData = await api.getHealth();
        setHealth({
          status: legacyData.status.toLowerCase(),
          offline: true,
          ram_usage_mb: legacyData.ram_usage_mb,
          ram_limit_mb: legacyData.ram_limit_mb,
          llm_engine: legacyData.models?.llm,
          embedding_model: legacyData.models?.embeddings,
          nli_model: legacyData.models?.nli_verifier,
          documents_indexed: legacyData.chroma_documents_count,
        });
      } catch {
        setHealth({ status: 'error', offline: false });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Unified Header with live status pill */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
      />

      {/* Main Single Screen Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {/* Tab 1: PS7 + PS2 Integrated View */}
        {activeTab === 'integrated' && <IntegratedChatTab />}

        {/* Tab 2: PS2 Standalone Verification Sandbox */}
        {activeTab === 'sandbox' && <StandaloneSandboxTab />}

        {/* Tab 3: API Docs & System Diagnostics */}
        {activeTab === 'docs' && (
          <DocsAndDiagnosticsTab
            health={health}
            onRefreshHealth={fetchHealth}
          />
        )}
      </main>

      {/* Unified Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-3.5 bg-[#0b0f17]/90 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            VeriQuery &copy; 2026 HackWithAMYPO &bull; PS7 (Offline Local Database QA) + PS2 (AI Hallucination Verification)
          </span>
          <span className="font-mono text-[11px] text-emerald-400/90">
            100% Self-Hosted &bull; &lt; 10s Latency Target &bull; &le; 8 GB RAM &bull; Zero External APIs
          </span>
        </div>
      </footer>
    </div>
  );
}
