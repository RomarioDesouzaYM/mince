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

# One shared operational account (unchanged) plus named approval-role accounts, each
# via its own .env pair — not a user table, not registration. Anyone on the shared
# account can propose a district-data edit; only ketua_tim/kepala_bps can approve
# or reject one (see require_role, used only on the approval endpoints).
#
# Ketua Tim is 5 distinct team leads (Sosial, Distribusi, Neraca, Umum, Pengolahan),
# each a separate named account so approve/reject records the specific person, not
# just "a ketua tim" — all 5 carry the same `role: "ketua_tim"` claim (identical
# approval permission), but `sub` is always the actual username, which is what
# DistrictEditProposal.approved_by stores. Kepala BPS stays a single account.
ROLE_ACCOUNTS = [
    ("operator", "MINCE_USER", "MINCE_PASSWORD"),
    ("ketua_tim", "KETUA_SOSIAL_USER", "KETUA_SOSIAL_PASSWORD"),
    ("ketua_tim", "KETUA_DISTRIBUSI_USER", "KETUA_DISTRIBUSI_PASSWORD"),
    ("ketua_tim", "KETUA_NERACA_USER", "KETUA_NERACA_PASSWORD"),
    ("ketua_tim", "KETUA_UMUM_USER", "KETUA_UMUM_PASSWORD"),
    ("ketua_tim", "KETUA_PENGOLAHAN_USER", "KETUA_PENGOLAHAN_PASSWORD"),
    ("kepala_bps", "KEPALA_BPS_USER", "KEPALA_BPS_PASSWORD"),
]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _match_role(username: str, password: str):
    for role, user_var, pass_var in ROLE_ACCOUNTS:
        if username == os.getenv(user_var) and password == os.getenv(pass_var):
            return role
    return None


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    role = _match_role(payload.username, payload.password)
    if role is None:
        raise HTTPException(status_code=401, detail="Username atau password salah")

    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    token = jwt.encode(
        {"sub": payload.username, "role": role, "exp": expire},
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


def require_role(*roles: str):
    """Dependency factory: like require_auth, but also requires the token's `role`
    claim to be one of `roles`. Used only on the district-edit approval endpoints —
    every other route keeps using plain require_auth, unaffected."""
    def dependency(claims: dict = Depends(require_auth)):
        if claims.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Tidak memiliki izin untuk aksi ini")
        return claims
    return dependency
