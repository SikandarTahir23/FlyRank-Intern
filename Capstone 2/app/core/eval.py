from dataclasses import dataclass
from typing import Optional
from uuid import UUID
from app.core.matching import MatchingService
from app.core.embedding import EmbeddingService
from app.core.guard import MismatchGuard
from app.repositories.post_repo import PostRepository
from app.repositories.audit_repo import AuditRepository
from app.domain.models import Post, ImageMetadata


@dataclass
class EvalResult:
    post_id: UUID
    expected_image_id: Optional[UUID]
    predicted_image_id: Optional[UUID]
    passed: bool
    guard_verdict: str
    rejection_reason: Optional[str]
    similarity_score: float


class EvaluationRunner:
    def __init__(self):
        self._matching = MatchingService()
        self._embedding = EmbeddingService()
        self._guard = MismatchGuard()
        self._post_repo = PostRepository()
        self._audit_repo = AuditRepository()

    async def run_single(self, post: Post, expected_image_id: Optional[UUID] = None) -> EvalResult:
        post_embedding = await self._embedding.generate_post_embedding(post.id)

        candidates = await self._matching.find_all_candidates(post_embedding, top_k=20)

        for candidate_meta, score in candidates:
            result = self._guard.evaluate(
                post_subject=post.target_subject,
                post_category=post.target_category,
                candidate_subject=candidate_meta.subject,
                candidate_category=candidate_meta.category,
                candidate_confidence=candidate_meta.confidence,
                similarity_score=score,
            )

            await self._audit_repo.log(
                post_id=post.id,
                candidate_image_id=candidate_meta.image_id,
                similarity_score=score,
                guard_verdict=result.verdict,
                rejection_reason=result.rejection_reason,
            )

            if result.verdict == "accepted":
                return EvalResult(
                    post_id=post.id,
                    expected_image_id=expected_image_id,
                    predicted_image_id=candidate_meta.image_id,
                    passed=candidate_meta.image_id == expected_image_id if expected_image_id else True,
                    guard_verdict=result.verdict,
                    rejection_reason=result.rejection_reason,
                    similarity_score=score,
                )

        return EvalResult(
            post_id=post.id,
            expected_image_id=expected_image_id,
            predicted_image_id=None,
            passed=False,
            guard_verdict="no_match",
            rejection_reason="no_candidate_cleared_guard",
            similarity_score=0.0,
        )

    async def run_dataset(self, test_cases: list[dict]) -> list[EvalResult]:
        results = []
        for case in test_cases:
            post = await self._post_repo.get(case["post_id"])
            if not post:
                continue
            expected = UUID(case["expected_image_id"]) if case.get("expected_image_id") else None
            result = await self.run_single(post, expected)
            results.append(result)
        return results