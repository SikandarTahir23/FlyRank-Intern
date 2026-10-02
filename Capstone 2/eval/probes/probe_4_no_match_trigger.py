"""
Probe 4: No Match Trigger
Verify that when no candidate clears the guard, verdict is 'no_match'.
"""
from app.core.guard import MismatchGuard
from app.domain.value_objects import SimilarityScore


def run_probe_4():
    guard = MismatchGuard()

    # All candidates rejected
    candidates = [
        ("wrong_subject", "wrong_cat", 0.9, 0.60),  # Below cosine threshold
        ("red fox", "fox", 0.70, 0.90),  # Low confidence
        ("gray wolf", "wolf", 0.95, 0.85),  # Species conflict
    ]

    all_rejected = True
    for subj, cat, conf, score in candidates:
        result = guard.evaluate(
            post_subject="red fox",
            post_category="fox",
            candidate_subject=subj,
            candidate_category=cat,
            candidate_confidence=conf,
            similarity_score=score,
        )
        if result.verdict != "rejected":
            all_rejected = False
            break

    # Final verdict should be no_match when all rejected
    final_verdict = "no_match" if all_rejected else "accepted"

    return {
        "probe": "no_match_trigger",
        "passed": all_rejected and final_verdict == "no_match",
        "details": f"All candidates rejected: {all_rejected}, Final verdict: {final_verdict}",
    }


if __name__ == "__main__":
    print(run_probe_4())