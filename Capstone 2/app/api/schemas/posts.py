from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    target_subject: str = Field(..., min_length=1, max_length=100)
    target_category: str = Field(..., min_length=1, max_length=50)


class PostResponse(BaseModel):
    id: UUID
    title: str
    content: str
    target_subject: str
    target_category: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CandidateImage(BaseModel):
    image_id: UUID
    subject: str
    category: str
    confidence: float
    similarity_score: float


class RecommendationResponse(BaseModel):
    post_id: UUID
    recommendation: Optional[CandidateImage] = None
    guard_verdict: str
    rejection_reason: Optional[str] = None
    candidates_evaluated: int