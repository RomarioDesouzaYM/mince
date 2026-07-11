from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/districts", tags=["districts"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[schemas.DistrictOut])
def list_districts(db: Session = Depends(get_db)):
    return crud.list_districts(db)
