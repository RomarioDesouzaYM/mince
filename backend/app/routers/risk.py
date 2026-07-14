from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth

router = APIRouter(prefix="/risk", tags=["risk"], dependencies=[Depends(require_auth)])


@router.get("/districts", response_model=list[schemas.DistrictRiskOut])
def list_district_risk(
    kabupaten: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    status: Optional[str] = None,
    submitted_by_role: Optional[str] = None,
    kegiatan: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.get_district_risk_list(
        db,
        kabupaten=kabupaten,
        category=category,
        urgency=urgency,
        status=status,
        submitted_by_role=submitted_by_role,
        kegiatan=kegiatan,
    )
