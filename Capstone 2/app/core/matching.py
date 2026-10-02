from typing import Optional
from uuid import UUID
from app.repositories.embedding_repo import EmbeddingRepository
from app.repositories.image_repo import ImageRepository
from app.domain.models import ImageMetadata
from app.config import get_settings


class MatchingService:
    def __init__(self):
        self._embedding_repo = EmbeddingRepository()
        self._image_repo = ImageRepository()
        self._settings = get_settings()

    async def find_candidates(
        self,
        post_embedding: list[float],
        target_category: str,
        top_k: int = 10,
    ) -> list[tuple[ImageMetadata, float]]:
        candidate_ids = await self._embedding_repo.cosine_search(
            entity_type="image",
            query_vector=post_embedding,
            limit=top_k * 2,
        )

        if not candidate_ids:
            return []

        image_ids = [cid for cid, _ in candidate_ids]
        metadata_list = await self._image_repo.get_metadata_batch(image_ids)

        category_filtered = [
            (meta, score)
            for (cid, score), meta in zip(candidate_ids, metadata_list)
            if meta and (target_category is None or meta.category == target_category)
        ]

        return category_filtered[:top_k]

    async def find_all_candidates(
        self,
        post_embedding: list[float],
        top_k: int = 20,
    ) -> list[tuple[ImageMetadata, float]]:
        candidate_ids = await self._embedding_repo.cosine_search(
            entity_type="image",
            query_vector=post_embedding,
            limit=top_k,
        )

        if not candidate_ids:
            return []

        image_ids = [cid for cid, _ in candidate_ids]
        metadata_list = await self._image_repo.get_metadata_batch(image_ids)

        return [
            (meta, score)
            for (cid, score), meta in zip(candidate_ids, metadata_list)
            if meta
        ]