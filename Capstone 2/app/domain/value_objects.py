from dataclasses import dataclass
from typing import Self
import math


@dataclass(frozen=True)
class Vector:
    values: list[float]

    def __post_init__(self):
        if not self.values:
            raise ValueError("Vector cannot be empty")
        if not all(isinstance(v, (int, float)) for v in self.values):
            raise ValueError("Vector values must be numeric")

    def to_list(self) -> list[float]:
        return self.values

    def to_pgvector(self) -> str:
        return "[" + ",".join(str(v) for v in self.values) + "]"

    @classmethod
    def from_list(cls, values: list[float]) -> Self:
        return cls(values=values)

    @classmethod
    def from_pgvector(cls, pgvector_str: str) -> Self:
        cleaned = pgvector_str.strip("[]")
        values = [float(v) for v in cleaned.split(",")]
        return cls(values=values)


@dataclass(frozen=True)
class SimilarityScore:
    value: float

    def __post_init__(self):
        if not -1.0 <= self.value <= 1.0:
            raise ValueError("Similarity score must be between -1 and 1")

    def passes_threshold(self, threshold: float) -> bool:
        return self.value >= threshold


@dataclass(frozen=True)
class Confidence:
    value: float

    def __post_init__(self):
        if not 0.0 <= self.value <= 1.0:
            raise ValueError("Confidence must be between 0 and 1")

    def is_flagged(self, threshold: float = 0.75) -> bool:
        return self.value < threshold


@dataclass(frozen=True)
class SubjectLabel:
    value: str

    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("Subject label cannot be empty")
        object.__setattr__(self, "value", self.value.strip().lower())

    def conflicts_with(self, other: Self, conflict_map: dict[str, set[str]]) -> bool:
        return other.value in conflict_map.get(self.value, set())