#!/usr/bin/env python3
"""
Institutional Document Ingestion & Local ChromaDB Indexing Script
VeriQuery / Amypo-SentinelQA - 100% Offline & Air-Gapped Knowledge Base Ingestion
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are resolvable
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.services.vector_store import vector_store_service
from app.services.ingestion import ingestion_service

def run_ingestion():
    docs_dir = Path(settings.BACKEND_DOCS_PATH)
    if not docs_dir.exists():
        docs_dir = Path(settings.SAMPLE_DOCS_PATH)
    
    # 1. Discover documents
    supported_extensions = {".md", ".txt", ".json", ".pdf", ".csv"}
    doc_files = [f for f in docs_dir.iterdir() if f.is_file() and f.suffix.lower() in supported_extensions]
    
    if not doc_files:
        print(f"[ERROR] No documentation files found in {docs_dir}")
        return 1

    print(f"[OK] Documents discovered ({len(doc_files)} files in {docs_dir.name}/)")
    for f in doc_files:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")

    # 2. Reset collection to ensure clean, duplicate-free state
    vector_store_service.reset_collection()

    # 3. Read and chunk documents
    total_chunks = 0
    all_chunks = []
    all_metas = []
    all_ids = []

    for file_path in doc_files:
        content, doc_type = ingestion_service.extract_text_from_file(str(file_path))
        if not content.strip():
            continue

        chunks = ingestion_service.chunk_text(content)
        for i, chunk in enumerate(chunks):
            chunk_id = f"{file_path.name}_chunk_{i}"
            meta = {
                "record_id": chunk_id,
                "source_file": file_path.name,
                "source": file_path.name,
                "document_type": doc_type,
                "doc_type": doc_type,
                "chunk_id": chunk_id,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "snippet": chunk[:350],
                "text": chunk
            }
            all_chunks.append(chunk)
            all_metas.append(meta)
            all_ids.append(chunk_id)
        total_chunks += len(chunks)

    print(f"[OK] Documents chunked ({total_chunks} total chunks generated)")

    # 4. Generate embeddings and persist into ChromaDB
    vector_store_service.add_documents(documents=all_chunks, metadatas=all_metas, ids=all_ids)
    print(f"[OK] Embeddings generated locally ({settings.EMBEDDING_MODEL_NAME})")

    # 5. Verify ChromaDB persistence
    persisted_count = vector_store_service.get_document_count()
    print(f"[OK] ChromaDB persisted (path: {settings.CHROMA_PATH}, collection: sentinelqa_documents)")
    print(f"[OK] Total records indexed: {persisted_count}")

    return 0

if __name__ == "__main__":
    sys.exit(run_ingestion())
