import pytest
from app.services.vector_store import vector_store_service
from app.services.ingestion import ingestion_service

def test_document_chunking():
    sample_text = (
        "Section 1: Automated Backups.\nSnapshots execute every 6 hours.\n\n"
        "Section 2: Security Governance.\nMFA is mandatory for all production access."
    )
    chunks = ingestion_service.chunk_text(sample_text)
    assert len(chunks) >= 1

def test_vector_store_add_and_search():
    docs = [
        "Kubernetes pods auto-scale when CPU exceeds 75% for 3 minutes.",
        "Internal system audit logs must be retained for 365 days in cold storage."
    ]
    metas = [{"source": "test_sop.md"}, {"source": "test_audit.md"}]
    ids = ["t_1", "t_2"]
    
    vector_store_service.add_documents(docs, metas, ids)
    results = vector_store_service.similarity_search("How long are audit logs kept?", top_k=2)
    assert len(results) > 0
    assert any("audit logs" in r.content.lower() for r in results)
