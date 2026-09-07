from fastapi import APIRouter, Depends, HTTPException, status
from app.api.schemas.images import ImageIngestRequest, ImageResponse, ImageDetailResponse
from app.api.deps import get_vision_service, get_image_repo
from app.core.vision import VisionIngestionService
from app.repositories.image_repo import ImageRepository

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/ingest", response_model=ImageDetailResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_image(
    request: ImageIngestRequest,
    vision_service: VisionIngestionService = Depends(get_vision_service),
    image_repo: ImageRepository = Depends(get_image_repo),
):
    image = await image_repo.create(request.file_path)
    try:
        vision_output, flagged = await vision_service.ingest(request.file_path)
        metadata = await image_repo.get_metadata(image.id)
        return ImageDetailResponse(
            id=image.id,
            file_path=image.file_path,
            status=image.status,
            created_at=image.created_at,
            updated_at=image.updated_at,
            metadata=metadata,
        )
    except Exception as e:
        await image_repo.update_status(image.id, "failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{image_id}", response_model=ImageDetailResponse)
async def get_image(
    image_id: str,
    image_repo: ImageRepository = Depends(get_image_repo),
):
    image = await image_repo.get(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    metadata = await image_repo.get_metadata(image.id)
    return ImageDetailResponse(
        id=image.id,
        file_path=image.file_path,
        status=image.status,
        created_at=image.created_at,
        updated_at=image.updated_at,
        metadata=metadata,
    )