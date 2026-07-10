from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/news", tags=["news"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[schemas.NewsOut])
def list_news(
    kategori: Optional[str] = None,
    kabupaten: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.list_news(db, kategori=kategori, kabupaten=kabupaten)
