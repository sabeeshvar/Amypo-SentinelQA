import React, { useState } from 'react';
import { FileUp, FileText, CheckCircle2, RefreshCw, Layers, ShieldCheck, Database } from 'lucide-react';
import { api } from '../services/api';

export default function DocumentManager({ health, onRefreshHealth }) {
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  const sampleDocs = [
    {
      name: 'placement_eligibility.md',
      type: 'Markdown',
      topics: 'Min CGPA 7.5, 75% Attendance, 0 Active Arrears, General Eligibility',
    },
    {
      name: 'placement_process.md',
      type: 'Markdown',
      topics: '7-Stage Lifecycle: Registration, Resume, Screening, Training, Assessment, Interviews',
    },
    {
      name: 'attendance_policy.md',
      type: 'Markdown',
      topics: '75% Mandatory Attendance, Placement Debarment, Condonation Regulations',
    },
    {
      name: 'academic_rules.md',
      type: 'Markdown',
      topics: 'CIA 40% & ESE 60% Weightage, Passing Rules, Arrears & Credit Progression',
    },
    {
      name: 'company_requirements.md',
      type: 'Markdown',
      topics: 'Company A (CGPA 7.5), Company B (CGPA 7.0), Company C (CGPA 8.0)',
    },
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await api.uploadFile(file);
      setStatusMessage(`Successfully indexed ${res.filename} (${res.chunks_created} chunks).`);
      if (onRefreshHealth) onRefreshHealth();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await api.reindexDocs();
      setStatusMessage(`Re-indexed ${res.total_documents} chunks across all sample documents.`);
      if (onRefreshHealth) onRefreshHealth();
    } catch (err) {
      setError(err.message || 'Re-index failed');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100">Offline Knowledge Base & Ingestion</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Local ChromaDB vector database with recursive text chunking and sentence embeddings.
          </p>
        </div>
        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} />
          <span>{reindexing ? 'Re-indexing...' : 'Re-index All Docs'}</span>
        </button>
      </div>

      {/* File Ingestion Drag-and-Drop Area */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <FileUp className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Ingest Local Document</h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports PDF, Markdown (.md), Plain Text (.txt), CSV, and JSON formats.
          </p>
        </div>

        <label className="inline-block cursor-pointer px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all">
          <span>{uploading ? 'Processing & Chunking...' : 'Browse Local Files'}</span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.txt,.md,.csv,.json"
          />
        </label>

        {statusMessage && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Current Indexed Knowledge Base */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Pre-Loaded Offline Knowledge Base Documents
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {health?.chroma_documents_count || 3} Active Chunks in Vector Store
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sampleDocs.map((doc, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 font-mono">
                  {doc.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {doc.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {doc.topics}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
