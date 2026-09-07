from uuid import UUID
from typing import Optional
from app.repositories.base import BaseRepository
from app.domain.models import Image, ImageMetadata


class ImageRepository(BaseRepository):
    async def create(self, file_path: str) -> Image:
        query = """
            INSERT INTO images (file_path, status)
            VALUES ($1, 'pending')
            RETURNING id, file_path, status, created_at, updated_at
        """
        row = await self._fetchrow(query, file_path)
        return Image(**dict(row))

    async def get(self, image_id: UUID) -> Optional[Image]:
        query = "SELECT id, file_path, status, created_at, updated_at FROM images WHERE id = $1"
        row = await self._fetchrow(query, image_id)
        return Image(**dict(row)) if row else None

    async def get_by_file_path(self, file_path: str) -> Optional[Image]:
        query = "SELECT id, file_path, status, created_at, updated_at FROM images WHERE file_path = $1"
        row = await self._fetchrow(query, file_path)
        return Image(**dict(row)) if row else None

    async def update_status(self, image_id: UUID, status: str) -> bool:
        query = """
            UPDATE images SET status = $1, updated_at = now()
            WHERE id = $2
        """
        result = await self._execute(query, status, image_id)
        return result == "UPDATE 1"

    async def list_by_status(self, status: str, limit: int = 100) -> list[Image]:
        query = """
            SELECT id, file_path, status, created_at, updated_at
            FROM images WHERE status = $1 ORDER BY created_at LIMIT $2
        """
        rows = await self._fetch(query, status, limit)
        return [Image(**dict(r)) for r in rows]

    async def create_metadata(
        self,
        image_id: UUID,
        subject: str,
        category: str,
        attributes: list[str],
        caption: str,
        confidence: float,
        is_flagged: bool,
    ) -> ImageMetadata:
        query = """
            INSERT INTO image_metadata (image_id, subject, category, attributes, caption, confidence, is_flagged)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING image_id, subject, category, attributes, caption, confidence, is_flagged, created_at, updated_at
        """
        row = await self._fetchrow(query, image_id, subject, category, attributes, caption, confidence, is_flagged)
        return ImageMetadata(**dict(row))

    async def get_metadata(self, image_id: UUID) -> Optional[ImageMetadata]:
        query = "SELECT * FROM image_metadata WHERE image_id = $1"
        row = await self._fetchrow(query, image_id)
        return ImageMetadata(**dict(row)) if row else None

    async def list_by_category(self, category: str, exclude_flagged: bool = True, limit: int = 50) -> list[ImageMetadata]:
        flagged_clause = "AND is_flagged = FALSE" if exclude_flagged else ""
        query = f"""
            SELECT * FROM image_metadata
            WHERE category = $1 {flagged_clause}
            ORDER BY confidence DESC
            LIMIT $2
        """
        rows = await self._fetch(query, category, limit)
        return [ImageMetadata(**dict(r)) for r in rows]

    async def list_all_metadata(self, exclude_flagged: bool = True, limit: int = 100) -> list[ImageMetadata]:
        flagged_clause = "WHERE is_flagged = FALSE" if exclude_flagged else ""
        query = f"""
            SELECT * FROM image_metadata
            {flagged_clause}
            ORDER BY confidence DESC
            LIMIT $1
        """
        rows = await self._fetch(query, limit)
        return [ImageMetadata(**dict(r)) for r in rows]

    async def get_metadata_batch(self, image_ids: list[UUID]) -> list[Optional[ImageMetadata]]:
        if not image_ids:
            return []
        placeholders = ",".join(f"${i+1}" for i in range(len(image_ids)))
        query = f"SELECT * FROM image_metadata WHERE image_id IN ({placeholders})"
        rows = await self._fetch(query, *image_ids)
        metadata_map = {row["image_id"]: ImageMetadata(**dict(row)) for row in rows}
        return [metadata_map.get(iid) for iid in image_ids]