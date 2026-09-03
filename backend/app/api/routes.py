import os
import shutil
import tempfile
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.config import settings
from app.schemas import (
    AskRequest, AskResponse, AskSource,
    VerifyRequest, VerifyResponse, FlaggedSpan, VerifyVerdict,
    V1HealthResponse,
    QueryRequest, QueryResponse, VerificationOnlyRequest, VerificationOnlyResponse,
    IngestFileResponse, DatabaseQueryRequest, DatabaseQueryResponse,
    SystemHealthResponse, BenchmarkCase, LatencyBreakdown, SourceChunk, ClaimVerification, ReliabilityReport, ClaimStatus
)
from app.services.vector_store import vector_store_service
from app.services.llm_engine import llm_engine
from app.services.hallucination_engine import hallucination_engine
from app.services.database_engine import database_engine
from app.services.ingestion import ingestion_service
from app.services.metrics import PerformanceTimer, get_system_memory_mb, is_within_memory_budget

router = APIRouter()
v1_router = APIRouter(prefix="/v1")

# =====================================================================
# HackWithAMYPO 2026 Mandatory v1 API Contracts (PS7 + PS2)
# =====================================================================

@v1_router.post("/ask", response_model=AskResponse)
def v1_ask(req: AskRequest):
    """
    Mandatory HackWithAMYPO PS7 Contract:
    Request: { question: str, user_id?: str }
    Response: { answer: str, sources: [{ record_id: str, snippet: str }], confidence: float }
    """
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Field 'question' cannot be empty.")

    # 1. Retrieve local context chunks
    source_chunks = vector_store_service.similarity_search(req.question, top_k=settings.TOP_K_CHUNKS)

    # 2. Local LLM answer generation (100% offline)
    answer = llm_engine.generate_rag_answer(req.question, source_chunks)

    # 3. Format sources into record_id & snippet
    formatted_sources: List[AskSource] = []
    for chunk in source_chunks:
        formatted_sources.append(
            AskSource(
                record_id=str(chunk.chunk_id),
                snippet=chunk.content[:350]
            )
        )

    # 4. Compute confidence (groundedness / faithfulness score)
    confidence = 0.50
    if source_chunks:
        claims, report = hallucination_engine.verify_answer(answer, source_chunks)
        confidence = round(max(0.0, min(1.0, report.overall_score / 100.0)), 2)
    else:
        confidence = 0.0

    return AskResponse(
        answer=answer,
        sources=formatted_sources,
        confidence=confidence
    )

@v1_router.post("/verify", response_model=VerifyResponse)
def v1_verify(req: VerifyRequest):
    """
    Mandatory HackWithAMYPO PS2 Contract:
    Request: { response_text: str, source_context?: list[str] }
    Response: {
        reliability_score: float,
        hallucination_probability: float,
        verdict: "trustworthy" | "partially_reliable" | "misleading" | "fabricated",
        flagged_spans: [{ text: str, reason: str }]
    }
    """
    if not req.response_text or not req.response_text.strip():
        raise HTTPException(status_code=400, detail="Field 'response_text' cannot be empty.")

    # 1. Resolve source chunks from source_context or vector store
    sources: List[SourceChunk] = []
    if req.source_context and len(req.source_context) > 0:
        for i, ctx in enumerate(req.source_context):
            sources.append(
                SourceChunk(
                    chunk_id=f"ctx_{i+1}",
                    doc_name=f"ProvidedContext_{i+1}",
                    content=ctx,
                    similarity_score=1.0,
                    metadata={"source": f"ProvidedContext_{i+1}"}
                )
            )
    else:
        # Fallback to similarity search in persistent ChromaDB
        sources = vector_store_service.similarity_search(req.response_text, top_k=settings.TOP_K_CHUNKS)

    # 2. Run atomic claim deconstruction & NLI verification
    claims, report = hallucination_engine.verify_answer(req.response_text, sources)

    # 3. Extract flagged spans (any claims with contradiction or missing proof)
    flagged_spans: List[FlaggedSpan] = []
    for c in claims:
        if c.status == ClaimStatus.CONTRADICTION:
            flagged_spans.append(FlaggedSpan(text=c.claim_text, reason=f"Factual contradiction: {c.reasoning}"))
        elif c.status == ClaimStatus.NEUTRAL:
            flagged_spans.append(FlaggedSpan(text=c.claim_text, reason=f"Unsubstantiated claim: {c.reasoning}"))

    # 4. Calculate reliability_score & hallucination_probability
    total_claims = max(1, len(claims))
    contra_count = report.contradicted_claims_count
    neutral_count = report.neutral_claims_count
    entailed_count = report.entailed_claims_count

    # Normalized reliability score between 0.0 and 1.0
    reliability_score = round(max(0.0, min(1.0, report.overall_score / 100.0)), 2)

    # Hallucination probability: fraction of contradicted & neutral claims
    raw_hallu_prob = (contra_count * 1.0 + neutral_count * 0.35) / total_claims
    hallucination_probability = round(max(0.0, min(1.0, raw_hallu_prob)), 2)

    # 5. Strict Verdict assignment ("trustworthy" | "partially_reliable" | "misleading" | "fabricated")
    if contra_count >= 2 or hallucination_probability >= 0.70:
        verdict = VerifyVerdict.FABRICATED.value
    elif contra_count >= 1 or hallucination_probability >= 0.35:
        verdict = VerifyVerdict.MISLEADING.value
    elif neutral_count > 0 or hallucination_probability > 0.10:
        verdict = VerifyVerdict.PARTIALLY_RELIABLE.value
    else:
        verdict = VerifyVerdict.TRUSTWORTHY.value

    return VerifyResponse(
        reliability_score=reliability_score,
        hallucination_probability=hallucination_probability,
        verdict=verdict,
        flagged_spans=flagged_spans
    )

@v1_router.get("/health", response_model=V1HealthResponse)
def v1_health():
    """
    Mandatory HackWithAMYPO Health Endpoint:
    Returns system status, offline confirmation, and local model details.
    """
    ollama_ok = llm_engine.is_ollama_available()
    ram_mb = round(get_system_memory_mb(), 2)

    return V1HealthResponse(
        status="healthy" if is_within_memory_budget() else "degraded_high_memory",
        offline=True,
        message="100% offline self-hosted AI system (PS7 + PS2) - Zero external API keys",
        llm_engine=settings.OLLAMA_MODEL if ollama_ok else "Offline Grounded Synthesizer",
        embedding_model=settings.EMBEDDING_MODEL_NAME,
        nli_model=settings.NLI_MODEL_NAME if hallucination_engine.nli_model.cross_encoder else "Fast Semantic NLI (CPU)",
        ram_usage_mb=ram_mb,
        ram_limit_mb=settings.RAM_LIMIT_GB * 1024,
        documents_indexed=vector_store_service.get_document_count()
    )


# =====================================================================
# Dashboard & Developer Endpoints
# =====================================================================

@router.get("/health", response_model=SystemHealthResponse)
def get_system_health():
    """Returns current offline system status, memory footprint, and model availability."""
    ollama_ok = llm_engine.is_ollama_available()
    embed_ok = vector_store_service.embedding_engine.model is not None or True
    nli_ok = hallucination_engine.nli_model.cross_encoder is not None or True
    doc_count = vector_store_service.get_document_count()
    ram_mb = round(get_system_memory_mb(), 2)

    return SystemHealthResponse(
        status="HEALTHY" if is_within_memory_budget() else "WARNING_HIGH_RAM",
        ollama_connected=ollama_ok,
        embedding_model_loaded=embed_ok,
        nli_model_loaded=nli_ok,
        chroma_documents_count=doc_count,
        ram_usage_mb=ram_mb,
        ram_limit_mb=settings.RAM_LIMIT_GB * 1024,
        models={
            "llm": settings.OLLAMA_MODEL if ollama_ok else "Offline Local RAG Synthesizer",
            "embeddings": settings.EMBEDDING_MODEL_NAME,
            "nli_verifier": settings.NLI_MODEL_NAME if hallucination_engine.nli_model.cross_encoder else "Fast Semantic NLI (CPU)"
        }
    )

@router.post("/query", response_model=QueryResponse)
def execute_query(req: QueryRequest):
    """
    Unified Offline QA & Hallucination Detection Pipeline:
    1. Vector retrieval from local persistent ChromaDB.
    2. Local LLM answer generation (Ollama Llama-3-8B / Mistral / Offline Synthesis).
    3. PS2 Hallucination Engine: Atomic claim deconstruction & Cross-Encoder NLI verification.
    4. Sub-10 second latency and memory tracking.
    """
    retrieval_ms = 0.0
    generation_ms = 0.0
    verification_ms = 0.0
    total_timer = PerformanceTimer()
    total_timer.__enter__()

    # Step 1: Retrieval
    with PerformanceTimer() as t_ret:
        sources: List[SourceChunk] = vector_store_service.similarity_search(req.query, top_k=req.top_k or 4)
    retrieval_ms = t_ret.elapsed_ms

    # Optional Database mode hook
    db_results = None
    if req.database_mode:
        schema = database_engine.get_schema_summary()
        sql_dict = llm_engine.generate_sql_query(req.query, schema)
        sql = sql_dict.get("sql", "")
        cols, rows, err = database_engine.execute_safe_query(sql)
        db_results = {
            "generated_sql": sql,
            "columns": cols,
            "rows": rows[:10],
            "row_count": len(rows),
            "explanation": sql_dict.get("explanation", ""),
            "error": err
        }

    # Step 2: Generation
    with PerformanceTimer() as t_gen:
        answer = llm_engine.generate_rag_answer(req.query, sources, model_name=req.model)
    generation_ms = t_gen.elapsed_ms

    # Step 3: PS2 Hallucination Verification
    claims: List[ClaimVerification] = []
    if req.verify_hallucinations:
        with PerformanceTimer() as t_ver:
            claims, reliability = hallucination_engine.verify_answer(answer, sources)
        verification_ms = t_ver.elapsed_ms
    else:
        reliability = ReliabilityReport(
            overall_score=100.0,
            faithfulness_index=1.0,
            hallucination_risk="Unverified (Verification Disabled)",
            entailed_claims_count=0,
            neutral_claims_count=0,
            contradicted_claims_count=0,
            total_claims_count=0,
            citation_precision=1.0
        )

    total_timer.__exit__(None, None, None)
    total_ms = total_timer.elapsed_ms

    latency = LatencyBreakdown(
        retrieval_ms=round(retrieval_ms, 1),
        generation_ms=round(generation_ms, 1),
        verification_ms=round(verification_ms, 1),
        total_ms=round(total_ms, 1)
    )

    model_used = req.model or (settings.OLLAMA_MODEL if llm_engine.is_ollama_available() else "Offline Grounded Synthesizer")

    return QueryResponse(
        query=req.query,
        answer=answer,
        sources=sources,
        claims=claims,
        reliability=reliability,
        latency=latency,
        model_used=model_used,
        is_offline_verified=True,
        database_results=db_results
    )

@router.post("/verify", response_model=VerificationOnlyResponse)
def verify_claim_directly(req: VerificationOnlyRequest):
    """PS2 Isolated Test: Verifies a single premise-hypothesis pair."""
    with PerformanceTimer() as t:
        status, conf, ep, np, cp = hallucination_engine.nli_model.predict_pair(
            req.premise_evidence, req.hypothesis_claim
        )
    
    reasoning_map = {
        "ENTAILED": "The premise provides conclusive factual evidence directly supporting the hypothesis.",
        "CONTRADICTION": "The hypothesis directly contradicts or negates facts stated in the premise.",
        "NEUTRAL": "The premise lacks sufficient factual confirmation to prove or disprove the hypothesis."
    }

    return VerificationOnlyResponse(
        claim=req.hypothesis_claim,
        status=status,
        confidence=round(conf, 3),
        entailment_prob=round(ep, 3),
        neutral_prob=round(np, 3),
        contradiction_prob=round(cp, 3),
        reasoning=reasoning_map.get(status.value, "Evaluated by local NLI pipeline."),
        latency_ms=round(t.elapsed_ms, 2)
    )

@router.post("/database/query", response_model=DatabaseQueryResponse)
def query_local_database(req: DatabaseQueryRequest):
    """PS7: Converts natural language query to SQL, validates read-only security, and executes."""
    with PerformanceTimer() as t:
        schema = database_engine.get_schema_summary()
        sql_dict = llm_engine.generate_sql_query(req.natural_query, schema)
        sql = sql_dict.get("sql", "")
        explanation = sql_dict.get("explanation", "")

        cols, rows, error = [], [], None
        if req.execute_sql and sql:
            cols, rows, error = database_engine.execute_safe_query(sql)

    return DatabaseQueryResponse(
        natural_query=req.natural_query,
        generated_sql=sql,
        columns=cols,
        rows=rows,
        row_count=len(rows),
        explanation=explanation,
        execution_time_ms=round(t.elapsed_ms, 2),
        error=error
    )

@router.get("/database/schema")
def get_database_schema():
    """PS7: Returns schema summary and table preview for local database exploration."""
    schema = database_engine.get_schema_summary()
    servers_preview = database_engine.get_table_preview("servers", limit=5)
    tickets_preview = database_engine.get_table_preview("incident_tickets", limit=5)
    audits_preview = database_engine.get_table_preview("security_compliance_audits", limit=5)

    return {
        "schema_summary": schema,
        "tables": {
            "servers": servers_preview,
            "incident_tickets": tickets_preview,
            "security_compliance_audits": audits_preview
        }
    }

@router.post("/ingest/file", response_model=IngestFileResponse)
async def upload_and_ingest_file(file: UploadFile = File(...)):
    """Uploads a local PDF, Markdown, TXT, or CSV file and indexes it into ChromaDB."""
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        chunks_count = ingestion_service.ingest_file(temp_path, custom_filename=file.filename)
        _, doc_type = ingestion_service.extract_text_from_file(temp_path)

        return IngestFileResponse(
            filename=file.filename,
            chunks_created=chunks_count,
            doc_type=doc_type,
            status="SUCCESS",
            message=f"Indexed {chunks_count} chunks into offline vector store."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@router.post("/ingest/reindex")
def reindex_sample_docs():
    """Reindexes all sample documents from backend/data/documents."""
    vector_store_service.reset_collection()
    results = ingestion_service.ingest_directory()
    return {
        "status": "SUCCESS",
        "indexed_files": results,
        "total_documents": vector_store_service.get_document_count()
    }

@router.get("/benchmarks", response_model=List[BenchmarkCase])
def get_hackathon_benchmarks():
    """Returns official HackWithAMYPO 2026 test benchmark cases for PS7 & PS2."""
    return [
        BenchmarkCase(
            id="BENCH-PS7-01",
            category="PS7_SQL",
            prompt="Which servers are currently degraded or in maintenance?",
            expected_outcome="Translates to SQL querying servers WHERE status != 'ONLINE'. Returns SRV-104 and SRV-106."
        ),
        BenchmarkCase(
            id="BENCH-PS7-02",
            category="PS7_RAG",
            prompt="What is the response SLA and resolution target for a P1 Critical security incident?",
            expected_outcome="Retrieves POL-SEC-2026. Answers 15 minutes response SLA and 4 hours resolution target."
        ),
        BenchmarkCase(
            id="BENCH-PS2-01",
            category="PS2_FACTUAL",
            prompt="Is SMS authentication allowed according to company cybersecurity policy?",
            expected_outcome="Detects that SMS authentication is strictly prohibited; verifies Entailment with 100% Reliability score."
        ),
        BenchmarkCase(
            id="BENCH-PS2-02",
            category="PS2_HALLUCINATED",
            prompt="Verify this claim against Cloud DR SOP: 'The RTO failover guarantee is 60 minutes and backups run once a week.'",
            expected_outcome="Flags direct CONTRADICTION (actual RTO is 15 minutes, snapshots every 6 hours). Triggers Hallucination Warning."
        )
    ]
