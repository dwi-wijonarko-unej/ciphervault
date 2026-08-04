from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import User
from backend.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyListItem,
    ApiKeyListResponse,
    ApiKeyResponse,
)
from backend.services.api_key_service import ApiKeyService

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("", response_model=ApiKeyResponse)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiKeyResponse:
    """Create a new API key. The plaintext key is returned ONLY here."""
    api_key, raw_key = ApiKeyService.create_key(
        db,
        current_user,
        label=payload.label,
        expires_in_days=payload.expires_in_days,
    )
    return ApiKeyResponse(
        id=api_key.id,
        label=api_key.label,
        key=raw_key,
        key_prefix=api_key.key_prefix,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        expires_at=api_key.expires_at,
    )


@router.get("", response_model=ApiKeyListResponse)
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiKeyListResponse:
    keys = ApiKeyService.list_keys(db, current_user)
    return ApiKeyListResponse(keys=[ApiKeyListItem.model_validate(k) for k in keys])


@router.delete("/{key_id}", status_code=204)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    ApiKeyService.revoke_key(db, current_user, key_id)
