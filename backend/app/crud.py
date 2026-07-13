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


# --- Risk (rule-based status_perhatian, no composite score) ------------------

URGENCY_SCORE = {"Rendah": 1, "Sedang": 2, "Tinggi": 3, "Kritis": 4}
JARINGAN_CATEGORY = "Jaringan Komunikasi"
LISTRIK_CATEGORY = "Listrik & Penerangan"


def _status_perhatian(jumlah_laporan: int, belum_selesai: int, urgensi_rata_rata: float) -> str:
    if belum_selesai >= 3 or urgensi_rata_rata >= 3.5:
        return "Kritis"
    if jumlah_laporan >= 5 or urgensi_rata_rata >= 2.5:
        return "Tinggi"
    if jumlah_laporan >= 2:
        return "Sedang"
    return "Rendah"


def get_district_risk_list(db: Session) -> list[dict]:
    districts = db.query(models.District).order_by(
        models.District.kabupaten, models.District.distrik
    ).all()
    reports = db.query(models.Report).all()

    by_district: dict[tuple[str, str], list[models.Report]] = {}
    for r in reports:
        by_district.setdefault((r.kabupaten, r.distrik), []).append(r)

    result = []
    for d in districts:
        d_reports = by_district.get((d.kabupaten, d.distrik), [])
        jumlah_laporan = len(d_reports)
        belum_selesai = sum(1 for r in d_reports if r.status != "Selesai")
        urgensi_rata_rata = (
            sum(URGENCY_SCORE[r.urgency] for r in d_reports) / jumlah_laporan
            if jumlah_laporan else 0.0
        )
        result.append({
            "district_id": d.id,
            "kabupaten": d.kabupaten,
            "distrik": d.distrik,
            "jumlah_laporan": jumlah_laporan,
            "belum_selesai": belum_selesai,
            "urgensi_rata_rata": round(urgensi_rata_rata, 2),
            "laporan_jaringan": sum(1 for r in d_reports if r.category == JARINGAN_CATEGORY),
            "laporan_listrik": sum(1 for r in d_reports if r.category == LISTRIK_CATEGORY),
            "jarak_dari_wamena_km": d.jarak_dari_wamena_km,
            "estimasi_waktu_tempuh_jam": d.estimasi_waktu_tempuh_jam,
            "jenis_akses": d.jenis_akses,
            "cuaca_saat_ini": d.weather,
            "status_perhatian": _status_perhatian(jumlah_laporan, belum_selesai, urgensi_rata_rata),
        })
    return result


# --- Daily summary (per-kabupaten rollup, no composite score) ----------------

TOP_NEWS_LIMIT = 5
KABUPATEN_ORDER = ["Jayawijaya", "Yalimo", "Mamberamo Tengah"]


def _mean(values: list) -> Optional[float]:
    present = [v for v in values if v is not None]
    return round(sum(present) / len(present), 1) if present else None


def _mode(values: list) -> Optional[str]:
    present = [v for v in values if v]
    if not present:
        return None
    counts: dict[str, int] = {}
    for v in present:
        counts[v] = counts.get(v, 0) + 1
    return max(counts, key=counts.get)


def get_daily_summary(db: Session) -> dict:
    districts = db.query(models.District).all()
    reports = db.query(models.Report).all()

    by_kabupaten: dict[str, list[models.District]] = {}
    for d in districts:
        by_kabupaten.setdefault(d.kabupaten, []).append(d)

    reports_by_kabupaten: dict[str, list[models.Report]] = {}
    for r in reports:
        reports_by_kabupaten.setdefault(r.kabupaten, []).append(r)

    kabupaten_rows = []
    for kab in KABUPATEN_ORDER:
        kab_districts = by_kabupaten.get(kab, [])
        kab_reports = reports_by_kabupaten.get(kab, [])
        kabupaten_rows.append({
            "kabupaten": kab,
            "jarak_rata_rata_km": _mean([d.jarak_dari_wamena_km for d in kab_districts]),
            "waktu_tempuh_rata_rata_jam": _mean([d.estimasi_waktu_tempuh_jam for d in kab_districts]),
            "laporan_jaringan": sum(1 for r in kab_reports if r.category == JARINGAN_CATEGORY),
            "laporan_listrik": sum(1 for r in kab_reports if r.category == LISTRIK_CATEGORY),
            "suhu_rata_rata": _mean([d.weather.suhu for d in kab_districts if d.weather]),
            "kondisi_dominan": _mode([d.weather.kondisi for d in kab_districts if d.weather]),
        })

    berita_terkini = (
        db.query(models.News)
        .order_by(models.News.created_at.desc())
        .limit(TOP_NEWS_LIMIT)
        .all()
    )

    return {
        "generated_at": datetime.now(timezone.utc),
        "kabupaten": kabupaten_rows,
        "berita_terkini": berita_terkini,
    }


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
