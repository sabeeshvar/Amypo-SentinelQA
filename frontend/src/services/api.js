const API_BASE = '/api';

export const api = {
  // Mandatory HackWithAMYPO 2026 v1 endpoints
  async getV1Health() {
    const res = await fetch(`${API_BASE}/v1/health`);
    if (!res.ok) throw new Error('Failed to fetch v1 health status');
    return res.json();
  },

  async askV1(question, userId = 'auditor_01') {
    const res = await fetch(`${API_BASE}/v1/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, user_id: userId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to get answer from /api/v1/ask');
    }
    return res.json();
  },

  async verifyV1(responseText, sourceContext = null) {
    const payload = { response_text: responseText };
    if (sourceContext) {
      if (Array.isArray(sourceContext)) {
        payload.source_context = sourceContext.filter((s) => s.trim().length > 0);
      } else if (typeof sourceContext === 'string' && sourceContext.trim()) {
        payload.source_context = sourceContext
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }

    const res = await fetch(`${API_BASE}/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to verify via /api/v1/verify');
    }
    return res.json();
  },

  // Developer & Diagnostic endpoints
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
