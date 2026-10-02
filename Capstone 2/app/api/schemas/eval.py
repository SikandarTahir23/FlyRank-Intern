from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class EvalRequest(BaseModel):
    dataset_path: str = Field(default="data/eval_set.yaml")


class ProbeResult(BaseModel):
    probe_name: str
    passed: bool
    details: str


class EvalResult(BaseModel):
    total_posts: int
    top1_precision: float
    guard_accuracy: float
    no_match_rate: float
    probe_results: list[ProbeResult]