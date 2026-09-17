import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# =====================================================================
# Mandatory v1 Contract Compliance Tests (HackWithAMYPO 2026)
# =====================================================================

def test_v1_health():
    """Verify GET /api/v1/health returns system status and offline confirmation."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["offline"] is True
    assert "message" in data
    assert "llm_engine" in data
    assert "embedding_model" in data
    assert "nli_model" in data
    assert data["ram_usage_mb"] > 0
    assert data["ram_limit_mb"] == 8192.0

def test_v1_ask_contract():
    """
    Verify POST /api/v1/ask:
    Request: { question: str, user_id?: str }
    Response: { answer: str, sources: [{ record_id: str, snippet: str }], confidence: float }
    """
    payload = {
        "question": "What is the minimum CGPA required for placement eligibility?",
        "user_id": "student_01"
    }
    response = client.post("/api/v1/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data and isinstance(data["answer"], str)
    assert "7.5" in data["answer"]
    assert "sources" in data and isinstance(data["sources"], list)
    assert "confidence" in data and isinstance(data["confidence"], (float, int))
    
    # Check source object structure
    if len(data["sources"]) > 0:
        src = data["sources"][0]
        assert "record_id" in src
        assert "snippet" in src

def test_v1_ask_out_of_dataset():
    """Verify POST /api/v1/ask handles out-of-dataset queries without hallucination."""
    payload = {
        "question": "What is the hostel fee for international students?",
        "user_id": "student_02"
    }
    response = client.post("/api/v1/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "not available in the local indexed documents" in data["answer"].lower() or "not contain" in data["answer"].lower()
    assert len(data["sources"]) == 0
    assert data["confidence"] == 0.0

def test_v1_verify_contract_trustworthy():
    """
    Verify POST /api/v1/verify:
    Request: { response_text: str, source_context?: list[str] }
    Response: { reliability_score: float, hallucination_probability: float, verdict: str, flagged_spans: list }
    """
    context = [
        "Students must have a minimum CGPA of 7.5 for placement eligibility."
    ]
    payload = {
        "response_text": "Students must have a minimum CGPA of 7.5 for placement eligibility.",
        "source_context": context
    }
    response = client.post("/api/v1/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reliability_score" in data and isinstance(data["reliability_score"], (float, int))
    assert "hallucination_probability" in data and isinstance(data["hallucination_probability"], (float, int))
    assert data["verdict"] in ["trustworthy", "partially_reliable", "misleading", "fabricated"]
    assert data["verdict"] == "trustworthy"
    assert "flagged_spans" in data and isinstance(data["flagged_spans"], list)
    assert len(data["flagged_spans"]) == 0

def test_v1_verify_contract_contradiction():
    """
    Verify POST /api/v1/verify detects contradiction (CGPA 6.0 vs 7.5) and returns flagged spans and non-trustworthy verdict.
    """
    context = [
        "Students must have a minimum CGPA of 7.5 for placement eligibility."
    ]
    payload = {
        "response_text": "The minimum CGPA required is 6.0.",
        "source_context": context
    }
    response = client.post("/api/v1/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["misleading", "fabricated"]
    assert data["hallucination_probability"] > 0.30
    assert len(data["flagged_spans"]) > 0
    span = data["flagged_spans"][0]
    assert "text" in span
    assert "reason" in span

# =====================================================================
# Dashboard & Utility Endpoint Tests
# =====================================================================

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "ram_usage_mb" in data

def test_benchmarks_endpoint():
    response = client.get("/api/benchmarks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4

def test_verify_direct_endpoint():
    payload = {
        "premise_evidence": "A minimum attendance of 75% is mandatory across all registered courses.",
        "hypothesis_claim": "The minimum attendance requirement is 75%."
    }
    response = client.post("/api/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ENTAILED"
    assert data["entailment_prob"] > 0.50

def test_database_query_endpoint():
    payload = {
        "natural_query": "Which servers have high monthly cost?",
        "execute_sql": True
    }
    response = client.post("/api/database/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "generated_sql" in data
    assert "rows" in data
    assert data["error"] is None

def test_end_to_end_query_endpoint():
    payload = {
        "query": "What is the minimum attendance requirement for placement eligibility?",
        "verify_hallucinations": True
    }
    response = client.post("/api/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "75%" in data["answer"]
    assert "reliability" in data
    assert "latency" in data
    assert data["latency"]["total_ms"] < 10000.0 # Sub-10 second budget guarantee
