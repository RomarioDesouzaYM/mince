from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.models import KEGIATAN
from app.routers.auth import require_auth, require_role

router = APIRouter(prefix="/sampel-target", tags=["sampel-target"], dependencies=[Depends(require_auth)])


@router.get("/kegiatan-terakhir", response_model=schemas.LatestKegiatanOut)
def get_latest_kegiatan(db: Session = Depends(get_db)):
    return schemas.LatestKegiatanOut(kegiatan=crud.get_latest_imported_kegiatan(db))


@router.post("/import", response_model=schemas.SampelImportSummaryOut)
async def import_sampel_target(
    file: UploadFile = File(...),
    kegiatan: str = Form(...),
    db: Session = Depends(get_db),
):
    if kegiatan not in KEGIATAN:
        raise HTTPException(status_code=422, detail=f"kegiatan tidak dikenal: {kegiatan}")
    csv_bytes = await file.read()
    return crud.import_sampel_target(db, csv_bytes, kegiatan)


@router.put(
    "/realisasi",
    response_model=schemas.RealisasiOut,
    dependencies=[Depends(require_role("ketua_tim", "kepala_bps"))],
)
def update_realisasi(
    realisasi_in: schemas.RealisasiUpdate,
    db: Session = Depends(get_db),
    claims: dict = Depends(require_auth),
):
    return crud.upsert_realisasi(db, realisasi_in, updated_by=claims["sub"])


@router.put(
    "/target-override",
    response_model=schemas.TargetOverrideOut,
    dependencies=[Depends(require_role("ketua_tim", "kepala_bps"))],
)
def update_target_override(
    override_in: schemas.TargetOverrideUpdate,
    db: Session = Depends(get_db),
    claims: dict = Depends(require_auth),
):
    return crud.upsert_target_override(db, override_in, updated_by=claims["sub"])


@router.get("/summary", response_model=list[schemas.SampelSummaryRowOut])
def get_sampel_summary(kegiatan: str, db: Session = Depends(get_db)):
    return crud.get_sampel_summary(db, kegiatan)
