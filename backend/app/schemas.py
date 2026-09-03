from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

# --- HackWithAMYPO 2026 Mandatory v1 Contract Schemas ---

class AskSource(BaseModel):
    record_id: str
    snippet: str

class AskRequest(BaseModel):
    question: str
    user_id: Optional[str] = None

class AskResponse(BaseModel):
    answer: str
    sources: List[AskSource]
    confidence: float

class FlaggedSpan(BaseModel):
    text: str
    reason: str

class VerifyRequest(BaseModel):
    response_text: str
    source_context: Optional[List[str]] = None

class VerifyVerdict(str, Enum):
    TRUSTWORTHY = "trustworthy"
    PARTIALLY_RELIABLE = "partially_reliable"
    MISLEADING = "misleading"
    FABRICATED = "fabricated"

class VerifyResponse(BaseModel):
    reliability_score: float
    hallucination_probability: float
    verdict: str  # strictly one of: "trustworthy" | "partially_reliable" | "misleading" | "fabricated"
    flagged_spans: List[FlaggedSpan]

class V1HealthResponse(BaseModel):
    status: str
    offline: bool
    message: str
    llm_engine: str
    embedding_model: str
    nli_model: str
    ram_usage_mb: float
    ram_limit_mb: float
    documents_indexed: int

# --- Internal & Dashboard Schemas ---

class ClaimStatus(str, Enum):
    ENTAILED = "ENTAILED"         # Supported by evidence (Green)
    NEUTRAL = "NEUTRAL"           # Unverified / Not directly supported (Yellow)
    CONTRADICTION = "CONTRADICTION" # Direct contradiction / Hallucination (Red)

class SourceChunk(BaseModel):
    chunk_id: str
    doc_name: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ClaimVerification(BaseModel):
    claim_id: int
    claim_text: str
    status: ClaimStatus
    confidence: float
    entailment_prob: float
    neutral_prob: float
    contradiction_prob: float
    best_matching_chunk_id: Optional[str] = None
    best_matching_doc: Optional[str] = None
    evidence_snippet: Optional[str] = None
    reasoning: str

class LatencyBreakdown(BaseModel):
    retrieval_ms: float = 0.0
    generation_ms: float = 0.0
    verification_ms: float = 0.0
    total_ms: float = 0.0

class ReliabilityReport(BaseModel):
    overall_score: float = Field(description="Reliability score between 0 and 100")
    faithfulness_index: float = Field(description="Fraction of claims entailed")
    hallucination_risk: str = Field(description="Low / Moderate / High / Critical")
    entailed_claims_count: int
    neutral_claims_count: int
    contradicted_claims_count: int
    total_claims_count: int
    citation_precision: float

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4
    model: Optional[str] = None
    verify_hallucinations: bool = True
    database_mode: bool = False

class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[SourceChunk]
    claims: List[ClaimVerification]
    reliability: ReliabilityReport
    latency: LatencyBreakdown
    model_used: str
    is_offline_verified: bool = True
    database_results: Optional[Dict[str, Any]] = None

class VerificationOnlyRequest(BaseModel):
    premise_evidence: str
    hypothesis_claim: str

class VerificationOnlyResponse(BaseModel):
    claim: str
    status: ClaimStatus
    confidence: float
    entailment_prob: float
    neutral_prob: float
    contradiction_prob: float
    reasoning: str
    latency_ms: float

class IngestFileResponse(BaseModel):
    filename: str
    chunks_created: int
    doc_type: str
    status: str
    message: str

class DatabaseQueryRequest(BaseModel):
    natural_query: str
    execute_sql: bool = True

class DatabaseQueryResponse(BaseModel):
    natural_query: str
    generated_sql: str
    columns: List[str] = Field(default_factory=list)
    rows: List[List[Any]] = Field(default_factory=list)
    row_count: int = 0
    explanation: str
    execution_time_ms: float
    error: Optional[str] = None

class SystemHealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    embedding_model_loaded: bool
    nli_model_loaded: bool
    chroma_documents_count: int
    ram_usage_mb: float
    ram_limit_mb: float
    models: Dict[str, str]

class BenchmarkCase(BaseModel):
    id: str
    category: str # "PS7_SQL", "PS7_RAG", "PS2_FACTUAL", "PS2_HALLUCINATED"
    prompt: str
    expected_outcome: str
    context: Optional[str] = None
