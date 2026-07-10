from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/districts", tags=["districts"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[schemas.DistrictOut])
def list_districts(db: Session = Depends(get_db)):
    return crud.list_districts(db)


@router.put("/{district_id}", response_model=schemas.DistrictOut)
def update_district(district_id: int, district_in: schemas.DistrictUpdate, db: Session = Depends(get_db)):
    district = crud.update_district(db, district_id, district_in)
    if district is None:
        raise HTTPException(status_code=404, detail="Distrik tidak ditemukan")
    return district
