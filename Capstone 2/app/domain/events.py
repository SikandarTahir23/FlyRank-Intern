from dataclasses import dataclass
from datetime import datetime
from uuid import UUID
from typing import Optional


@dataclass(frozen=True)
class DomainEvent:
    occurred_at: datetime


@dataclass(frozen=True)
class ImageIngested(DomainEvent):
    image_id: UUID
    file_path: str
    subject: str
    category: str
    confidence: float
    is_flagged: bool


@dataclass(frozen=True)
class EmbeddingGenerated(DomainEvent):
    entity_type: str
    entity_id: UUID
    model_name: str
    dimension: int


@dataclass(frozen=True)
class MatchComputed(DomainEvent):
    post_id: UUID
    candidate_image_id: UUID
    similarity_score: float


@dataclass(frozen=True)
class GuardRejected(DomainEvent):
    post_id: UUID
    candidate_image_id: UUID
    rejection_reason: str
    similarity_score: float


@dataclass(frozen=True)
class GuardAccepted(DomainEvent):
    post_id: UUID
    candidate_image_id: UUID
    similarity_score: float


@dataclass(frozen=True)
class NoMatchFound(DomainEvent):
    post_id: UUID
    candidates_evaluated: int


@dataclass(frozen=True)
class CostLogged(DomainEvent):
    operation_type: str
    model: str
    prompt_tokens: int
    candidate_tokens: int
    estimated_cost_usd: float