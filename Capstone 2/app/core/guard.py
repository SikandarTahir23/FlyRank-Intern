from dataclasses import dataclass
from typing import Literal
from app.domain.value_objects import SubjectLabel, SimilarityScore, Confidence
from app.config import get_settings


@dataclass(frozen=True)
class GuardResult:
    verdict: Literal["accepted", "rejected", "no_match"]
    rejection_reason: str | None = None


class MismatchGuard:
    SPECIES_CONFLICTS: dict[str, set[str]] = {
        "red fox": {"gray wolf", "wolf", "arctic wolf", "timber wolf"},
        "gray wolf": {"red fox", "fox", "arctic fox"},
        "fox": {"wolf", "gray wolf", "arctic wolf"},
        "wolf": {"fox", "red fox", "arctic fox"},
    }

    def __init__(self):
        self._settings = get_settings()
        self.cosine_threshold = self._settings.cosine_threshold
        self.confidence_threshold = self._settings.confidence_threshold

    def evaluate(
        self,
        post_subject: str,
        post_category: str,
        candidate_subject: str,
        candidate_category: str,
        candidate_confidence: float,
        similarity_score: float,
    ) -> GuardResult:
        score = SimilarityScore(similarity_score)
        confidence = Confidence(candidate_confidence)

        if not score.passes_threshold(self.cosine_threshold):
            return GuardResult(
                verdict="rejected",
                rejection_reason="below_similarity_cutoff",
            )

        if candidate_subject != post_subject:
            if self._has_species_conflict(post_subject, candidate_subject):
                return GuardResult(
                    verdict="rejected",
                    rejection_reason=f"species_conflict:{candidate_subject}_for_{post_subject}",
                )
            if candidate_category != post_category:
                return GuardResult(
                    verdict="rejected",
                    rejection_reason="category_mismatch",
                )

        if confidence.is_flagged(self.confidence_threshold):
            return GuardResult(
                verdict="rejected",
                rejection_reason="low_confidence",
            )

        return GuardResult(verdict="accepted", rejection_reason=None)

    def _has_species_conflict(self, post_subject: str, candidate_subject: str) -> bool:
        post_norm = post_subject.strip().lower()
        cand_norm = candidate_subject.strip().lower()
        conflicts = self.SPECIES_CONFLICTS.get(post_norm, set())
        return cand_norm in conflicts