from fastapi import Depends
from app.config import Settings, get_settings
from app.repositories.image_repo import ImageRepository
from app.repositories.post_repo import PostRepository
from app.repositories.embedding_repo import EmbeddingRepository
from app.repositories.audit_repo import AuditRepository
from app.repositories.cost_repo import CostRepository
from app.core.vision import VisionIngestionService
from app.core.embedding import EmbeddingService
from app.core.matching import MatchingService
from app.core.guard import MismatchGuard
from app.core.cost import CostTracker
from app.core.eval import EvaluationRunner


def get_image_repo() -> ImageRepository:
    return ImageRepository()


def get_post_repo() -> PostRepository:
    return PostRepository()


def get_embedding_repo() -> EmbeddingRepository:
    return EmbeddingRepository()


def get_audit_repo() -> AuditRepository:
    return AuditRepository()


def get_cost_repo() -> CostRepository:
    return CostRepository()


def get_vision_service(
    image_repo: ImageRepository = Depends(get_image_repo),
    embedding_repo: EmbeddingRepository = Depends(get_embedding_repo),
) -> VisionIngestionService:
    return VisionIngestionService()


def get_embedding_service(
    embedding_repo: EmbeddingRepository = Depends(get_embedding_repo),
    post_repo: PostRepository = Depends(get_post_repo),
) -> EmbeddingService:
    return EmbeddingService()


def get_matching_service(
    embedding_repo: EmbeddingRepository = Depends(get_embedding_repo),
    image_repo: ImageRepository = Depends(get_image_repo),
) -> MatchingService:
    return MatchingService()


def get_guard() -> MismatchGuard:
    return MismatchGuard()


def get_cost_tracker(
    cost_repo: CostRepository = Depends(get_cost_repo),
) -> CostTracker:
    return CostTracker()


def get_eval_runner(
    matching: MatchingService = Depends(get_matching_service),
    embedding: EmbeddingService = Depends(get_embedding_service),
    guard: MismatchGuard = Depends(get_guard),
    post_repo: PostRepository = Depends(get_post_repo),
    audit_repo: AuditRepository = Depends(get_audit_repo),
) -> EvaluationRunner:
    return EvaluationRunner()