from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import get_settings
from app.repositories.base import DatabasePool
from app.api.routes import (
    images_router,
    posts_router,
    recommendations_router,
    eval_router,
    health_router,
)
from app.utils.logging import configure_logging
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(get_settings().log_level)
    try:
        await DatabasePool.initialize()
        logger.info("Database pool initialized")
    except Exception as e:
        logger.warning(f"Database connection failed (running in degraded mode): {e}")
    yield
    try:
        await DatabasePool.close()
    except Exception:
        pass


app = FastAPI(
    title="AI Image Understanding & Content Matching Engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(images_router)
app.include_router(posts_router)
app.include_router(recommendations_router)
app.include_router(eval_router)