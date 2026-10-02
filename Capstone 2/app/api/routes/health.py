from fastapi import APIRouter, Depends
from app.repositories.base import DatabasePool

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/ready")
async def ready():
    try:
        async with DatabasePool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503