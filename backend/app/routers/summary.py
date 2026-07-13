from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/summary", tags=["summary"], dependencies=[Depends(require_auth)])


@router.get("/daily", response_model=schemas.DailySummaryOut)
def daily_summary(db: Session = Depends(get_db)):
    return crud.get_daily_summary(db)
