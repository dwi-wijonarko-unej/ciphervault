from typing import Any

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
    status_code: int


class SuccessResponse(BaseModel):
    message: str
    data: Any | None = None
