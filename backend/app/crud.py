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


def update_district(
    db: Session, district_id: int, district_in: schemas.DistrictUpdate
) -> Optional[models.District]:
    district = db.get(models.District, district_id)
    if district is None:
        return None
    for field, value in district_in.model_dump(exclude_unset=True).items():
        setattr(district, field, value)
    db.commit()
    db.refresh(district)
    return district


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
