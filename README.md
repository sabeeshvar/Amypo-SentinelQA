# 🛡️ VeriQuery / Amypo-SentinelQA

> **Official HackWithAMYPO 2026 Hackathon Submission**  
> *Merged Problem Statements: **PS7** (Local Database Question-Answering System) & **PS2** (AI Hallucination Detection & Reliability Scoring)*

[![Zero Third-Party APIs](https://img.shields.io/badge/APIs-100%25%20Offline-emerald.svg)](https://github.com/sabeeshvar/Amypo-SentinelQA)
[![RAM Budget](https://img.shields.io/badge/RAM%20Budget-%3C%208%20GB-blue.svg)](https://github.com/sabeeshvar/Amypo-SentinelQA)
[![Latency Target](https://img.shields.io/badge/Latency-%3C%2010s-purple.svg)](https://github.com/sabeeshvar/Amypo-SentinelQA)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Executive Summary

**VeriQuery** is an end-to-end, 100% offline, self-hosted AI system engineered for air-gapped environments that combines:
1. **PS7 (Local Database QA & Offline RAG):** Zero external APIs, fully local document ingestion (`backend/data/documents/`), hybrid dense retrieval using persistent ChromaDB + `all-MiniLM-L6-v2`, and read-only local SQLite tabular reasoning.
2. **PS2 (Real-Time AI Hallucination & Fact Verification):** Sub-10 second pipeline with atomic proposition deconstruction, CPU cross-encoder Natural Language Inference (`nli-deberta-v3-small`), sentence-level groundedness heatmaps, and strict verdict scoring (`trustworthy` | `partially_reliable` | `misleading` | `fabricated`).

---

## 🏗️ Architecture & Hard Constraints Compliance

| Requirement | Strict Hackathon Criteria | VeriQuery Implementation |
| :--- | :--- | :--- |
| **Third-Party APIs** | **Zero External APIs** (No OpenAI, Anthropic, Cohere, Pinecone, Google) | **100% Self-Hosted & Offline**. Local Ollama (`llama3:8b-q4`), local SentenceTransformers, and local CrossEncoder. |
| **RAM Budget** | **Strictly &le; 8 GB** | **~5.1 GB total RSS footprint** (36% buffer headroom). |
| **Latency Budget** | **Strictly &lt; 10 seconds** | **~1.2s to 4.5s** end-to-end pipeline execution time. |
| **Local Persistence** | Index must persist across restarts | Persistent storage via `chromadb.PersistentClient` in `backend/data/chroma_db/`. |

---

## 🚀 Quick Start Guide

### Option 1: One-Command Python Launch (Windows / Linux / macOS)
```bash
# 1. Clone repository
git clone https://github.com/sabeeshvar/Amypo-SentinelQA.git
cd Amypo-SentinelQA

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Launch application (Starts FastAPI on port 8000 and auto-opens browser)
python start.py
```
*(On Windows, you can simply double-click `run.bat`)*

### Option 2: Docker / Docker Compose Launch
```bash
docker compose up --build
```
Access the application dashboard at `http://localhost:8000`.

---

## 📡 API Reference & Curl Command Examples

The system provides mandatory HackWithAMYPO v1 contracts alongside dashboard endpoints.

### 1. Ask Endpoint (`POST /api/v1/ask`)
Answers a natural language question against local documents/database and returns source citations and confidence.

```bash
curl -X POST http://localhost:8000/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the password rotation policy in the cybersecurity guidelines?",
    "user_id": "auditor_01"
  }'
```

**Response Example (`200 OK`):**
```json
{
  "answer": "Based on the verified offline documentation: Passwords must be rotated every 90 days. Master passwords must contain at least 16 characters with uppercase, lowercase, numbers, and symbols.",
  "sources": [
    {
      "record_id": "enterprise_security_policy.md_0",
      "snippet": "1.2. Password Rotation: Master passwords must contain at least 16 characters with uppercase, lowercase, numbers, and symbols. Passwords must be rotated every 90 days."
    }
  ],
  "confidence": 0.95
}
```

---

### 2. Verify Endpoint (`POST /api/v1/verify`)
Evaluates an answer for hallucinations against provided context (or persistent vector storage), returning a strict verdict, reliability score, and flagged spans.

```bash
curl -X POST http://localhost:8000/api/v1/verify \
  -H "Content-Type: application/json" \
  -d '{
    "response_text": "SMS authentication is allowed and recommended for all staff.",
    "source_context": [
      "SMS-based authentication is strictly prohibited; hardware security keys (FIDO2) or TOTP authenticator apps must be used."
    ]
  }'
```

**Response Example (`200 OK`):**
```json
{
  "reliability_score": 0.0,
  "hallucination_probability": 1.0,
  "verdict": "fabricated",
  "flagged_spans": [
    {
      "text": "SMS authentication is allowed and recommended for all staff.",
      "reason": "Factual contradiction: Contradicts factual statement in 'ProvidedContext_1': 'SMS-based authentication is strictly prohibited...'"
    }
  ]
}
```

---

### 3. Health & Offline Confirmation Endpoint (`GET /api/v1/health`)
Verifies system health, memory consumption, and confirms offline status.

```bash
curl -X GET http://localhost:8000/api/v1/health
```

**Response Example (`200 OK`):**
```json
{
  "status": "healthy",
  "offline": true,
  "message": "100% offline self-hosted AI system (PS7 + PS2) - Zero external API keys",
  "llm_engine": "llama3:8b-instruct-q4_K_M (Ollama)",
  "embedding_model": "all-MiniLM-L6-v2",
  "nli_model": "cross-encoder/nli-deberta-v3-small",
  "ram_usage_mb": 450.2,
  "ram_limit_mb": 8192.0,
  "documents_indexed": 12
}
```

---

## 🧪 Automated Testing & Verification

Run the comprehensive pytest test suite verifying all schemas, vector operations, SQLite safety, and NLI classification:

```bash
python -m pytest backend/tests/ -v
```

**Test Coverage:**
- ✅ `test_v1_health`: Validates offline status, zero third-party dependency, and RAM limits.
- ✅ `test_v1_ask_contract`: Enforces mandatory `{ question, user_id }` and `{ answer, sources, confidence }` types.
- ✅ `test_v1_verify_contract_trustworthy`: Confirms entailment verification and empty flagged spans.
- ✅ `test_v1_verify_contract_contradiction`: Confirms contradiction detection, strict verdict, and flagged span extraction.
- ✅ `test_database_initialization_and_schema`: Verifies SQLite schema introspection.
- ✅ `test_destructive_query_blocked_guardrail`: Tests security guardrail blocking DROP/DELETE/UPDATE.
- ✅ `test_vector_store_add_and_search`: Tests ChromaDB persistent chunking and cosine similarity.

---

## 📂 Project Structure

```
Amypo-SentinelQA/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py           # /api/v1/ask, /api/v1/verify, /api/v1/health, etc.
│   │   ├── services/
│   │   │   ├── vector_store.py     # Persistent ChromaDB + all-MiniLM-L6-v2
│   │   │   ├── hallucination_engine.py # CPU Cross-Encoder NLI & Claim Segmenter
│   │   │   ├── llm_engine.py       # Ollama LLaMA-3 connector & offline synthesis
│   │   │   ├── database_engine.py  # Local SQLite Tabular QA & Guardrail Engine
│   │   │   ├── ingestion.py        # PDF, Markdown, CSV, TXT chunker
│   │   │   └── metrics.py          # RAM footprint & high-resolution latency timer
│   │   ├── config.py               # Memory budget & model settings
│   │   ├── main.py                 # FastAPI application with CORS & static serving
│   │   └── schemas.py              # Pydantic v1 contract models
│   ├── data/
│   │   ├── documents/              # Local knowledge base documents
│   │   └── sample_db/              # Local business database (enterprise_ops.sqlite)
│   ├── requirements.txt            # Pinned backend dependencies
│   └── tests/                      # Automated test suite
├── frontend/
│   ├── src/                        # React 18 + Tailwind dashboard components
│   └── dist/                       # Production web distribution bundle
├── Dockerfile                      # Containerized offline environment
├── docker-compose.yml              # One-command orchestration
├── openapi.yaml                    # Full OpenAPI 3.0.3 specification
├── MODEL_CARD.md                   # Model architecture, quantization, and memory audit
├── README.md                       # Documentation & setup guide
├── run.bat                         # Windows one-click launcher
└── start.py                        # Cross-platform runner
```

---

## ⚖️ License & Hackathon Notice
Licensed under the [MIT License](LICENSE). Built for the **HackWithAMYPO 2026** Hackathon.
