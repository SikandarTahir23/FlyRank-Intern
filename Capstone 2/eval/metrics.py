from dataclasses import dataclass
from typing import Any


@dataclass
class EvaluationMetrics:
    total_posts: int
    top1_precision: float
    guard_accuracy: float
    no_match_rate: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float


def compute_metrics(results: list[dict[str, Any]]) -> EvaluationMetrics:
    total = len(results)
    if total == 0:
        return EvaluationMetrics(0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    correct = sum(1 for r in results if r.get("passed", False))
    no_match = sum(1 for r in results if r.get("guard_verdict") == "no_match")
    accepted = sum(1 for r in results if r.get("guard_verdict") == "accepted")
    rejected = sum(1 for r in results if r.get("guard_verdict") == "rejected")

    latencies = [r.get("latency_ms", 0) for r in results]
    latencies.sort()

    return EvaluationMetrics(
        total_posts=total,
        top1_precision=correct / total,
        guard_accuracy=(accepted + rejected) / total if total > 0 else 0.0,
        no_match_rate=no_match / total,
        avg_latency_ms=sum(latencies) / total,
        p50_latency_ms=latencies[total // 2],
        p95_latency_ms=latencies[int(total * 0.95)],
    )