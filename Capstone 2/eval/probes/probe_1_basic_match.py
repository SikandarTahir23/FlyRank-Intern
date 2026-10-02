"""
Probe 1: Basic Match
Verify that a valid post with a correct image in the corpus returns the expected image as Top-1.
"""
import asyncio
from uuid import UUID
from app.core.eval import EvaluationRunner
from app.repositories.post_repo import PostRepository


async def run_probe_1():
    runner = EvaluationRunner()
    post_repo = PostRepository()

    # Find a test case with a known good match
    posts = await post_repo.list_all(limit=10)
    if not posts:
        return {"probe": "basic_match", "passed": False, "details": "No posts in database"}

    # Use first post as test
    post = posts[0]
    expected_id = UUID("00000000-0000-0000-0000-000000000001")  # placeholder

    result = await runner.run_single(post, expected_id)

    return {
        "probe": "basic_match",
        "passed": result.passed,
        "details": f"Expected: {expected_id}, Got: {result.predicted_image_id}, Verdict: {result.guard_verdict}",
    }


if __name__ == "__main__":
    print(asyncio.run(run_probe_1()))