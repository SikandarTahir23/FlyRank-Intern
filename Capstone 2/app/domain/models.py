from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from typing import Optional


@dataclass(frozen=True)
class Image:
    id: UUID
    file_path: str
    status: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class ImageMetadata:
    image_id: UUID
    subject: str
    category: str
    attributes: list[str]
    caption: str
    confidence: float
    is_flagged: bool
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class Embedding:
    id: int
    entity_type: str
    entity_id: UUID
    vector: list[float]
    model_name: str
    created_at: datetime


@dataclass(frozen=True)
class Post:
    id: UUID
    title: str
    content: str
    target_subject: str
    target_category: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class RecommendationAudit:
    id: UUID
    post_id: UUID
    candidate_image_id: UUID
    similarity_score: float
    guard_verdict: str
    rejection_reason: Optional[str]
    created_at: datetime


@dataclass(frozen=True)
class AICostLog:
    id: UUID
    operation_type: str
    model: str
    prompt_tokens: int
    candidate_tokens: int
    estimated_cost_usd: float
    created_at: datetime