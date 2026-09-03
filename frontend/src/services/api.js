const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health status');
    return res.json();
  },

  async query(payload) {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Query processing failed');
    return res.json();
  },

  async verifyClaim(premise, hypothesis) {
    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premise_evidence: premise, hypothesis_claim: hypothesis }),
    });
    if (!res.ok) throw new Error('Verification failed');
    return res.json();
  },

  async queryDatabase(naturalQuery, executeSql = true) {
    const res = await fetch(`${API_BASE}/database/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ natural_query: naturalQuery, execute_sql: executeSql }),
    });
    if (!res.ok) throw new Error('Database query failed');
    return res.json();
  },

  async getDatabaseSchema() {
    const res = await fetch(`${API_BASE}/database/schema`);
    if (!res.ok) throw new Error('Failed to fetch database schema');
    return res.json();
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/ingest/file`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('File upload failed');
    return res.json();
  },

  async reindexDocs() {
    const res = await fetch(`${API_BASE}/ingest/reindex`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Reindex failed');
    return res.json();
  },

  async getBenchmarks() {
    const res = await fetch(`${API_BASE}/benchmarks`);
    if (!res.ok) throw new Error('Failed to fetch benchmarks');
    return res.json();
  },
};
