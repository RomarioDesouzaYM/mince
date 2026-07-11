from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import require_auth, require_role

router = APIRouter(prefix="/districts", tags=["district-proposals"])


@router.post(
    "/{district_id}/proposals",
    response_model=schemas.DistrictEditProposalOut,
    dependencies=[Depends(require_auth)],
)
def create_proposal(
    district_id: int,
    proposal_in: schemas.DistrictEditProposalCreate,
    claims: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    proposal = crud.create_district_proposal(db, district_id, proposal_in, claims["sub"])
    if proposal is None:
        raise HTTPException(status_code=404, detail="Distrik tidak ditemukan")
    return proposal


@router.get(
    "/proposals",
    response_model=list[schemas.DistrictEditProposalOut],
    dependencies=[Depends(require_role("ketua_tim", "kepala_bps"))],
)
def list_proposals(status: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.list_district_proposals(db, status)


@router.post(
    "/proposals/{proposal_id}/approve",
    response_model=schemas.DistrictEditProposalOut,
)
def approve_proposal(
    proposal_id: int,
    claims: dict = Depends(require_role("ketua_tim", "kepala_bps")),
    db: Session = Depends(get_db),
):
    proposal = crud.get_district_proposal(db, proposal_id)
    if proposal is None:
        raise HTTPException(status_code=404, detail="Usulan tidak ditemukan")
    if proposal.status != "Menunggu":
        raise HTTPException(status_code=409, detail="Usulan sudah diputuskan")
    return crud.decide_district_proposal(db, proposal, approve=True, decided_by=claims["sub"])


@router.post(
    "/proposals/{proposal_id}/reject",
    response_model=schemas.DistrictEditProposalOut,
)
def reject_proposal(
    proposal_id: int,
    claims: dict = Depends(require_role("ketua_tim", "kepala_bps")),
    db: Session = Depends(get_db),
):
    proposal = crud.get_district_proposal(db, proposal_id)
    if proposal is None:
        raise HTTPException(status_code=404, detail="Usulan tidak ditemukan")
    if proposal.status != "Menunggu":
        raise HTTPException(status_code=409, detail="Usulan sudah diputuskan")
    return crud.decide_district_proposal(db, proposal, approve=False, decided_by=claims["sub"])
