from typing import Optional

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
