from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.routers.auth import WRITE_ROLES, require_auth, require_role

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_auth)])

# Hard cap while streaming, before we know image (5MB) vs. PDF (8MB) from content --
# bounds worst-case memory to this regardless of what a client claims/sends.
MAX_UPLOAD_BYTES = max(crud.MAX_IMAGE_BYTES, crud.MAX_PDF_BYTES)


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


@router.post(
    "/bukti-dukung/upload", response_model=schemas.BuktiDukungUploadOut,
    dependencies=[Depends(require_role(*WRITE_ROLES))],
)
async def upload_bukti_dukung(file: UploadFile = File(...)):
    total = 0
    chunks = []
    while chunk := await file.read(1024 * 1024):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File melebihi batas ukuran maksimum")
        chunks.append(chunk)
    data = b"".join(chunks)

    try:
        stored_filename = crud.save_bukti_dukung_upload(data)
    except crud.BuktiDukungTooLarge as e:
        raise HTTPException(status_code=413, detail=str(e))
    except crud.UnsupportedBuktiDukungType as e:
        raise HTTPException(status_code=422, detail=str(e))

    return schemas.BuktiDukungUploadOut(filename=stored_filename)


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
