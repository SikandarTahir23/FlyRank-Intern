from uuid import UUID
from typing import Optional
from app.repositories.base import BaseRepository
from app.domain.models import Post


class PostRepository(BaseRepository):
    async def create(self, title: str, content: str, target_subject: str, target_category: str) -> Post:
        query = """
            INSERT INTO posts (title, content, target_subject, target_category)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, content, target_subject, target_category, created_at, updated_at
        """
        row = await self._fetchrow(query, title, content, target_subject, target_category)
        return Post(**dict(row))

    async def get(self, post_id: UUID) -> Optional[Post]:
        query = "SELECT * FROM posts WHERE id = $1"
        row = await self._fetchrow(query, post_id)
        return Post(**dict(row)) if row else None

    async def list_all(self, limit: int = 50) -> list[Post]:
        query = "SELECT * FROM posts ORDER BY created_at DESC LIMIT $1"
        rows = await self._fetch(query, limit)
        return [Post(**dict(r)) for r in rows]