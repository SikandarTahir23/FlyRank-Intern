from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ImageIngestRequest(BaseModel):
    file_path: str = Field(..., min_length=1)


class ImageResponse(BaseModel):
    id: UUID
    file_path: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImageMetadataResponse(BaseModel):
    image_id: UUID
    subject: str
    category: str
    attributes: list[str]
    caption: str
    confidence: float
    is_flagged: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImageDetailResponse(ImageResponse):
    metadata: Optional[ImageMetadataResponse] = None