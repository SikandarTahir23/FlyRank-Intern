"""
Probe 3: Confidence Cutoff
Verify that low-confidence images (< 0.75) are flagged and rejected.
"""
from app.core.guard import MismatchGuard


def run_probe_3():
    guard = MismatchGuard()

    # Test: high similarity but low confidence
    result = guard.evaluate(
        post_subject="red fox",
        post_category="fox",
        candidate_subject="red fox",
        candidate_category="fox",
        candidate_confidence=0.70,  # Below 0.75 threshold
        similarity_score=0.90,
    )

    return {
        "probe": "confidence_cutoff",
        "passed": result.verdict == "rejected" and result.rejection_reason == "low_confidence",
        "details": f"Verdict: {result.verdict}, Reason: {result.rejection_reason}",
    }


if __name__ == "__main__":
    print(run_probe_3())