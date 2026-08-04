from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.config import get_settings
from backend.crypto.rsa_engine import load_or_create_global_keypair
from backend.database import engine, init_db
from backend.routers import (
    activity_router,
    admin_router,
    api_key_router,
    auth_router,
    download_router,
    files_router,
    public_link_router,
    share_router,
    system_router,
    upload_router,
)
from backend.seeders import run_seeders

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.storage_path).mkdir(parents=True, exist_ok=True)
    Path(settings.rsa_private_key_path).parent.mkdir(parents=True, exist_ok=True)
    init_db()
    run_seeders()
    load_or_create_global_keypair()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(api_key_router)
app.include_router(public_link_router)
app.include_router(upload_router)
app.include_router(files_router)
app.include_router(download_router)
app.include_router(share_router)
app.include_router(system_router)
app.include_router(activity_router)


@app.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="database not ready") from exc

    return {"status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return health_ready()


frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
