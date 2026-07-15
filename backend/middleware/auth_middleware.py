from backend.utils.token import TokenDecodeError, decode_access_token
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except TokenDecodeError as exc:
        raise credentials_error from exc

    subject = payload.get("sub")
    if subject is None:
        raise credentials_error

    user = db.query(User).filter(User.id == int(subject)).first()
    if not user:
        raise credentials_error

    return user
