import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

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
        "premise_evidence": "Passcodes must be 16 characters or longer and rotated every 90 days.",
        "hypothesis_claim": "Passcodes are changed every 90 days."
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
        "query": "What is the policy regarding password length and rotation?",
        "verify_hallucinations": True
    }
    response = client.post("/api/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "reliability" in data
    assert "latency" in data
    assert data["latency"]["total_ms"] < 10000.0 # Sub-10 second budget guarantee
