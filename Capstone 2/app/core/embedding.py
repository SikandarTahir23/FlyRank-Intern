from app.ai.gemini_client import GeminiClient
from app.ai.prompts import POST_EMBEDDING_TEMPLATE
from app.repositories.embedding_repo import EmbeddingRepository
from app.repositories.post_repo import PostRepository
from app.domain.models import Post


class EmbeddingService:
    def __init__(self):
        self._gemini = GeminiClient()
        self._embedding_repo = EmbeddingRepository()
        self._post_repo = PostRepository()

    async def generate_post_embedding(self, post_id: str) -> list[float]:
        post = await self._post_repo.get(post_id)
        if not post:
            raise ValueError(f"Post {post_id} not found")

        text = POST_EMBEDDING_TEMPLATE.format(
            target_subject=post.target_subject,
            target_category=post.target_category,
            title=post.title,
            content=post.content,
        )

        embedding, _ = await self._gemini.generate_embedding(text)
        await self._embedding_repo.upsert("post", post.id, embedding)

        return embedding

    async def get_post_embedding(self, post_id: str) -> list[float] | None:
        return await self._embedding_repo.get("post", post_id)

    async def get_image_embedding(self, image_id: str) -> list[float] | None:
        return await self._embedding_repo.get("image", image_id)