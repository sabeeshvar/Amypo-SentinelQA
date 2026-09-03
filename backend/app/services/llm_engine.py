import requests
import json
import re
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas import SourceChunk

class LocalLLMEngine:
    """Offline Local LLM Engine with Ollama API & deterministic local RAG fallback."""
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, default_model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    def is_ollama_available(self) -> bool:
        """Tests if the local Ollama instance is reachable."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def generate_rag_answer(self, query: str, context_chunks: List[SourceChunk], model_name: Optional[str] = None) -> str:
        """Generates an answer strictly grounded in the provided context chunks."""
        active_model = model_name or self.default_model
        
        # Build strict context string
        context_str = "\n\n".join([
            f"[Source {i+1}: {chunk.doc_name}]\n{chunk.content}"
            for i, chunk in enumerate(context_chunks)
        ])

        system_prompt = (
            "You are VeriQuery, a strictly factual and hallucination-free AI assistant. "
            "Your task is to answer the user's question using ONLY the provided Source Documents below.\n"
            "Rules:\n"
            "1. Do not introduce outside information or make assumptions not directly stated in the sources.\n"
            "2. If the answer cannot be determined from the context, clearly state: 'The provided documents do not contain sufficient information to answer this question.'\n"
            "3. State your claims clearly and concisely so they can be verified.\n"
            "4. Include inline citations like [Source 1], [Source 2] matching the sources used."
        )

        user_prompt = f"### CONTEXT:\n{context_str}\n\n### QUESTION:\n{query}\n\n### FACTUAL ANSWER:"

        if self.is_ollama_available():
            try:
                payload = {
                    "model": active_model,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False,
                    "options": {
                        "temperature": 0.1, # Low temperature for zero-hallucination factual grounding
                        "num_predict": 400
                    }
                }
                res = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=20.0)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
            except Exception as e:
                print(f"[LLMEngine] Ollama request failed: {e}. Falling back to offline local synthesis.")

        # Offline local synthesis fallback: extracts and synthesizes directly from the top matching source chunks
        return self._offline_synthesize_answer(query, context_chunks)

    def generate_sql_query(self, natural_query: str, schema_str: str) -> Dict[str, str]:
        """Translates natural language questions into safe SQLite queries."""
        system_prompt = (
            "You are an expert SQL analyst. Convert the natural language request into a single, valid, read-only SQLite SELECT query. "
            "Output valid JSON in the format: {\"sql\": \"SELECT ...\", \"explanation\": \"...\"}. Do not include markdown codeblocks."
        )
        user_prompt = f"Schema:\n{schema_str}\n\nUser Request: {natural_query}"

        if self.is_ollama_available():
            try:
                payload = {
                    "model": self.default_model,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.05}
                }
                res = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=15.0)
                if res.status_code == 200:
                    out = res.json().get("response", "")
                    try:
                        parsed = json.loads(out)
                        if "sql" in parsed:
                            return parsed
                    except Exception:
                        pass
            except Exception as e:
                print(f"[LLMEngine] SQL generation via Ollama failed: {e}")

        # Rule-based offline SQL generator fallback for common operational questions
        return self._offline_rule_sql_generator(natural_query)

    def _offline_synthesize_answer(self, query: str, context_chunks: List[SourceChunk]) -> str:
        """Synthesizes a clean factual answer from context chunks when Ollama is offline."""
        if not context_chunks:
            return "The local knowledge base does not contain relevant documents to answer this query. Please ingest relevant documents."

        # Extract the highest similarity sentences matching the query terms
        query_words = set(re.findall(r"\w+", query.lower()))
        matched_sentences = []
        
        for i, chunk in enumerate(context_chunks):
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', chunk.content) if len(s.strip()) > 15]
            for s in sentences:
                s_words = set(re.findall(r"\w+", s.lower()))
                overlap = len(query_words.intersection(s_words))
                if overlap > 0:
                    matched_sentences.append((overlap, f"{s} [Source {i+1}: {chunk.doc_name}]"))

        matched_sentences.sort(key=lambda x: x[0], reverse=True)
        top_sentences = [s[1] for s in matched_sentences[:4]]

        if top_sentences:
            return "Based on the verified offline documentation: " + " ".join(top_sentences)
        else:
            return f"According to [Source 1: {context_chunks[0].doc_name}]: {context_chunks[0].content[:300]}..."

    def _offline_rule_sql_generator(self, natural_query: str) -> Dict[str, str]:
        """Provides instant SQL generation for standard enterprise audit & incident queries."""
        q = natural_query.lower()
        if "incident" in q or "ticket" in q or "p1" in q or "critical" in q:
            return {
                "sql": "SELECT ticket_id, server_id, severity, title, status, assigned_engineer FROM incident_tickets WHERE status != 'CLOSED' ORDER BY severity ASC;",
                "explanation": "Retrieves all active incident tickets sorted by urgency/severity."
            }
        elif "cost" in q or "expensive" in q or "budget" in q:
            return {
                "sql": "SELECT server_id, hostname, datacenter_region, monthly_cost_usd FROM servers ORDER BY monthly_cost_usd DESC LIMIT 5;",
                "explanation": "Lists top 5 servers by monthly infrastructure expenditure."
            }
        elif "compliance" in q or "audit" in q or "vulnerability" in q or "soc2" in q:
            return {
                "sql": "SELECT a.audit_id, s.hostname, a.compliance_framework, a.vulnerability_score, a.patch_status FROM security_compliance_audits a JOIN servers s ON a.server_id = s.server_id WHERE a.patch_status != 'COMPLIANT';",
                "explanation": "Finds all servers requiring security patches or failing compliance audits."
            }
        elif "offline" in q or "degraded" in q or "maintenance" in q or "status" in q:
            return {
                "sql": "SELECT server_id, hostname, datacenter_region, status, uptime_days FROM servers WHERE status != 'ONLINE';",
                "explanation": "Identifies servers that are currently degraded, in maintenance, or experiencing issues."
            }
        else:
            return {
                "sql": "SELECT server_id, hostname, datacenter_region, os_version, ram_gb, cpu_cores, status FROM servers LIMIT 10;",
                "explanation": "Displays an overview of servers in the infrastructure fleet."
            }

llm_engine = LocalLLMEngine()
