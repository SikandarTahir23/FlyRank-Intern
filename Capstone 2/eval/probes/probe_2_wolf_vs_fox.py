"""
Probe 2: Wolf vs Fox Rejection
Verify that a wolf image is rejected for a red fox post with explicit reason.
"""
from app.core.guard import MismatchGuard


def run_probe_2():
    guard = MismatchGuard()

    # Test: red fox post, wolf candidate
    result = guard.evaluate(
        post_subject="red fox",
        post_category="fox",
        candidate_subject="gray wolf",
        candidate_category="wolf",
        candidate_confidence=0.95,
        similarity_score=0.85,
    )

    expected_reason = "species_conflict:gray wolf_for_red fox"

    return {
        "probe": "wolf_vs_fox",
        "passed": result.verdict == "rejected" and result.rejection_reason == expected_reason,
        "details": f"Verdict: {result.verdict}, Reason: {result.rejection_reason}, Expected: {expected_reason}",
    }


if __name__ == "__main__":
    print(run_probe_2())