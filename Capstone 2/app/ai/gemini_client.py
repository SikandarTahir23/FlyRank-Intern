import google.generativeai as genai
from typing import Optional
from app.config import get_settings
from app.repositories.cost_repo import CostRepository
from app.domain.events import CostLogged
from datetime import datetime


class GeminiClient:
    def __init__(self):
        self._settings = get_settings()
        self._cost_repo = CostRepository()
        self._model_vision = None
        self._model_embedding = None
        self._init_models()

    def _init_models(self):
        if self._settings.gemini_api_key:
            genai.configure(api_key=self._settings.gemini_api_key)
            self._model_vision = genai.GenerativeModel("gemini-1.5-flash")
            self._model_embedding = "models/embedding-001"

    async def vision_analyze(self, image_path: str, prompt: str) -> tuple[str, int, int]:
        if not self._model_vision:
            raise RuntimeError("Gemini API key not configured")

        import PIL.Image
        image = PIL.Image.open(image_path)

        response = await self._model_vision.generate_content_async([prompt, image])
        text = response.text

        prompt_tokens = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
        candidate_tokens = response.usage_metadata.candidates_token_count if response.usage_metadata else 0

        await self._log_cost("vision", "gemini-1.5-flash", prompt_tokens, candidate_tokens)

        return text, prompt_tokens, candidate_tokens

    async def generate_embedding(self, text: str) -> tuple[list[float], int]:
        if not self._settings.gemini_api_key:
            raise RuntimeError("Gemini API key not configured")

        result = genai.embed_content(
            model=self._model_embedding,
            content=text,
            task_type="retrieval_document",
        )

        embedding = result["embedding"]
        tokens = len(text.split()) * 1.3

        await self._log_cost("embedding_text", "gemini-embedding-001", int(tokens), 0)

        return embedding, int(tokens)

    async def generate_image_embedding(self, image_path: str) -> tuple[list[float], int]:
        if not self._model_vision:
            raise RuntimeError("Gemini API key not configured")

        import PIL.Image
        image = PIL.Image.open(image_path)

        response = await self._model_vision.generate_content_async(
            ["Describe this image in detail for embedding generation", image]
        )
        text = response.text

        prompt_tokens = response.usage_metadata.prompt_token_count if response.usage_metadata else 0

        result = genai.embed_content(
            model=self._model_embedding,
            content=text,
            task_type="retrieval_document",
        )

        embedding = result["embedding"]
        candidate_tokens = len(text.split()) * 1.3

        await self._log_cost("embedding_image", "gemini-embedding-001", prompt_tokens, int(candidate_tokens))

        return embedding, prompt_tokens + int(candidate_tokens)

    async def _log_cost(
        self,
        operation_type: str,
        model: str,
        prompt_tokens: int,
        candidate_tokens: int,
    ) -> None:
        cost_per_1k_prompt = 0.000075
        cost_per_1k_candidate = 0.0003
        estimated_cost = (prompt_tokens / 1000) * cost_per_1k_prompt + (candidate_tokens / 1000) * cost_per_1k_candidate

        await self._cost_repo.log(operation_type, model, prompt_tokens, candidate_tokens, estimated_cost)