import os
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path
from app.config import settings
from app.services.vector_store import vector_store_service

try:
    import pypdf
except ImportError:
    pypdf = None

class DocumentIngestionService:
    """Parses, chunks, and indexes multi-format local files into vector store."""
    def __init__(self, chunk_size: int = settings.CHUNK_SIZE, chunk_overlap: int = settings.CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str) -> List[str]:
        """Recursive sliding-window character text splitter with paragraph boundary preservation."""
        if not text:
            return []

        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # If a single paragraph exceeds chunk size, split by sentences
                if len(para) > self.chunk_size:
                    sentences = re.split(r'(?<=[.!?])\s+', para)
                    sub_chunk = ""
                    for s in sentences:
                        if len(sub_chunk) + len(s) + 1 <= self.chunk_size:
                            sub_chunk = f"{sub_chunk} {s}" if sub_chunk else s
                        else:
                            if sub_chunk:
                                chunks.append(sub_chunk)
                            sub_chunk = s
                    current_chunk = sub_chunk
                else:
                    current_chunk = para

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def extract_text_from_file(self, file_path: str) -> Tuple[str, str]:
        """Extracts text content and detects document format."""
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext in [".txt", ".md", ".csv", ".json", ".log"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read(), ext.replace(".", "").upper()

        elif ext == ".pdf":
            if pypdf is not None:
                try:
                    reader = pypdf.PdfReader(file_path)
                    text = "\n".join([page.extract_text() or "" for page in reader.pages])
                    return text, "PDF"
                except Exception as e:
                    return f"Error reading PDF: {e}", "PDF"
            else:
                return "PyPDF library not installed.", "PDF"

        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read(), "UNKNOWN"

    def ingest_file(self, file_path: str, custom_filename: str = None) -> int:
        """Ingests a file, splits into chunks, and persists to ChromaDB."""
        path = Path(file_path)
        filename = custom_filename or path.name
        content, doc_type = self.extract_text_from_file(file_path)

        if not content.strip():
            return 0

        chunks = self.chunk_text(content)
        if not chunks:
            return 0

        metadatas = [
            {
                "record_id": f"{filename}_chunk_{i}",
                "source_file": filename,
                "source": filename,
                "document_type": doc_type,
                "doc_type": doc_type,
                "chunk_id": f"{filename}_chunk_{i}",
                "chunk_index": i,
                "total_chunks": len(chunks),
                "snippet": chunks[i][:350]
            }
            for i in range(len(chunks))
        ]
        ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]

        vector_store_service.add_documents(documents=chunks, metadatas=metadatas, ids=ids)
        return len(chunks)

    def ingest_directory(self, dir_path: str = settings.SAMPLE_DOCS_PATH) -> Dict[str, int]:
        """Scans directory and indexes all documentation files."""
        results = {}
        target_dir = Path(dir_path)
        if not target_dir.exists():
            return results

        for file in target_dir.iterdir():
            if file.is_file() and file.suffix.lower() in [".txt", ".md", ".pdf", ".csv", ".json"]:
                count = self.ingest_file(str(file))
                results[file.name] = count

        return results

ingestion_service = DocumentIngestionService()
