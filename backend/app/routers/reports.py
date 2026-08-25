from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import WRITE_ROLES, require_auth, require_role

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[schemas.ReportOut])
def list_reports(
    kabupaten: Optional[str] = None,
    distrik: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    status: Optional[str] = None,
    submitted_by_role: Optional[str] = None,
    kegiatan: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.list_reports(
        db,
        kabupaten=kabupaten,
        distrik=distrik,
        category=category,
        urgency=urgency,
        status=status,
        submitted_by_role=submitted_by_role,
        kegiatan=kegiatan,
    )


@router.post(
    "", response_model=schemas.ReportOut, status_code=201,
    dependencies=[Depends(require_role(*WRITE_ROLES))],
)
def create_report(report_in: schemas.ReportCreate, db: Session = Depends(get_db)):
    return crud.create_report(db, report_in)


@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = crud.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    return report


@router.put(
    "/{report_id}", response_model=schemas.ReportOut,
    dependencies=[Depends(require_role(*WRITE_ROLES))],
)
def update_report(report_id: int, report_in: schemas.ReportUpdate, db: Session = Depends(get_db)):
    report = crud.update_report(db, report_id, report_in)
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    return report


@router.delete(
    "/{report_id}", status_code=204,
    dependencies=[Depends(require_role(*WRITE_ROLES))],
)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    if not crud.delete_report(db, report_id):
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
