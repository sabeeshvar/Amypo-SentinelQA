import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
CHROMA_PERSIST_DIR = BASE_DIR / "data" / "chroma_db"
SAMPLE_DOCS_DIR = BASE_DIR / "data" / "sample_docs"
SAMPLE_DB_DIR = BASE_DIR / "data" / "sample_db"

class Settings(BaseModel):
    PROJECT_NAME: str = "VeriQuery"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Offline Local Database QA & AI Hallucination Detection System (PS7 & PS2)"
    
    # Offline LLM Settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3:8b-instruct-q4_K_M")
    FALLBACK_MODEL: str = os.getenv("FALLBACK_MODEL", "mistral:7b-instruct")
    
    # Embedding Model (Offline, Fast, Small Footprint ~80MB)
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    
    # NLI & Hallucination Model Settings
    # CPU friendly, sub-second latency
    NLI_MODEL_NAME: str = os.getenv("NLI_MODEL_NAME", "cross-encoder/nli-deberta-v3-small")
    
    # Strict Performance & Latency Constraints
    MAX_LATENCY_BUDGET_SEC: float = 10.0
    RAM_LIMIT_GB: float = 8.0
    
    # Vector Search & RAG Parameters
    TOP_K_CHUNKS: int = 4
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 80
    
    # Hallucination Scoring Thresholds
    ENTAILMENT_THRESHOLD: float = 0.45
    CONTRADICTION_THRESHOLD: float = 0.40
    
    # Paths
    CHROMA_PATH: str = str(CHROMA_PERSIST_DIR)
    SAMPLE_DOCS_PATH: str = str(SAMPLE_DOCS_DIR)
    SAMPLE_DB_PATH: str = str(SAMPLE_DB_DIR / "enterprise_ops.sqlite")

settings = Settings()
