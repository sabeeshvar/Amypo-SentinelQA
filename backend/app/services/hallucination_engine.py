import re
import math
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings
from app.schemas import ClaimStatus, ClaimVerification, SourceChunk, ReliabilityReport

try:
    from sentence_transformers import CrossEncoder
except ImportError:
    CrossEncoder = None

class LocalNLIModel:
    """CPU-optimized local NLI / Cross-Encoder classifier."""
    def __init__(self, model_name: str = settings.NLI_MODEL_NAME):
        self.model_name = model_name
        self.cross_encoder = None
        self._init_model()

    def _init_model(self):
        if CrossEncoder is not None:
            try:
                # Load small footprint cross-encoder NLI model
                self.cross_encoder = CrossEncoder(self.model_name)
                print(f"[NLI Engine] Successfully loaded Cross-Encoder: {self.model_name}")
            except Exception as e:
                print(f"[NLI Engine] CrossEncoder '{self.model_name}' initialization notice: {e}. Utilizing fast deterministic semantic NLI engine.")
                self.cross_encoder = None

    def predict_pair(self, premise: str, hypothesis: str) -> Tuple[ClaimStatus, float, float, float, float]:
        """
        Calculates probabilities for [Contradiction, Entailment, Neutral].
        Returns (Status, Confidence, Entailment_prob, Neutral_prob, Contradiction_prob).
        """
        if self.cross_encoder is not None:
            try:
                raw_preds = self.cross_encoder.predict([(premise, hypothesis)])
                scores = raw_preds[0] if hasattr(raw_preds, "__getitem__") and len(raw_preds) > 0 else raw_preds
                
                # Softmax conversion
                exp_scores = [math.exp(float(s)) for s in scores]
                sum_exp = sum(exp_scores)
                probs = [s / sum_exp for s in exp_scores]
                
                # DeBERTa NLI standard indices: 0: contradiction, 1: entailment, 2: neutral
                contra_p = float(probs[0])
                entail_p = float(probs[1]) if len(probs) > 1 else 0.0
                neutral_p = float(probs[2]) if len(probs) > 2 else 0.0

                # Check if id2label overrides ordering
                try:
                    cfg = getattr(self.cross_encoder, "config", None) or getattr(getattr(self.cross_encoder, "model", None), "config", None)
                    id2label = getattr(cfg, "id2label", None)
                    if id2label and isinstance(id2label, dict):
                        for idx, prob in enumerate(probs):
                            val = id2label.get(idx) if idx in id2label else id2label.get(str(idx), "")
                            lbl = str(val).lower()
                            if "entail" in lbl:
                                entail_p = float(prob)
                            elif "contra" in lbl:
                                contra_p = float(prob)
                            elif "neut" in lbl:
                                neutral_p = float(prob)
                except Exception:
                    pass

                if entail_p >= settings.ENTAILMENT_THRESHOLD and entail_p > contra_p and entail_p > neutral_p:
                    return ClaimStatus.ENTAILED, entail_p, entail_p, neutral_p, contra_p
                elif contra_p >= settings.CONTRADICTION_THRESHOLD and contra_p > entail_p:
                    return ClaimStatus.CONTRADICTION, contra_p, entail_p, neutral_p, contra_p
                else:
                    return ClaimStatus.NEUTRAL, neutral_p, entail_p, neutral_p, contra_p
            except Exception as e:
                print(f"[NLI Engine] CrossEncoder prediction error: {e}")

        # High-Performance Deterministic Semantic NLI Heuristic (Sub-5ms, Zero RAM overhead)
        return self._semantic_heuristic_nli(premise, hypothesis)

    def _semantic_heuristic_nli(self, premise: str, hypothesis: str) -> Tuple[ClaimStatus, float, float, float, float]:
        """
        Deterministic, ultrafast CPU fact-checking algorithm analyzing:
        1. Jaccard & N-gram entity overlap
        2. Negation / Polar contradiction markers
        3. Novel ungrounded content entity detection (Neutral vs Entailed)
        4. Numeric / Date / Quantitative consistency
        """
        premise_clean = premise.lower()
        hypo_clean = hypothesis.lower()

        # Stop words to ignore for semantic entity check
        stop_words = {
            "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "with",
            "and", "or", "of", "by", "as", "from", "will", "shall", "be", "also", "into", "that", "this"
        }

        p_words = set(re.findall(r"\b[a-z0-9_]{2,}\b", premise_clean))
        h_words = set(re.findall(r"\b[a-z0-9_]{2,}\b", hypo_clean))

        h_content_words = {w for w in h_words if w not in stop_words}
        p_content_words = {w for w in p_words if w not in stop_words}

        if not h_content_words:
            return ClaimStatus.NEUTRAL, 0.50, 0.20, 0.60, 0.20

        # Check for direct numerical/quantitative contradiction
        hypo_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", hypo_clean))
        premise_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", premise_clean))
        
        # Check polar negation indicators
        negation_tokens = {"not", "never", "no", "prohibited", "banned", "false", "disapproved", "violates", "cannot", "refused"}
        hypo_has_negation = bool(h_words.intersection(negation_tokens))
        premise_has_negation = bool(p_words.intersection(negation_tokens))

        # Check content word overlap ratio
        content_intersection = h_content_words.intersection(p_content_words)
        content_overlap_ratio = len(content_intersection) / len(h_content_words)
        novel_content_words = h_content_words - p_content_words

        # 1. Contradiction Detection:
        # Case A: Polarity mismatch on key overlapping claim
        if (hypo_has_negation != premise_has_negation) and content_overlap_ratio >= 0.40:
            contra_p = min(0.95, 0.70 + (content_overlap_ratio * 0.25))
            entail_p = round(0.05, 3)
            neutral_p = round(1.0 - contra_p - entail_p, 3)
            return ClaimStatus.CONTRADICTION, contra_p, entail_p, neutral_p, contra_p

        # Case B: Number mismatch on same context (e.g. 10 days vs 30 days)
        if hypo_numbers and premise_numbers and content_overlap_ratio >= 0.40:
            if not hypo_numbers.issubset(premise_numbers):
                contra_p = 0.82
                entail_p = 0.08
                neutral_p = 0.10
                return ClaimStatus.CONTRADICTION, contra_p, entail_p, neutral_p, contra_p

        # 2. Entailment Detection (High content overlap & low ungrounded novel entities)
        if content_overlap_ratio >= 0.65 and len(novel_content_words) <= 1:
            entail_p = min(0.98, round(0.60 + (content_overlap_ratio * 0.38), 3))
            contra_p = 0.02
            neutral_p = round(1.0 - entail_p - contra_p, 3)
            return ClaimStatus.ENTAILED, entail_p, entail_p, neutral_p, contra_p

        # 3. Neutral (Unverified / Novel unsubstantiated entities present in hypothesis)
        neutral_p = min(0.90, round(0.55 + ((1.0 - content_overlap_ratio) * 0.35), 3))
        entail_p = round(content_overlap_ratio * 0.35, 3)
        contra_p = round(max(0.02, 1.0 - neutral_p - entail_p), 3)
        return ClaimStatus.NEUTRAL, neutral_p, entail_p, neutral_p, contra_p


class HallucinationVerificationEngine:
    """PS2 Core: Real-time Claim Deconstruction, Evidence Matching, and Reliability Scoring."""
    def __init__(self):
        self.nli_model = LocalNLIModel()

    def segment_claims(self, text: str) -> List[str]:
        """Deconstructs the answer into atomic, verifiable propositional claims."""
        # Clean citation tags for segmentation
        cleaned = re.sub(r"\[(?:Source|\d+)[^\]]*\]", "", text)
        
        # Split on sentence boundaries and bullet points
        raw_sentences = re.split(r'(?<=[.!?])\s+|\n+|- |\* ', cleaned)
        claims = []
        for s in raw_sentences:
            s_clean = s.strip()
            # Filter out non-claims, short greetings, or boilerplate
            if len(s_clean) >= 15 and not re.match(r"^(hello|hi|here is|in summary|based on)", s_clean, re.IGNORECASE):
                claims.append(s_clean)
        
        if not claims and text.strip():
            claims = [text.strip()]
        return claims

    def verify_answer(self, answer: str, source_chunks: List[SourceChunk]) -> Tuple[List[ClaimVerification], ReliabilityReport]:
        """
        Runs exhaustive claim-level NLI verification across retrieved context chunks.
        Splits chunks into atomic premise sentences for high-precision NLI alignment.
        Computes the complete Reliability Report and explainability trace.
        """
        claims_text = self.segment_claims(answer)
        verified_claims: List[ClaimVerification] = []

        entailed_count = 0
        neutral_count = 0
        contradicted_count = 0

        for idx, claim in enumerate(claims_text):
            best_chunk: Optional[SourceChunk] = None
            best_status = ClaimStatus.NEUTRAL
            best_confidence = 0.0
            best_entail = 0.0
            best_neutral = 1.0
            best_contra = 0.0
            best_snippet = None
            best_reasoning = "No relevant context found to corroborate this claim."

            if not source_chunks:
                best_reasoning = "Zero source documents available in context."
            else:
                # Compare claim against all retrieved chunks and their constituent sentences
                cand_results = []
                for chunk in source_chunks:
                    chunk_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', chunk.content) if len(s.strip()) > 10]
                    candidates = [chunk.content] + chunk_sentences

                    for premise_cand in candidates:
                        status, conf, ep, np, cp = self.nli_model.predict_pair(premise_cand, claim)
                        cand_results.append((status, conf, ep, np, cp, chunk, premise_cand))

                # 1. Check if ANY candidate sentence conclusively ENTAILS the claim
                entailed_candidates = [c for c in cand_results if c[0] == ClaimStatus.ENTAILED]
                if entailed_candidates:
                    entailed_candidates.sort(key=lambda x: x[2], reverse=True) # Sort by entailment_prob
                    best_status, best_confidence, best_entail, best_neutral, best_contra, best_chunk, best_snippet = entailed_candidates[0]
                    best_reasoning = f"Directly entailed by evidence in '{best_chunk.doc_name}'."

                else:
                    # 2. Check if ANY candidate directly CONTRADICTS the claim
                    contra_candidates = [c for c in cand_results if c[0] == ClaimStatus.CONTRADICTION]
                    if contra_candidates:
                        contra_candidates.sort(key=lambda x: x[4], reverse=True) # Sort by contradiction_prob
                        best_status, best_confidence, best_entail, best_neutral, best_contra, best_chunk, best_snippet = contra_candidates[0]
                        best_reasoning = f"Contradicts factual statement in '{best_chunk.doc_name}': '{best_snippet[:150]}...'"
                    else:
                        # 3. Neutral / Unsubstantiated
                        if cand_results:
                            cand_results.sort(key=lambda x: x[2], reverse=True)
                            best_status, best_confidence, best_entail, best_neutral, best_contra, best_chunk, best_snippet = cand_results[0]
                            best_status = ClaimStatus.NEUTRAL
                            best_reasoning = f"Partially matches context in '{best_chunk.doc_name}', but lacks conclusive factual proof."

            if best_status == ClaimStatus.ENTAILED:
                entailed_count += 1
            elif best_status == ClaimStatus.CONTRADICTION:
                contradicted_count += 1
            else:
                neutral_count += 1

            snippet = (best_snippet or (best_chunk.content if best_chunk else ""))[:220]
            if len(snippet) >= 220:
                snippet += "..."
            doc_name = best_chunk.doc_name if best_chunk else None
            chunk_id = best_chunk.chunk_id if best_chunk else None

            verified_claims.append(
                ClaimVerification(
                    claim_id=idx + 1,
                    claim_text=claim,
                    status=best_status,
                    confidence=round(best_confidence, 3),
                    entailment_prob=round(best_entail, 3),
                    neutral_prob=round(best_neutral, 3),
                    contradiction_prob=round(best_contra, 3),
                    best_matching_chunk_id=chunk_id,
                    best_matching_doc=doc_name,
                    evidence_snippet=snippet if snippet else None,
                    reasoning=best_reasoning
                )
            )

        total_claims = max(1, len(verified_claims))
        faithfulness_idx = entailed_count / total_claims
        
        # Reliability scoring formula (0 - 100):
        # Entailed increases score, contradiction heavily penalizes, neutral discounted
        raw_score = (entailed_count * 100.0) - (contradicted_count * 100.0) - (neutral_count * 20.0)
        overall_score = max(0.0, min(100.0, round(raw_score / total_claims, 1)))

        if overall_score >= 80 and contradicted_count == 0:
            risk = "Low Risk (Factual & Verified)"
        elif overall_score >= 50 and contradicted_count == 0:
            risk = "Moderate Risk (Unverified Claims Present)"
        elif contradicted_count == 1:
            risk = "High Risk (Factual Contradiction Detected)"
        else:
            risk = "Critical Risk (Severe Hallucination / Contradiction)"

        citation_prec = round(entailed_count / max(1, entailed_count + neutral_count), 2)

        report = ReliabilityReport(
            overall_score=overall_score,
            faithfulness_index=round(faithfulness_idx, 3),
            hallucination_risk=risk,
            entailed_claims_count=entailed_count,
            neutral_claims_count=neutral_count,
            contradicted_claims_count=contradicted_count,
            total_claims_count=len(verified_claims),
            citation_precision=citation_prec
        )

        return verified_claims, report

hallucination_engine = HallucinationVerificationEngine()
