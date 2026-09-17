from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth, require_role

router = APIRouter(prefix="/kamtibmas", tags=["kamtibmas"], dependencies=[Depends(require_auth)])

ADVISORY_ROLES = ("ketua_tim", "kepala_bps")


@router.get("/laporan", response_model=list[schemas.ReportOut])
def get_kamtibmas_laporan(db: Session = Depends(get_db)):
    return crud.list_kamtibmas_laporan(db)


@router.get("/berita", response_model=list[schemas.NewsOut])
def get_kamtibmas_berita(db: Session = Depends(get_db)):
    return crud.list_kamtibmas_berita(db)


@router.get("/advisory", response_model=schemas.KamtibmasAdvisoryOut)
def get_kamtibmas_advisory(db: Session = Depends(get_db)):
    return crud.get_kamtibmas_advisory(db)


@router.put(
    "/advisory", response_model=schemas.KamtibmasAdvisoryOut,
    dependencies=[Depends(require_role(*ADVISORY_ROLES))],
)
def update_kamtibmas_advisory(
    advisory_in: schemas.KamtibmasAdvisoryUpdate,
    db: Session = Depends(get_db),
    claims: dict = Depends(require_auth),
):
    return crud.upsert_kamtibmas_advisory(db, advisory_in, updated_by=claims["sub"])
