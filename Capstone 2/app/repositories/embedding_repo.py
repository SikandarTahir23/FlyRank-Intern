from uuid import UUID
from typing import Optional
from app.repositories.base import BaseRepository
from app.domain.models import Embedding


class EmbeddingRepository(BaseRepository):
    async def upsert(
        self,
        entity_type: str,
        entity_id: UUID,
        vector: list[float],
        model_name: str = "gemini-embedding-001",
    ) -> Embedding:
        vector_str = "[" + ",".join(str(v) for v in vector) + "]"
        query = """
            INSERT INTO embeddings (entity_type, entity_id, vector, model_name)
            VALUES ($1, $2, $3::vector, $4)
            ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                vector = EXCLUDED.vector,
                model_name = EXCLUDED.model_name
            RETURNING id, entity_type, entity_id, vector, model_name, created_at
        """
        row = await self._fetchrow(query, entity_type, entity_id, vector_str, model_name)
        return Embedding(**dict(row))

    async def get(self, entity_type: str, entity_id: UUID) -> Optional[Embedding]:
        query = "SELECT * FROM embeddings WHERE entity_type = $1 AND entity_id = $2"
        row = await self._fetchrow(query, entity_type, entity_id)
        if row:
            d = dict(row)
            d["vector"] = list(d["vector"])
            return Embedding(**d)
        return None

    async def cosine_search(
        self,
        entity_type: str,
        query_vector: list[float],
        limit: int = 10,
        exclude_ids: list[UUID] | None = None,
    ) -> list[tuple[UUID, float]]:
        vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"
        exclude_clause = ""
        params = [entity_type, vector_str, limit]
        if exclude_ids:
            placeholders = ",".join(f"${i}" for i in range(4, 4 + len(exclude_ids)))
            exclude_clause = f"AND entity_id NOT IN ({placeholders})"
            params.extend(exclude_ids)
        query = f"""
            SELECT entity_id, 1 - (vector <=> $2::vector) AS similarity
            FROM embeddings
            WHERE entity_type = $1 {exclude_clause}
            ORDER BY vector <=> $2::vector
            LIMIT $3
        """
        rows = await self._fetch(query, *params)
        return [(row["entity_id"], float(row["similarity"])) for row in rows]