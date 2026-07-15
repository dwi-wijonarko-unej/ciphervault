from __future__ import annotations

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    def save(self, filename: str, data: bytes) -> str:
        raise NotImplementedError

    @abstractmethod
    def read(self, filename: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, filename: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def exists(self, filename: str) -> bool:
        raise NotImplementedError
