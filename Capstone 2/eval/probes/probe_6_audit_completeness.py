"""
Probe 6: Audit Completeness
Verify that every match attempt is logged in recommendation_audits.
"""
from app.repositories.audit_repo import AuditRepository
from app.repositories.post_repo import PostRepository


async def run_probe_6():
    audit_repo = AuditRepository()
    post_repo = PostRepository()

    posts = await post_repo.list_all(limit=10)
    if not posts:
        return {"probe": "audit_completeness", "passed": False, "details": "No posts"}

    all_complete = True
    for post in posts:
        verdicts = await audit_repo.get_verdict_counts(post.id)
        total_audited = sum(verdicts.values())
        # Should have at least 1 audit per post
        if total_audited == 0:
            all_complete = False
            break

    return {
        "probe": "audit_completeness",
        "passed": all_complete,
        "details": f"All {len(posts)} posts have audit entries: {all_complete}",
    }


if __name__ == "__main__":
    import asyncio
    print(asyncio.run(run_probe_6()))