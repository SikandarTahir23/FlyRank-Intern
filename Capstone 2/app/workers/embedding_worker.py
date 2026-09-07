from app.repositories.image_repo import ImageRepository
from app.repositories.embedding_repo import EmbeddingRepository
from app.ai.gemini_client import GeminiClient


class EmbeddingWorker:
    def __init__(self):
        self._image_repo = ImageRepository()
        self._embedding_repo = EmbeddingRepository()
        self._gemini = GeminiClient()
        self._running = False

    async def start(self):
        self._running = True
        await self._generate_missing_embeddings()

    async def _generate_missing_embeddings(self):
        images = await self._image_repo.list_by_status("completed", limit=1000)
        for image in images:
            if not self._running:
                break
            existing = await self._embedding_repo.get("image", image.id)
            if existing:
                continue
            try:
                embedding, _ = await self._gemini.generate_image_embedding(image.file_path)
                await self._embedding_repo.upsert("image", image.id, embedding)
            except Exception as e:
                print(f"Failed to generate embedding for {image.id}: {e}")

    def stop(self):
        self._running = False