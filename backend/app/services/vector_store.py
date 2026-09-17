import os
import re
import math
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.config import settings
from app.schemas import SourceChunk

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    chromadb = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

class LocalEmbeddingEngine:
    """Local offline embedding engine with lightweight fallback."""
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self.model = None
        self._init_model()

    def _init_model(self):
        if SentenceTransformer is not None:
            try:
                # Load local all-MiniLM-L6-v2 (~80MB footprint)
                self.model = SentenceTransformer(self.model_name)
                print(f"[VectorStore] Successfully loaded embedding model: {self.model_name}")
            except Exception as e:
                print(f"[VectorStore] Warning: Could not initialize SentenceTransformer '{self.model_name}': {e}. Using deterministic local vectorizer fallback.")
                self.model = None

    def encode(self, texts: List[str]) -> List[List[float]]:
        if self.model is not None:
            try:
                embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as e:
                print(f"[VectorStore] Error during model encoding: {e}")

        # Deterministic lightweight dense vector representation (384 dimensions matching MiniLM)
        return [self._fallback_encode(t) for t in texts]

    def _fallback_encode(self, text: str, dim: int = 384) -> List[float]:
        words = re.findall(r"\w+", text.lower())
        vec = [0.0] * dim
        if not words:
            return vec
        for i, word in enumerate(words):
            h = hash(word) % dim
            vec[h] += 1.0 / (1.0 + math.log(i + 1))
        # Normalize vector
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

class VectorStoreService:
    """Persistent ChromaDB Vector Store managing document collections and fast retrieval."""
    def __init__(self, persist_dir: str = settings.CHROMA_PATH):
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        self.embedding_engine = LocalEmbeddingEngine()
        self.client = None
        self.collection = None
        self._memory_docs: List[Dict[str, Any]] = []
        self._init_chroma()

    def _init_chroma(self):
        try:
            if chromadb is not None:
                self.client = chromadb.PersistentClient(path=self.persist_dir)
                self.collection = self.client.get_or_create_collection(
                    name="sentinelqa_documents",
                    metadata={"hnsw:space": "cosine"}
                )
                print(f"[VectorStore] ChromaDB initialized at {self.persist_dir}. Document count: {self.collection.count()}")
            else:
                print("[VectorStore] ChromaDB module not found; running in memory-fallback mode.")
        except Exception as e:
            print(f"[VectorStore] Failed to initialize persistent ChromaDB: {e}")

    def add_documents(self, documents: List[str], metadatas: List[Dict[str, Any]], ids: List[str]):
        if not documents:
            return
        embeddings = self.embedding_engine.encode(documents)
        
        # Always maintain memory cache for immediate sub-millisecond retrieval & fallback
        for doc, meta, cid, emb in zip(documents, metadatas, ids, embeddings):
            self._memory_docs.append({
                "id": cid,
                "content": doc,
                "metadata": meta,
                "embedding": emb
            })

        if self.collection is not None:
            try:
                self.collection.upsert(
                    documents=documents,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    ids=ids
                )
            except Exception as e:
                print(f"[VectorStore] Chroma upsert notice: {e}")

    def similarity_search(self, query: str, top_k: int = settings.TOP_K_CHUNKS) -> List[SourceChunk]:
        if not query.strip():
            return []

        results: List[SourceChunk] = []
        
        # 1. Try ChromaDB
        if self.collection is not None:
            try:
                count = self.collection.count()
                if count > 0:
                    query_embedding = self.embedding_engine.encode([query])[0]
                    k = min(top_k, count)
                    query_res = self.collection.query(
                        query_embeddings=[query_embedding],
                        n_results=k,
                        include=["documents", "metadatas", "distances"]
                    )

                    if query_res and "documents" in query_res and query_res["documents"]:
                        docs = query_res["documents"][0]
                        metas = query_res["metadatas"][0] if "metadatas" in query_res else [{}] * len(docs)
                        ids = query_res["ids"][0] if "ids" in query_res else [f"chunk_{i}" for i in range(len(docs))]
                        distances = query_res["distances"][0] if "distances" in query_res else [0.0] * len(docs)

                        for doc, meta, cid, dist in zip(docs, metas, ids, distances):
                            similarity = max(0.0, min(1.0, 1.0 - (dist if dist is not None else 0.0)))
                            results.append(
                                SourceChunk(
                                    chunk_id=str(cid),
                                    doc_name=meta.get("source", "Unknown Document"),
                                    content=doc,
                                    similarity_score=round(similarity, 4),
                                    metadata=meta
                                )
                            )
                        if results:
                            return results
            except Exception as e:
                print(f"[VectorStore] Chroma search exception: {e}. Falling back to in-memory cosine search.")

        # 2. In-Memory Cosine Similarity Fallback
        if self._memory_docs:
            query_emb = self.embedding_engine.encode([query])[0]
            scored = []
            for item in self._memory_docs:
                doc_emb = item["embedding"]
                # Cosine similarity between normalized vectors = dot product
                sim = sum(a * b for a, b in zip(query_emb, doc_emb))
                scored.append((sim, item))
            scored.sort(key=lambda x: x[0], reverse=True)
            for sim, item in scored[:top_k]:
                results.append(
                    SourceChunk(
                        chunk_id=str(item["id"]),
                        doc_name=item["metadata"].get("source", "Unknown Document"),
                        content=item["content"],
                        similarity_score=round(max(0.0, min(1.0, sim)), 4),
                        metadata=item["metadata"]
                    )
                )

        return results

    def get_document_count(self) -> int:
        if self.collection is not None:
            try:
                cnt = self.collection.count()
                if cnt > 0:
                    return cnt
            except Exception:
                pass
        return len(self._memory_docs)

    def reset_collection(self):
        self._memory_docs = []
        if self.client is not None:
            try:
                try:
                    self.client.delete_collection("sentinelqa_documents")
                except Exception:
                    pass
                self.collection = self.client.get_or_create_collection(
                    name="sentinelqa_documents",
                    metadata={"hnsw:space": "cosine"}
                )
            except Exception as e:
                print(f"[VectorStore] Reset collection warning: {e}")

vector_store_service = VectorStoreService()
