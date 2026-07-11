from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas


# --- Reports ---------------------------------------------------------------

def create_report(db: Session, report_in: schemas.ReportCreate) -> models.Report:
    report = models.Report(**report_in.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_report(db: Session, report_id: int) -> Optional[models.Report]:
    return db.get(models.Report, report_id)


def list_reports(
    db: Session,
    kabupaten: Optional[str] = None,
    distrik: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    status: Optional[str] = None,
    submitted_by_role: Optional[str] = None,
) -> list[models.Report]:
    query = db.query(models.Report)
    if kabupaten:
        query = query.filter(models.Report.kabupaten == kabupaten)
    if distrik:
        query = query.filter(models.Report.distrik == distrik)
    if category:
        query = query.filter(models.Report.category == category)
    if urgency:
        query = query.filter(models.Report.urgency == urgency)
    if status:
        query = query.filter(models.Report.status == status)
    if submitted_by_role:
        query = query.filter(models.Report.submitted_by_role == submitted_by_role)
    return query.order_by(models.Report.created_at.desc()).all()


def update_report(
    db: Session, report_id: int, report_in: schemas.ReportUpdate
) -> Optional[models.Report]:
    report = db.get(models.Report, report_id)
    if report is None:
        return None
    for field, value in report_in.model_dump(exclude_unset=True).items():
        setattr(report, field, value)
    db.commit()
    db.refresh(report)
    return report


def delete_report(db: Session, report_id: int) -> bool:
    report = db.get(models.Report, report_id)
    if report is None:
        return False
    db.delete(report)
    db.commit()
    return True


# --- Dashboard ---------------------------------------------------------------

def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    total = db.query(models.Report).count()
    baru = db.query(models.Report).filter(models.Report.status == "Baru").count()
    tinggi_kritis = (
        db.query(models.Report)
        .filter(models.Report.urgency.in_(["Tinggi", "Kritis"]))
        .count()
    )
    belum_selesai = (
        db.query(models.Report).filter(models.Report.status != "Selesai").count()
    )

    kategori_dominan = (
        db.query(models.Report.category, func.count(models.Report.id).label("n"))
        .group_by(models.Report.category)
        .order_by(func.count(models.Report.id).desc())
        .first()
    )
    distrik_terbanyak = (
        db.query(models.Report.distrik, func.count(models.Report.id).label("n"))
        .group_by(models.Report.distrik)
        .order_by(func.count(models.Report.id).desc())
        .first()
    )

    return schemas.DashboardStats(
        total=total,
        baru=baru,
        tinggi_kritis=tinggi_kritis,
        belum_selesai=belum_selesai,
        kategori_dominan=kategori_dominan[0] if kategori_dominan else None,
        distrik_terbanyak=distrik_terbanyak[0] if distrik_terbanyak else None,
    )


# --- Districts ---------------------------------------------------------------

def list_districts(db: Session) -> list[models.District]:
    return db.query(models.District).order_by(models.District.kabupaten, models.District.distrik).all()


def get_district(db: Session, district_id: int) -> Optional[models.District]:
    return db.get(models.District, district_id)


# --- District edit proposals (MANUAL, approval-gated) -------------------------

def create_district_proposal(
    db: Session, district_id: int, proposal_in: schemas.DistrictEditProposalCreate,
    proposed_by: str,
) -> Optional[models.DistrictEditProposal]:
    if db.get(models.District, district_id) is None:
        return None
    proposal = models.DistrictEditProposal(
        district_id=district_id, proposed_by=proposed_by,
        **proposal_in.model_dump(),
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


def list_district_proposals(
    db: Session, status: Optional[str] = None,
) -> list[models.DistrictEditProposal]:
    query = db.query(models.DistrictEditProposal)
    if status:
        query = query.filter(models.DistrictEditProposal.status == status)
    return query.order_by(models.DistrictEditProposal.created_at.desc()).all()


def get_district_proposal(db: Session, proposal_id: int) -> Optional[models.DistrictEditProposal]:
    return db.get(models.DistrictEditProposal, proposal_id)


def decide_district_proposal(
    db: Session, proposal: models.DistrictEditProposal, approve: bool, decided_by: str,
) -> models.DistrictEditProposal:
    proposal.status = "Disetujui" if approve else "Ditolak"
    proposal.approved_by = decided_by
    proposal.decided_at = datetime.now(timezone.utc)
    if approve:
        district = db.get(models.District, proposal.district_id)
        district.jarak_dari_wamena_km = proposal.jarak_dari_wamena_km
        district.estimasi_waktu_tempuh_jam = proposal.estimasi_waktu_tempuh_jam
        district.jenis_akses = proposal.jenis_akses
        district.keterangan_akses = proposal.keterangan_akses
    db.commit()
    db.refresh(proposal)
    return proposal


# --- News (AUTO — scheduler-populated only) -----------------------------------

def list_news(
    db: Session,
    kategori: Optional[str] = None,
    kabupaten: Optional[str] = None,
) -> list[models.News]:
    query = db.query(models.News)
    if kategori:
        query = query.filter(models.News.kategori == kategori)
    if kabupaten:
        query = query.filter(models.News.kabupaten_terkait == kabupaten)
    return query.order_by(models.News.created_at.desc()).all()
