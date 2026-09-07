from uuid import UUID
from typing import Optional
from app.repositories.base import BaseRepository
from app.domain.models import RecommendationAudit


class AuditRepository(BaseRepository):
    async def log(
        self,
        post_id: UUID,
        candidate_image_id: UUID,
        similarity_score: float,
        guard_verdict: str,
        rejection_reason: Optional[str] = None,
    ) -> RecommendationAudit:
        query = """
            INSERT INTO recommendation_audits (post_id, candidate_image_id, similarity_score, guard_verdict, rejection_reason)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, post_id, candidate_image_id, similarity_score, guard_verdict, rejection_reason, created_at
        """
        row = await self._fetchrow(query, post_id, candidate_image_id, similarity_score, guard_verdict, rejection_reason)
        return RecommendationAudit(**dict(row))

    async def get_by_post(self, post_id: UUID) -> list[RecommendationAudit]:
        query = "SELECT * FROM recommendation_audits WHERE post_id = $1 ORDER BY created_at"
        rows = await self._fetch(query, post_id)
        return [RecommendationAudit(**dict(r)) for r in rows]

    async def get_verdict_counts(self, post_id: UUID) -> dict[str, int]:
        query = """
            SELECT guard_verdict, COUNT(*) as count
            FROM recommendation_audits
            WHERE post_id = $1
            GROUP BY guard_verdict
        """
        rows = await self._fetch(query, post_id)
        return {row["guard_verdict"]: row["count"] for row in rows}