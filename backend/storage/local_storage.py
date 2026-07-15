from __future__ import annotations

from pathlib import Path

from backend.storage.base import StorageBackend

from backend.config import get_settings

settings = get_settings()


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_path: str | None = None):
        self.base_path = Path(base_path or settings.storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _path(self, filename: str) -> Path:
        return self.base_path / filename

    def save(self, filename: str, data: bytes) -> str:
        path = self._path(filename)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return filename

    def read(self, filename: str) -> bytes:
        return self._path(filename).read_bytes()

    def delete(self, filename: str) -> None:
        path = self._path(filename)
        if path.exists():
            path.unlink()

    def exists(self, filename: str) -> bool:
        return self._path(filename).exists()
