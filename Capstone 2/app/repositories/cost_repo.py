from uuid import UUID
from typing import Optional
from app.repositories.base import BaseRepository
from app.domain.models import AICostLog


class CostRepository(BaseRepository):
    async def log(
        self,
        operation_type: str,
        model: str,
        prompt_tokens: int,
        candidate_tokens: int,
        estimated_cost_usd: float,
    ) -> AICostLog:
        query = """
            INSERT INTO ai_cost_logs (operation_type, model, prompt_tokens, candidate_tokens, estimated_cost_usd)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, operation_type, model, prompt_tokens, candidate_tokens, estimated_cost_usd, created_at
        """
        row = await self._fetchrow(query, operation_type, model, prompt_tokens, candidate_tokens, estimated_cost_usd)
        return AICostLog(**dict(row))

    async def get_summary(self, operation_type: Optional[str] = None) -> dict:
        where_clause = "WHERE operation_type = $1" if operation_type else ""
        params = [operation_type] if operation_type else []
        query = f"""
            SELECT
                operation_type,
                model,
                SUM(prompt_tokens) as total_prompt_tokens,
                SUM(candidate_tokens) as total_candidate_tokens,
                SUM(estimated_cost_usd) as total_cost_usd,
                COUNT(*) as call_count
            FROM ai_cost_logs
            {where_clause}
            GROUP BY operation_type, model
        """
        rows = await self._fetch(query, *params)
        return [dict(r) for r in rows]