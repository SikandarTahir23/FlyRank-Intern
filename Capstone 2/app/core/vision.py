import json
from pathlib import Path
from app.ai.gemini_client import GeminiClient
from app.ai.prompts import VISION_PROMPT
from app.api.schemas.vision import VisionOutput, is_flagged
from app.repositories.image_repo import ImageRepository
from app.repositories.embedding_repo import EmbeddingRepository
from app.domain.events import ImageIngested, EmbeddingGenerated
from app.config import get_settings


class VisionIngestionService:
    def __init__(self):
        self._gemini = GeminiClient()
        self._image_repo = ImageRepository()
        self._embedding_repo = EmbeddingRepository()
        self._settings = get_settings()

    async def ingest(self, file_path: str) -> tuple[VisionOutput, bool]:
        image = await self._image_repo.create(file_path)
        await self._image_repo.update_status(image.id, "processing")

        try:
            response_text, _, _ = await self._gemini.vision_analyze(file_path, VISION_PROMPT)
            vision_output = self._parse_vision_output(response_text)

            flagged = is_flagged(vision_output.confidence)

            await self._image_repo.create_metadata(
                image_id=image.id,
                subject=vision_output.subject,
                category=vision_output.category,
                attributes=vision_output.attributes,
                caption=vision_output.caption,
                confidence=vision_output.confidence,
                is_flagged=flagged,
            )

            await self._image_repo.update_status(image.id, "flagged" if flagged else "completed")

            embedding, _ = await self._gemini.generate_image_embedding(file_path)
            await self._embedding_repo.upsert("image", image.id, embedding)

            return vision_output, flagged

        except Exception as e:
            await self._image_repo.update_status(image.id, "failed")
            raise

    def _parse_vision_output(self, response_text: str) -> VisionOutput:
        try:
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned)
            return VisionOutput(**data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON from vision model: {e}")
        except Exception as e:
            raise ValueError(f"Vision output validation failed: {e}")