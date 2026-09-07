from fastapi import APIRouter, Depends, HTTPException
from app.api.schemas.posts import RecommendationResponse, CandidateImage
from app.api.deps import get_matching_service, get_embedding_service, get_guard, get_post_repo, get_audit_repo, get_image_repo
from app.core.matching import MatchingService
from app.core.embedding import EmbeddingService
from app.core.guard import MismatchGuard
from app.repositories.post_repo import PostRepository
from app.repositories.audit_repo import AuditRepository
from app.repositories.image_repo import ImageRepository

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{post_id}", response_model=RecommendationResponse)
async def get_recommendation(
    post_id: str,
    matching: MatchingService = Depends(get_matching_service),
    embedding: EmbeddingService = Depends(get_embedding_service),
    guard: MismatchGuard = Depends(get_guard),
    post_repo: PostRepository = Depends(get_post_repo),
    audit_repo: AuditRepository = Depends(get_audit_repo),
    image_repo: ImageRepository = Depends(get_image_repo),
):
    post = await post_repo.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post_embedding = await embedding.get_post_embedding(post.id)
    if not post_embedding:
        raise HTTPException(status_code=400, detail="Post embedding not found")

    candidates = await matching.find_all_candidates(post_embedding, top_k=20)

    candidates_evaluated = 0
    for candidate_meta, score in candidates:
        candidates_evaluated += 1
        result = guard.evaluate(
            post_subject=post.target_subject,
            post_category=post.target_category,
            candidate_subject=candidate_meta.subject,
            candidate_category=candidate_meta.category,
            candidate_confidence=candidate_meta.confidence,
            similarity_score=score,
        )

        await audit_repo.log(
            post_id=post.id,
            candidate_image_id=candidate_meta.image_id,
            similarity_score=score,
            guard_verdict=result.verdict,
            rejection_reason=result.rejection_reason,
        )

        if result.verdict == "accepted":
            return RecommendationResponse(
                post_id=post.id,
                recommendation=CandidateImage(
                    image_id=candidate_meta.image_id,
                    subject=candidate_meta.subject,
                    category=candidate_meta.category,
                    confidence=candidate_meta.confidence,
                    similarity_score=score,
                ),
                guard_verdict="accepted",
                rejection_reason=None,
                candidates_evaluated=candidates_evaluated,
            )

    return RecommendationResponse(
        post_id=post.id,
        recommendation=None,
        guard_verdict="no_match",
        rejection_reason="no_candidate_cleared_guard",
        candidates_evaluated=candidates_evaluated,
    )