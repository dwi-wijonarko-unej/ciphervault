from backend.routers.activity import router as activity_router
from backend.routers.admin import router as admin_router
from backend.routers.api_key import router as api_key_router
from backend.routers.auth import router as auth_router
from backend.routers.download import router as download_router
from backend.routers.files import router as files_router
from backend.routers.public_link import router as public_link_router
from backend.routers.share import router as share_router
from backend.routers.system import router as system_router
from backend.routers.upload import router as upload_router

__all__ = [
    "activity_router",
    "admin_router",
    "api_key_router",
    "auth_router",
    "download_router",
    "files_router",
    "public_link_router",
    "share_router",
    "system_router",
    "upload_router",
]
