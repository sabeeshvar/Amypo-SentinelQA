import pytest
from app.services.hallucination_engine import hallucination_engine, LocalNLIModel
from app.schemas import ClaimStatus, SourceChunk

def test_nli_entailment():
    nli = LocalNLIModel()
    premise = "Automated full database snapshots for PostgreSQL execute every 6 hours with an RPO of under 5 minutes."
    hypothesis = "Database backups are taken every 6 hours."
    
    status, conf, ep, np, cp = nli.predict_pair(premise, hypothesis)
    assert status == ClaimStatus.ENTAILED
    assert ep > cp
    assert conf >= 0.50

def test_nli_contradiction():
    nli = LocalNLIModel()
    premise = "SMS-based authentication is strictly prohibited; hardware security keys must be used."
    hypothesis = "SMS-based authentication is allowed and recommended for employee accounts."
    
    status, conf, ep, np, cp = nli.predict_pair(premise, hypothesis)
    assert status == ClaimStatus.CONTRADICTION
    assert cp > ep

def test_nli_neutral():
    nli = LocalNLIModel()
    premise = "Eligible adult participants in Phase 3 Trial will receive an oral dose of 50mg Compound-Q2 daily."
    hypothesis = "Participants in Phase 3 will also receive vitamin D supplements on weekends."
    
    status, conf, ep, np, cp = nli.predict_pair(premise, hypothesis)
    assert status == ClaimStatus.NEUTRAL
    assert np > ep or np > cp

def test_claim_segmentation():
    text = "Passwords must be at least 16 characters. All API calls mandate TLS 1.3. Unencrypted storage is a P1 violation."
    claims = hallucination_engine.segment_claims(text)
    assert len(claims) == 3

def test_full_hallucination_verification_flow():
    sources = [
        SourceChunk(
            chunk_id="chk-1",
            doc_name="POL-SEC-2026",
            content="Customer transaction records must be retained for 7 years. Audit logs are kept for 365 days.",
            similarity_score=0.92
        )
    ]
    
    # Grounded answer
    grounded_answer = "Customer transaction records must be retained for 7 years. [Source 1]"
    claims, report = hallucination_engine.verify_answer(grounded_answer, sources)
    assert report.overall_score >= 80.0
    assert report.contradicted_claims_count == 0
    assert "Low Risk" in report.hallucination_risk

    # Hallucinated / Contradicted answer
    hallucinated_answer = "Customer transaction records are immediately deleted after 30 days."
    claims_h, report_h = hallucination_engine.verify_answer(hallucinated_answer, sources)
    assert report_h.contradicted_claims_count >= 1
    assert "Risk" in report_h.hallucination_risk
