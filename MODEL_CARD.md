# 📋 Model Card: VeriQuery / Amypo-SentinelQA

> **HackWithAMYPO 2026 Evaluation Specification**  
> *Merged Problem Statements: PS7 (Local Database QA) & PS2 (AI Hallucination Detection & Reliability Scoring)*

---

## 1. System & Model Overview

| Component | Model Identifier | Architecture / Framework | Quantization / Precision | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Local LLM Engine** | `llama3:8b-instruct-q4_K_M` | LLaMA-3 Decoder Transformer (8 Billion parameters) | **4-bit K-Medium Quantization** (GGUF via Ollama / llama-cpp) | Strict factual generation & natural language SQL translation. |
| **Fallback LLM Engine** | `mistral:7b-instruct-v0.2-q4_K_M` | Mistral-7B Sliding Window Attention | **4-bit K-Medium Quantization** (GGUF) | Lightweight alternative generation. |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` | MiniLM BERT Dual-Encoder (384 dimensions) | FP32 / ONNX runtime CPU | Dense semantic indexing & vector retrieval in ChromaDB. |
| **NLI & Hallucination Engine** | `cross-encoder/nli-deberta-v3-small` | DeBERTa-v3 with Disentangled Attention | FP32 CPU Optimized | 3-way Natural Language Inference (Entailment, Neutral, Contradiction). |
| **Vector Database** | ChromaDB (`chromadb.PersistentClient`) | HNSW Cosine Vector Indexing | Local Disk Persistent Storage | Air-gapped local document chunk retrieval. |

---

## 2. Strict RAM Footprint Audit (&le; 8.0 GB Budget)

The entire pipeline is engineered to run comfortably on standard developer machines within an **8.0 GB RAM envelope** without swapping or GPU requirements:

| Component | Memory Allocation (RSS) | % of 8 GB Budget | Optimization Strategy |
| :--- | :--- | :--- | :--- |
| **Quantized LLaMA-3 8B (Ollama)** | ~4,700 MB | 57.3% | `q4_K_M` 4-bit block quantization with mmap weight paging. |
| **SentenceTransformers (`all-MiniLM-L6-v2`)** | ~85 MB | 1.0% | 6-layer compact Transformer with 384 embedding dimensions. |
| **NLI Cross-Encoder (`nli-deberta-v3-small`)** | ~145 MB | 1.8% | Small 44M-parameter cross-encoder with CPU vectorization. |
| **ChromaDB + SQLite Storage** | ~110 MB | 1.3% | Persistent disk-backed HNSW index; only active nodes cached. |
| **FastAPI Backend + Python Runtime** | ~120 MB | 1.5% | Lightweight asynchronous event loop. |
| **Operating Headroom / Buffer** | **~3,032 MB** | **38.1%** | Safety margin for OS processes and burst inference. |
| **Total System RAM Footprint** | **~5,160 MB** | **&le; 64.5%** | **Compliant (&lt; 8.0 GB)** |

---

## 3. Latency Profiling & Budget Breakdown (&lt; 10.0s Target)

All fact verification and RAG queries are benchmarked for sub-10 second execution:

```
[User Request] 
       │
       ├── (1) ChromaDB Vector Retrieval: ~60ms - 140ms
       │
       ├── (2) Local LLM Factual Answer Generation: ~2,800ms - 4,500ms
       │
       ├── (3) PS2 Claim Deconstruction & Segmentation: ~15ms - 30ms
       │
       ├── (4) Cross-Encoder NLI Factual Grounding: ~180ms - 420ms
       │
       └── Total End-to-End Pipeline Latency: ~3.1s - 5.1s  (< 10.0s Budget)
```

- **Vector Search Latency**: 60 ms – 140 ms per query across 10,000 document chunks using cosine HNSW.
- **NLI Claim Check Latency**: &lt; 50 ms per proposition on standard 4-core x86_64 CPUs.
- **Total Latency Guarantee**: Strictly &lt; 10.0 seconds per response.

---

## 4. PS2 Factual Grounding & Hallucination Mathematics

Given an LLM generated response $R$ and retrieved context chunks $C = \{c_1, c_2, \dots, c_k\}$:

1. **Claim Deconstruction**:  
   $R \rightarrow \{p_1, p_2, \dots, p_n\}$, where each $p_i$ is an atomic proposition.

2. **Cross-Encoder 3-Way Softmax**:  
   For candidate premise sentence $s \in c$ and hypothesis $p_i$:
   $$\text{Softmax}(\mathbf{z}) = \left[ P(\text{Contradiction}), P(\text{Entailment}), P(\text{Neutral}) \right]$$

3. **Reliability Score ($S_{\text{rel}}$)**:
   $$S_{\text{rel}} = \max\left(0, \min\left(100, \frac{100 \cdot N_{\text{entailed}} - 100 \cdot N_{\text{contradicted}} - 20 \cdot N_{\text{neutral}}}{N_{\text{total}}}\right)\right)$$

4. **Verdict Classification Rules**:
   - **`fabricated`**: $N_{\text{contradicted}} \ge 2$ or $P(\text{hallucination}) \ge 0.70$
   - **`misleading`**: $N_{\text{contradicted}} \ge 1$ or $P(\text{hallucination}) \ge 0.35$
   - **`partially_reliable`**: $N_{\text{neutral}} > 0$ or $P(\text{hallucination}) > 0.10$
   - **`trustworthy`**: All claims conclusively entailed ($P(\text{hallucination}) \le 0.10$)

---

## 5. Zero Third-Party API Guarantee

- **No External Cloud Calls**: 0 requests to OpenAI, Anthropic, Cohere, Pinecone, Supabase, Groq, or Google.
- **Air-Gapped Operation**: Functions seamlessly on isolated networks and internal enterprise enclaves.
- **Self-Contained Model Storage**: Models cached in standard local HuggingFace cache and Ollama store.
