from app.api.routes.images import router as images_router
from app.api.routes.posts import router as posts_router
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.eval import router as eval_router
from app.api.routes.health import router as health_router

__all__ = [
    "images_router",
    "posts_router",
    "recommendations_router",
    "eval_router",
    "health_router",
]