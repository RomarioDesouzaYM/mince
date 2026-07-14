from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth, require_role

router = APIRouter(prefix="/districts", tags=["districts"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[schemas.DistrictOut])
def list_districts(db: Session = Depends(get_db)):
    return crud.list_districts(db)


@router.patch(
    "/{district_id}/kondisi-jalan",
    response_model=schemas.DistrictOut,
    dependencies=[Depends(require_role("ketua_tim", "kepala_bps"))],
)
def update_kondisi_jalan(
    district_id: int,
    payload: schemas.KondisiJalanUpdate,
    db: Session = Depends(get_db),
):
    district = crud.update_kondisi_jalan(db, district_id, payload.kondisi_jalan)
    if district is None:
        raise HTTPException(status_code=404, detail="Distrik tidak ditemukan")
    return district


@router.get("/{district_id}/route", response_model=schemas.RouteOut)
def get_district_route(district_id: int, db: Session = Depends(get_db)):
    district = crud.get_district(db, district_id)
    if district is None:
        raise HTTPException(status_code=404, detail="Distrik tidak ditemukan")
    return crud.get_or_fetch_district_route(db, district)
