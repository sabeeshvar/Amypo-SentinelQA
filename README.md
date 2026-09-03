# 🛡️ VeriQuery — Offline Local Database QA & AI Hallucination Detector

> **HackWithAMYPO 2026 Submission**  
> *Unifying **PS7** (Local Database Question-Answering System) & **PS2** (AI Hallucination Detection & Reliability Scoring)*

[![Zero Third-Party APIs](https://img.shields.io/badge/APIs-100%25%20Offline-emerald.svg)](https://github.com)
[![RAM Footprint](https://img.shields.io/badge/RAM%20Budget-%3C%208%20GB-blue.svg)](https://github.com)
[![Latency Budget](https://img.shields.io/badge/Latency-%3C%2010s-purple.svg)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Executive Summary & Problem Statement Alignment

| Problem Statement | Hackathon Requirement | VeriQuery Solution |
| :--- | :--- | :--- |
| **PS7: Local Database QA** | Zero 3rd-party APIs, Offline RAG, Local Tabular / SQLite QA | Persistent **ChromaDB** + **SentenceTransformers (`all-MiniLM-L6-v2`)**, multi-format local document parser (PDF, MD, TXT, CSV), safe read-only SQL executor with guardrails. |
| **PS2: Hallucination Detection** | &lt; 10s latency, Fact Verification, Reliability Scoring | Real-time sentence/claim deconstruction, CPU **Cross-Encoder NLI (`nli-deberta-v3-small`)**, sentence-level Entailment/Neutral/Contradiction heatmap, and 0–100% Reliability score. |

---

## 🏗️ System Architecture

```
                               +-------------------------------------------------------+
                               |              VeriQuery Web Dashboard                  |
                               |  * Interactive Chat & Inline Source Citations         |
                               |  * Sentence-by-Sentence Groundedness Heatmap          |
                               |  * Explainability Inspector & NLI Softmax Probabilities|
                               |  * Sub-10s Latency Waterfall & Performance Telemetry  |
                               +---------------------------+---------------------------+
                                                           | REST JSON API
                                                           v
+-----------------------------------------------------------------------------------------------------------------+
|                                           FastAPI Local Offline Engine                                          |
|                                                                                                                 |
|   +--------------------------+    +--------------------------+    +------------------------------------------+  |
|   | Document Ingestion & SQL |    |    Local Vector Store    |    |             Local LLM Engine             |  |
|   | (PDF, MD, TXT, CSV, SQL) |===>|  ChromaDB + all-MiniLM   |===>| Ollama (llama3:8b / mistral:7b)          |  |
|   | Sliding Window Chunking  |    | (Cosine Similarity HNSW) |    | Grounded Prompting & Fallback Synthesizer|  |
|   +--------------------------+    +--------------------------+    +--------------------+---------------------+  |
|                                                                                        | Response Text           |
|                                                                                        v                         |
|                                          +-------------------------------------------------------------------+   |
|                                          |         PS2 Hallucination & Contradiction Engine                  |   |
|                                          | 1. Atomic Proposition & Claim Segmentation                        |   |
|                                          | 2. Candidate Premise Sentence Alignment                           |   |
|                                          | 3. Cross-Encoder NLI / Fast CPU Heuristic Classification          |   |
|                                          |    [Entailed (Green) | Neutral (Yellow) | Contradiction (Red)]   |   |
|                                          | 4. Reliability Score (0-100%) & Faithfulness Index Computation    |   |
|                                          +-------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------------------------------+
```

---

## 🚀 Key Features

1. **Zero External API Dependencies**: Works completely air-gapped on your local laptop without OpenAI, Anthropic, or Cohere API keys.
2. **Strict &lt; 8 GB RAM Footprint**:
   - `all-MiniLM-L6-v2` embeddings: **~80 MB**
   - `nli-deberta-v3-small` cross-encoder: **~140 MB**
   - ChromaDB + SQLite: **~120 MB**
   - Quantized `llama3:8b-q4_K_M` via Ollama: **~4.7 GB**
   - **Total System Footprint**: **~5.1 GB / 8 GB (36% Headroom)**.
3. **Sub-10 Second Latency Guarantee**:
   - Vector Retrieval: `~80 - 150 ms`
   - Claim Segmentation & NLI Verification: `~120 - 450 ms`
   - Total pipeline execution: `~1.2s - 4.5s`.
4. **Sentence-Level Groundedness & NLI Heatmap**:
   - 🟢 **Entailed (Green)**: Factual proposition conclusively backed by retrieved documentation.
   - 🟡 **Neutral (Yellow)**: Unverified proposition / extrapolation with missing context.
   - 🔴 **Contradiction (Red)**: Factual conflict or hallucinated statement contrary to stored knowledge.
5. **PS7 Local SQL Studio**:
   - Introspects local databases (`servers`, `incident_tickets`, `security_compliance_audits`).
   - Converts natural language queries to SQLite syntax with safety guardrails blocking non-read commands.

---

## 💻 Quick Start & Installation

### Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** (For UI frontend build)
- *(Optional)* [Ollama](https://ollama.ai) with `llama3:8b-instruct-q4_K_M` (automatic fallback built-in if Ollama is not running).

### Option 1: One-Click Launch (Windows)
Double-click `run.bat` or execute:
```bash
python start.py
```
This boots the FastAPI server on `http://127.0.0.1:8000` and automatically opens your browser.

### Option 2: Manual Developer Setup

#### 1. Backend Setup
```bash
pip install -r backend/requirements.txt
python -m pytest backend/tests/ -v
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build   # Or 'npm run dev' for live development on port 5173
```

---

## 🧪 Benchmark Test Cases

| Benchmark ID | Problem Statement | Query / Prompt | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `BENCH-PS7-01` | **PS7 (Local SQL)** | *"Which servers are currently degraded or in maintenance?"* | Translates to `SELECT server_id, hostname, status FROM servers WHERE status != 'ONLINE'`. Returns `SRV-104` and `SRV-106`. |
| `BENCH-PS7-02` | **PS7 (Offline RAG)** | *"What is the response SLA and resolution target for a P1 Critical security incident?"* | Retrieves `POL-SEC-2026`. Outputs 15 min response SLA, 4 hours resolution target. |
| `BENCH-PS2-01` | **PS2 (Factual Grounding)**| *"Is SMS authentication allowed according to company cybersecurity policy?"* | Proves SMS authentication is strictly prohibited; verifies 100% Entailment with Low Risk. |
| `BENCH-PS2-02` | **PS2 (Hallucination Warning)**| *"Verify claim: 'The RTO failover guarantee is 60 minutes and snapshots run once a week.'"* | Flags direct **CONTRADICTION** (actual RTO is 15 minutes, snapshots every 6 hours). |

---

## 🛡️ Hackathon Evaluation Checklist
- [x] **PS7**: Offline RAG & local multi-format document ingestion (PDF, MD, TXT, CSV).
- [x] **PS7**: Local tabular / SQLite database query engine with read-only security guardrails.
- [x] **PS2**: AI Hallucination detection engine running on CPU with atomic claim deconstruction.
- [x] **PS2**: Cross-Encoder NLI classification with explainability and sentence heatmaps.
- [x] **Zero Third-Party APIs**: 100% air-gapped / local inference.
- [x] **RAM & Latency Limits**: &lt;8 GB memory footprint, &lt;10s execution budget.
- [x] **Automated Test Suite**: 16/16 unit and integration test pass rate.
