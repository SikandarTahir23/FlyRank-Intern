import asyncio
from pathlib import Path
from app.config import get_settings
from app.repositories.image_repo import ImageRepository
from app.core.vision import VisionIngestionService


class IngestionWorker:
    def __init__(self, image_dir: str = "data/images"):
        self._image_dir = Path(image_dir)
        self._image_repo = ImageRepository()
        self._vision_service = VisionIngestionService()
        self._settings = get_settings()
        self._running = False

    async def start(self):
        self._running = True
        await self._process_directory()

    async def _process_directory(self):
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        image_files = [
            f for f in self._image_dir.rglob("*")
            if f.suffix.lower() in valid_extensions and f.is_file()
        ]

        for image_path in image_files:
            if not self._running:
                break
            try:
                rel_path = str(image_path.relative_to(self._image_dir))
                existing = await self._image_repo.get_by_file_path(rel_path)
                if existing:
                    continue
                await self._vision_service.ingest(str(image_path))
            except Exception as e:
                print(f"Failed to ingest {image_path}: {e}")

    def stop(self):
        self._running = False