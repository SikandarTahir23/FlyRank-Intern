from pydantic import BaseModel, Field, field_validator
from typing import Annotated


class VisionOutput(BaseModel):
    subject: Annotated[str, Field(min_length=1, max_length=100)]
    category: Annotated[str, Field(min_length=1, max_length=50)]
    attributes: Annotated[list[Annotated[str, Field(min_length=1)]], Field(min_length=1, max_length=20)]
    caption: Annotated[str, Field(min_length=10, max_length=500)]
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]

    @field_validator('subject', 'category')
    @classmethod
    def lowercase_strip(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator('attributes')
    @classmethod
    def normalize_attrs(cls, v: list[str]) -> list[str]:
        return [a.strip().lower() for a in v if a.strip()]

    model_config = {"extra": "forbid", "frozen": True}


CONFIDENCE_FLAG_THRESHOLD = 0.75


def is_flagged(confidence: float) -> bool:
    return confidence < CONFIDENCE_FLAG_THRESHOLD