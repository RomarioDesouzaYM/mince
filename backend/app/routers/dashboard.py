from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_auth)])


@router.get("/stats", response_model=schemas.DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)
