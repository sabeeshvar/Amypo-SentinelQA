import React, { useState, useEffect } from 'react';
import { Database, Play, CheckCircle, AlertTriangle, Table, Clock, Terminal, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function DatabaseStudio() {
  const [schemaData, setSchemaData] = useState(null);
  const [activeTable, setActiveTable] = useState('servers');
  const [naturalQuery, setNaturalQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    try {
      const data = await api.getDatabaseSchema();
      setSchemaData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load local database schema');
    }
  };

  const handleRunQuery = async (e) => {
    e?.preventDefault();
    if (!naturalQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.queryDatabase(naturalQuery);
      setQueryResult(res);
      if (res.error) setError(res.error);
    } catch (err) {
      setError(err.message || 'Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const presetQueries = [
    'Which servers are currently in DEGRADED or MAINTENANCE status?',
    'List the top 3 highest monthly cost servers and their locations',
    'Show all open or in-progress incident tickets with assigned engineers',
    'Which servers have non-compliant or pending security patches in SOC2 audits?',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-100">PS7 Local Database QA & SQL Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Offline SQLite query generator with read-only security guardrails and sub-second execution.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20">
          <span>Read-Only Guardrail Active</span>
        </div>
      </div>

      {/* Query Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleRunQuery} className="flex gap-2">
          <input
            type="text"
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            placeholder="Ask anything about servers, incidents, audits (e.g. 'Show P1 critical tickets')..."
            className="flex-1 bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-3 border border-slate-800 focus:outline-none focus:border-sky-500/60 font-sans"
          />
          <button
            type="submit"
            disabled={loading || !naturalQuery.trim()}
            className="px-5 py-3 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{loading ? 'Executing...' : 'Run Natural SQL'}</span>
          </button>
        </form>

        {/* Preset quick queries */}
        <div className="flex flex-wrap gap-2 pt-1">
          {presetQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setNaturalQuery(q);
              }}
              className="text-left text-xs px-3 py-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Results */}
      {queryResult && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Generated SQL Execution Result
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                {queryResult.execution_time_ms} ms
              </span>
              <span>{queryResult.row_count} rows</span>
            </div>
          </div>

          <div className="p-3 bg-black/60 rounded-xl border border-slate-800 font-mono text-xs text-sky-300">
            {queryResult.generated_sql}
          </div>

          {queryResult.explanation && (
            <p className="text-xs text-slate-400 italic">
              {queryResult.explanation}
            </p>
          )}

          {error ? (
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    {queryResult.columns.map((c, i) => (
                      <th key={i} className="py-2.5 px-3 font-semibold">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-sans">
                  {queryResult.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                      {row.map((val, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 text-slate-200 font-mono text-[11px]">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schema Browser & Sample Table Explorer */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Local SQLite Database Tables
            </h3>
          </div>
          <div className="flex gap-2">
            {['servers', 'incident_tickets', 'security_compliance_audits'].map((tbl) => (
              <button
                key={tbl}
                onClick={() => setActiveTable(tbl)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  activeTable === tbl
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>
        </div>

        {schemaData && schemaData.tables && schemaData.tables[activeTable] && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  {schemaData.tables[activeTable].columns.map((c, i) => (
                    <th key={i} className="py-2 px-3 font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {schemaData.tables[activeTable].rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/30">
                    {row.map((val, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
