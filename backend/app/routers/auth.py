import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer()

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    if (
        payload.username != os.getenv("MINCE_USER")
        or payload.password != os.getenv("MINCE_PASSWORD")
    ):
        raise HTTPException(status_code=401, detail="Username atau password salah")

    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    token = jwt.encode(
        {"sub": payload.username, "exp": expire},
        os.getenv("JWT_SECRET"),
        algorithm=JWT_ALGORITHM,
    )
    return TokenResponse(access_token=token)


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        return jwt.decode(
            credentials.credentials, os.getenv("JWT_SECRET"), algorithms=[JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid atau kedaluwarsa")
