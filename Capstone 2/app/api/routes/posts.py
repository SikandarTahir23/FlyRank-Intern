from fastapi import APIRouter, Depends, HTTPException, status
from app.api.schemas.posts import PostCreate, PostResponse
from app.api.deps import get_post_repo, get_embedding_service
from app.repositories.post_repo import PostRepository
from app.core.embedding import EmbeddingService

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    post_repo: PostRepository = Depends(get_post_repo),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
):
    post = await post_repo.create(
        post_data.title,
        post_data.content,
        post_data.target_subject,
        post_data.target_category,
    )
    await embedding_service.generate_post_embedding(post.id)
    return post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    post_repo: PostRepository = Depends(get_post_repo),
):
    post = await post_repo.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("", response_model=list[PostResponse])
async def list_posts(
    limit: int = 50,
    post_repo: PostRepository = Depends(get_post_repo),
):
    return await post_repo.list_all(limit)