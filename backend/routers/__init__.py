from backend.routers.activity import router as activity_router
from backend.routers.auth import router as auth_router
from backend.routers.files import router as files_router
from backend.routers.system import router as system_router
from backend.routers.upload import router as upload_router

__all__ = [
    "activity_router",
    "auth_router",
    "files_router",
    "system_router",
    "upload_router",
]
