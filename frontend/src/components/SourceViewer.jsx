import React from 'react';
import { FileText, Bookmark, ExternalLink } from 'lucide-react';

export default function SourceViewer({ sources, highlightedChunkId }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="glass-card p-4 rounded-xl text-center text-slate-500 text-xs">
        No source context retrieved.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Retrieved Source Documents ({sources.length})</span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {sources.map((src, i) => {
          const isHighlighted = highlightedChunkId === src.chunk_id;
          return (
            <div
              key={src.chunk_id || i}
              className={`p-3 rounded-xl transition-all duration-200 border ${
                isHighlighted
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-emerald-400 font-mono">
                  [Source {i + 1}] {src.doc_name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  Sim: {(src.similarity_score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
                {src.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
