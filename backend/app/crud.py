from collections import Counter
import csv
from datetime import datetime, timedelta, timezone
import io
import logging
import math
import os
import re
import uuid
from typing import Optional

import httpx
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app import models, schemas

log = logging.getLogger("mince.crud")

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_IMAGE_BYTES = 5 * 1024 * 1024   # 5MB, pre-compression
MAX_PDF_BYTES = 8 * 1024 * 1024     # 8MB, stored as-is
IMAGE_MAX_DIMENSION = 1600          # longer edge, px
IMAGE_JPEG_QUALITY = 82


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
    kegiatan: Optional[str] = None,
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
    if kegiatan:
        query = query.filter(models.Report.kegiatan == kegiatan)
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


# --- Bukti dukung upload (Report.bukti_dukung_file) ---------------------------
# Content-sniffed, size-capped, randomized-filename save to UPLOAD_DIR. Router-agnostic
# (raises plain ValueError subclasses so routers/reports.py maps them to the right HTTP
# status) to match this file's existing convention of never importing fastapi.

class BuktiDukungTooLarge(ValueError):
    pass


class UnsupportedBuktiDukungType(ValueError):
    pass


def save_bukti_dukung_upload(data: bytes) -> str:
    """Validates by content (never by extension/Content-Type), strips a filename down to
    a random server-generated one, and for images re-encodes (resize + re-save) which
    unconditionally drops EXIF/GPS as a side effect of the decode-re-encode itself.
    Returns the stored filename (never the original)."""
    is_pdf = data.startswith(b"%PDF-")
    if is_pdf:
        if len(data) > MAX_PDF_BYTES:
            raise BuktiDukungTooLarge(f"PDF melebihi batas {MAX_PDF_BYTES // (1024 * 1024)}MB")
        stored_name = f"{uuid.uuid4().hex}.pdf"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as f:
            f.write(data)
        return stored_name

    if len(data) > MAX_IMAGE_BYTES:
        raise BuktiDukungTooLarge(f"Gambar melebihi batas {MAX_IMAGE_BYTES // (1024 * 1024)}MB")
    try:
        probe = Image.open(io.BytesIO(data))
        probe.verify()  # raises if not a real, undamaged image
        image = Image.open(io.BytesIO(data))  # verify() leaves the handle unusable; reopen
        image.load()
    except (UnidentifiedImageError, OSError):
        raise UnsupportedBuktiDukungType(
            "Tipe file tidak didukung — hanya JPG/PNG/WEBP atau PDF"
        )

    image = ImageOps.exif_transpose(image)  # apply EXIF orientation before EXIF is dropped
    image = image.convert("RGB")  # drops alpha/palette modes JPEG can't hold; also drops EXIF
    image.thumbnail((IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION), Image.LANCZOS)

    stored_name = f"{uuid.uuid4().hex}.jpg"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    image.save(
        os.path.join(UPLOAD_DIR, stored_name), format="JPEG",
        quality=IMAGE_JPEG_QUALITY, optimize=True,
    )  # no exif= kwarg passed -- output carries no EXIF block at all
    return stored_name


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


def update_kondisi_jalan(db: Session, district_id: int, kondisi_jalan: str) -> Optional[models.District]:
    district = db.get(models.District, district_id)
    if district is None:
        return None
    district.kondisi_jalan = kondisi_jalan
    db.commit()
    db.refresh(district)
    return district


# --- Route (ORS-backed, cached in DistrictRoute after the first lookup) ------

SNAP_DISTANCE_THRESHOLD_KM = 2.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _fetch_ors_route(db: Session, district: models.District) -> dict:
    """Returns a dict shaped for DistrictRoute, plus an internal '_cacheable' flag
    (True for a real route or a confirmed no-reliable-road-data verdict, False for a
    transient provider error that should be retried on the next request instead)."""
    origin = (
        db.query(models.District)
        .filter(models.District.kabupaten == "Jayawijaya", models.District.distrik == "Wamena Kota")
        .first()
    )
    if origin is None:
        origin_lat, origin_lng = -4.0917, 138.9500  # defensive fallback, should never trigger
    else:
        origin_lat, origin_lng = origin.latitude, origin.longitude

    try:
        r = httpx.get(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            headers={"Authorization": os.getenv("ORS_API_KEY")},
            params={
                "start": f"{origin_lng},{origin_lat}",
                "end": f"{district.longitude},{district.latitude}",
            },
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        coords = data["features"][0]["geometry"]["coordinates"]  # [[lon, lat], ...]
        segment = data["features"][0]["properties"]["segments"][0]
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            # ORS's own routing engine found no route at all between these points --
            # the same durable "not really reachable by road" verdict the snap-distance
            # check below exists to catch, just signaled directly instead of computed
            # from geometry. Cacheable, same as a failed snap-distance check.
            log.info("ORS found no route for %s (404) -- no_reliable_road_data", district.distrik)
            return {
                "available": False, "reason": "no_reliable_road_data", "geometry": None,
                "distance_km": None, "duration_min": None, "_cacheable": True,
            }
        log.warning("ORS route fetch failed for %s: %s", district.distrik, e)
        return {
            "available": False, "reason": "provider_error", "geometry": None,
            "distance_km": None, "duration_min": None, "_cacheable": False,
        }
    except Exception as e:  # noqa: BLE001
        log.warning("ORS route fetch failed for %s: %s", district.distrik, e)
        return {
            "available": False, "reason": "provider_error", "geometry": None,
            "distance_km": None, "duration_min": None, "_cacheable": False,
        }

    route_end_lng, route_end_lat = coords[-1]
    snap_km = _haversine_km(district.latitude, district.longitude, route_end_lat, route_end_lng)
    if snap_km > SNAP_DISTANCE_THRESHOLD_KM:
        return {
            "available": False, "reason": "no_reliable_road_data", "geometry": None,
            "distance_km": None, "duration_min": None, "_cacheable": True,
        }

    return {
        "available": True,
        "reason": None,
        "geometry": [[lat, lon] for lon, lat in coords],
        "distance_km": round(segment["distance"] / 1000, 1),
        "duration_min": round(segment["duration"] / 60, 1),
        "_cacheable": True,
    }


def get_or_fetch_district_route(db: Session, district: models.District) -> dict:
    cached = db.get(models.DistrictRoute, district.id)
    if cached is not None:
        return {
            "available": cached.available,
            "reason": cached.reason,
            "geometry": cached.geometry,
            "distance_km": cached.distance_km,
            "duration_min": cached.duration_min,
        }

    if district.jenis_akses == "udara":
        result = {
            "available": False, "reason": "udara", "geometry": None,
            "distance_km": None, "duration_min": None, "_cacheable": True,
        }
    else:
        result = _fetch_ors_route(db, district)

    if result.pop("_cacheable"):
        db.add(models.DistrictRoute(
            distrik_id=district.id,
            available=result["available"],
            reason=result["reason"],
            geometry=result["geometry"],
            distance_km=result["distance_km"],
            duration_min=result["duration_min"],
            checked_at=datetime.now(timezone.utc),
        ))
        db.commit()

    return result


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


def get_district_risk_list(
    db: Session,
    kabupaten: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    status: Optional[str] = None,
    submitted_by_role: Optional[str] = None,
    kegiatan: Optional[str] = None,
) -> list[dict]:
    districts = db.query(models.District).order_by(
        models.District.kabupaten, models.District.distrik
    ).all()
    query = db.query(models.Report)
    if kabupaten:
        query = query.filter(models.Report.kabupaten == kabupaten)
    if category:
        query = query.filter(models.Report.category == category)
    if urgency:
        query = query.filter(models.Report.urgency == urgency)
    if status:
        query = query.filter(models.Report.status == status)
    if submitted_by_role:
        query = query.filter(models.Report.submitted_by_role == submitted_by_role)
    if kegiatan:
        query = query.filter(models.Report.kegiatan == kegiatan)
    reports = query.all()

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


# --- Sample-target import (MANUAL, uploaded from a Fasih CSV export) ---------

KABUPATEN_PREFIXES = {
    "9702": "Jayawijaya",
    "9705": "Mamberamo Tengah",
    "9706": "Yalimo",
}
_DISTRIK_NAME_RE = re.compile(r"^\[\d+\]\s*(.+)$")
_DUMMY = "DUMMY"


def _parse_sampel_row(row: dict, district_lookup: dict[tuple[str, str], models.District]):
    """Returns (SampelTarget field dict, None) on success, or (None, skip_reason)."""
    full_code = (row.get("fullCode") or "").strip()
    kabupaten = KABUPATEN_PREFIXES.get(full_code[:4])
    if kabupaten is None:
        return None, f"kode kabupaten tidak dikenal: {full_code[:4] or full_code}"

    raw_name = (row.get("name") or "").strip()
    m = _DISTRIK_NAME_RE.match(raw_name)
    distrik_raw = (m.group(1) if m else raw_name).strip()
    district = district_lookup.get((kabupaten, distrik_raw.upper()))
    if district is None:
        return None, f"__unmatched_distrik__:{raw_name}"

    data5 = (row.get("data5") or "").strip()
    data2 = (row.get("data2") or "").strip()
    parts = [p for p in (data5, data2) if p and p != _DUMMY]
    alamat = ", ".join(parts) if parts else None

    return {
        "kabupaten": kabupaten,
        "distrik": district.distrik,
        "petugas_email": (row.get("currentUserUsername") or "").strip(),
        "alamat": alamat,
        "_full_code": full_code,
    }, None


def get_latest_imported_kegiatan(db: Session) -> Optional[str]:
    """Kegiatan of the most recently imported SampelTarget row, for defaulting the
    frontend's kegiatan selector to data that actually exists instead of the first
    entry in the static KEGIATAN list."""
    row = (
        db.query(models.SampelTarget.kegiatan)
        .order_by(models.SampelTarget.created_at.desc())
        .first()
    )
    return row[0] if row else None


def import_sampel_target(db: Session, csv_bytes: bytes, kegiatan: str) -> schemas.SampelImportSummaryOut:
    districts = list_districts(db)
    district_lookup = {(d.kabupaten, d.distrik.upper()): d for d in districts}

    reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    rows_total = 0
    imported = 0
    skipped_reasons: Counter = Counter()
    unmatched_distrik: set[str] = set()
    occurrence: Counter = Counter()

    for row in reader:
        rows_total += 1
        parsed, reason = _parse_sampel_row(row, district_lookup)
        if reason is not None:
            if reason.startswith("__unmatched_distrik__:"):
                unmatched_distrik.add(reason.split(":", 1)[1])
                skipped_reasons["distrik tidak dikenal"] += 1
            else:
                skipped_reasons[reason] += 1
            continue

        full_code = parsed.pop("_full_code")
        occurrence[full_code] += 1
        kode_sampel = f"{full_code}-{occurrence[full_code]:02d}"

        if db.query(models.SampelTarget).filter(
            models.SampelTarget.kode_sampel == kode_sampel
        ).first() is not None:
            skipped_reasons[f"kode_sampel sudah ada: {kode_sampel}"] += 1
            continue

        db.add(models.SampelTarget(kegiatan=kegiatan, kode_sampel=kode_sampel, **parsed))
        imported += 1

    db.commit()

    return schemas.SampelImportSummaryOut(
        kegiatan=kegiatan,
        rows_total=rows_total,
        imported=imported,
        skipped=rows_total - imported,
        skipped_reasons=dict(skipped_reasons),
        unmatched_distrik=sorted(unmatched_distrik),
    )


# --- Realisasi (MANUAL, ketua tim, independent of SampelTarget rows) ---------

def upsert_realisasi(
    db: Session, realisasi_in: schemas.RealisasiUpdate, updated_by: str,
) -> models.RealisasiTarget:
    realisasi = (
        db.query(models.RealisasiTarget)
        .filter(
            models.RealisasiTarget.kegiatan == realisasi_in.kegiatan,
            models.RealisasiTarget.kabupaten == realisasi_in.kabupaten,
            models.RealisasiTarget.distrik == realisasi_in.distrik,
        )
        .first()
    )
    if realisasi is None:
        realisasi = models.RealisasiTarget(
            kegiatan=realisasi_in.kegiatan,
            kabupaten=realisasi_in.kabupaten,
            distrik=realisasi_in.distrik,
        )
        db.add(realisasi)
    realisasi.jumlah_realisasi = realisasi_in.jumlah_realisasi
    realisasi.updated_by = updated_by
    db.commit()
    db.refresh(realisasi)
    return realisasi


def upsert_target_override(
    db: Session, override_in: schemas.TargetOverrideUpdate, updated_by: str,
) -> models.TargetOverride:
    override = (
        db.query(models.TargetOverride)
        .filter(
            models.TargetOverride.kegiatan == override_in.kegiatan,
            models.TargetOverride.kabupaten == override_in.kabupaten,
            models.TargetOverride.distrik == override_in.distrik,
        )
        .first()
    )
    if override is None:
        override = models.TargetOverride(
            kegiatan=override_in.kegiatan,
            kabupaten=override_in.kabupaten,
            distrik=override_in.distrik,
        )
        db.add(override)
    override.jumlah_target = override_in.jumlah_target
    override.updated_by = updated_by
    db.commit()
    db.refresh(override)
    return override


# --- Target vs realisasi summary, with a PROVISIONAL delay flag --------------
# Placeholder thresholds pending confirmation against real distrik behavior.
# Reuses News/WeatherSnapshot/District data but is a separate computation from
# status_perhatian and must never feed into it (weather/travel time stay
# context-only per the roadmap).
DELAY_KEAMANAN_WINDOW_DAYS = 7
DELAY_KONDISI_JALAN_BURUK = {"rusak sedang", "rusak berat"}
DELAY_CURAH_HUJAN_THRESHOLD_MM = 8
DELAY_URGENT_URGENCY_LEVELS = {"Sedang", "Tinggi", "Kritis"}

AID_VERB_PATTERN = re.compile(
    r"\b(?:bantu|membantu|menyumbang|salurkan bantuan|kirim bantuan|peduli)\b",
    re.IGNORECASE,
)
AID_SOURCE_PROXIMITY_CHARS = 60


def _is_aid_source_only_mention(text: str, place_name: str) -> bool:
    """True if EVERY occurrence of `place_name` in `text` sits within
    AID_SOURCE_PROXIMITY_CHARS of an aid-giving verb -- suggesting the place is the
    SOURCE of aid, not the site of the event (e.g. "Umat Muslim Jayawijaya bantu
    korban gempa NTT": Jayawijaya is where the helpers are from, NTT is where the
    earthquake was). False (don't suppress) if the name isn't in the text at all, or
    if at least one occurrence has no aid verb nearby -- e.g. "Banjir landa
    Jayawijaya, warga butuh bantuan" would NOT be suppressed, since "Jayawijaya"
    there isn't adjacent to a giving-verb, it's the affected site.

    Keyword-proximity, not sentence parsing -- catches "[place] [aid verb] [someone
    elsewhere]" landing within the window, nothing structurally deeper (a longer
    sentence, or a giving-verb outside this fixed list, won't be caught)."""
    spans = [
        m.span() for m in re.compile(rf"\b{re.escape(place_name)}\b", re.IGNORECASE).finditer(text)
    ]
    if not spans:
        return False
    verb_spans = [m.span() for m in AID_VERB_PATTERN.finditer(text)]
    if not verb_spans:
        return False
    return all(
        any(max(p_start - v_end, v_start - p_end, 0) <= AID_SOURCE_PROXIMITY_CHARS
            for v_start, v_end in verb_spans)
        for p_start, p_end in spans
    )


def _news_matches_by_district(
    db: Session, districts: list[models.District], kategori_set: set[str], window_days: int,
) -> dict[tuple[str, str], list[models.News]]:
    """Maps (kabupaten, distrik) -> matched News rows whose kategori is in
    `kategori_set`, from the last `window_days` days. Distrik-name
    match wins first (a news item naming a specific distrik only flags that distrik).
    An item naming no specific distrik falls back to kabupaten_terkait, so it still
    counts toward every distrik in that kabupaten. An item with neither a named
    distrik nor a kabupaten_terkait tag is NOT attributed to anyone -- untagged items
    are frequently about unrelated regencies (Timika, Nabire, etc.), so treating
    "no tag" as "matches every kabupaten" was the bug this replaces. A distrik or
    kabupaten mention that's purely an aid-giving source (see
    _is_aid_source_only_mention) is excluded too -- and does NOT fall through to the
    kabupaten-level fallback, since that would just widen a suppressed false
    attribution instead of removing it."""
    name_pattern = {
        d.distrik: re.compile(rf"\b{re.escape(d.distrik)}\b", re.IGNORECASE)
        for d in districts
    }
    by_kabupaten: dict[str, list[models.District]] = {}
    for d in districts:
        by_kabupaten.setdefault(d.kabupaten, []).append(d)

    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    recent = (
        db.query(models.News)
        .filter(
            models.News.kategori.in_(kategori_set),
            models.News.created_at >= since,
            # Delay-flag / Berita Penting stay grounded in verified sources only -- any
            # future sumber_terverifikasi=False source (e.g. Google News, deferred/not yet
            # implemented) would have no fact-check pass behind it and must never itself
            # trigger a data-collection delay signal. See Kamtibmas's Berita view
            # (list_kamtibmas_berita) for where such a source would be surfaced instead.
            models.News.sumber_terverifikasi.is_(True),
        )
        .all()
    )

    matches: dict[tuple[str, str], list[models.News]] = {}
    for n in recent:
        text = f"{n.judul} {n.ringkasan}"
        raw_matched = [d for d in districts if name_pattern[d.distrik].search(text)]
        if raw_matched:
            matched = [d for d in raw_matched if not _is_aid_source_only_mention(text, d.distrik)]
            for d in matched:
                matches.setdefault((d.kabupaten, d.distrik), []).append(n)
        elif n.kabupaten_terkait and not _is_aid_source_only_mention(text, n.kabupaten_terkait):
            for d in by_kabupaten.get(n.kabupaten_terkait, []):
                matches.setdefault((d.kabupaten, d.distrik), []).append(n)
    return matches


def _jaringan_delay_reasons_by_district(
    db: Session, districts: list[models.District],
) -> dict[tuple[str, str], list[str]]:
    """Maps (kabupaten, distrik) -> titles of unresolved Jaringan Komunikasi reports
    from the last DELAY_KEAMANAN_WINDOW_DAYS days. Unlike News, Report carries an
    explicit non-nullable distrik column, so this is a direct lookup -- no
    name-matching or kabupaten-level fallback is needed here."""
    since = datetime.now(timezone.utc) - timedelta(days=DELAY_KEAMANAN_WINDOW_DAYS)
    recent_jaringan = (
        db.query(models.Report)
        .filter(
            models.Report.category == JARINGAN_CATEGORY,
            models.Report.created_at >= since,
            models.Report.status != "Selesai",
        )
        .all()
    )
    reasons: dict[tuple[str, str], list[str]] = {}
    for r in recent_jaringan:
        reasons.setdefault((r.kabupaten, r.distrik), []).append(
            r.title or "Laporan gangguan jaringan belum selesai"
        )
    return reasons


def _urgent_report_reasons_by_district(
    db: Session, districts: list[models.District],
) -> dict[tuple[str, str], list[str]]:
    """Maps (kabupaten, distrik) -> descriptions of unresolved, urgensi Sedang+
    reports. Excludes Jaringan Komunikasi -- that category already has its own
    signal above (_jaringan_delay_reasons_by_district) which flags EVERY unresolved
    jaringan report regardless of urgency, so including it here could only ever
    produce a redundant duplicate reason for a report already flagged, never catch
    anything new.

    Deliberately NO time window, unlike the News-backed checks above: a News
    article's relevance decays with age, but an open Kritis report doesn't stop
    being a real problem after 7 days -- if anything a report that's stayed
    unresolved the longest is exactly the one that most needs surfacing. Relevance
    here is governed by status, not age, so this persists until the report is
    actually marked Selesai.

    Same direct-lookup reasoning as jaringan: Report.distrik is non-nullable, so no
    name-matching or kabupaten-level fallback is needed."""
    recent_urgent = (
        db.query(models.Report)
        .filter(
            models.Report.category != JARINGAN_CATEGORY,
            models.Report.urgency.in_(DELAY_URGENT_URGENCY_LEVELS),
            models.Report.status != "Selesai",
        )
        .all()
    )
    reasons: dict[tuple[str, str], list[str]] = {}
    for r in recent_urgent:
        reasons.setdefault((r.kabupaten, r.distrik), []).append(
            f"Kemungkinan pendataan terhambat: {r.title} (urgensi {r.urgency})"
        )
    return reasons


def get_sampel_summary(db: Session, kegiatan: str) -> list[schemas.SampelSummaryRowOut]:
    districts = list_districts(db)

    target_counts = {
        (kab, dist): n
        for kab, dist, n in (
            db.query(models.SampelTarget.kabupaten, models.SampelTarget.distrik, func.count())
            .filter(models.SampelTarget.kegiatan == kegiatan)
            .group_by(models.SampelTarget.kabupaten, models.SampelTarget.distrik)
            .all()
        )
    }
    realisasi_rows = (
        db.query(models.RealisasiTarget)
        .filter(models.RealisasiTarget.kegiatan == kegiatan)
        .all()
    )
    realisasi_by_key = {(r.kabupaten, r.distrik): r.jumlah_realisasi for r in realisasi_rows}
    override_by_key = {
        (r.kabupaten, r.distrik): r.jumlah_target
        for r in (
            db.query(models.TargetOverride)
            .filter(models.TargetOverride.kegiatan == kegiatan)
            .all()
        )
    }

    keamanan_matches = _news_matches_by_district(db, districts, {"Keamanan"}, DELAY_KEAMANAN_WINDOW_DAYS)
    berita_penting_matches = _news_matches_by_district(
        db, districts, {"Keamanan", "Bencana"}, DELAY_KEAMANAN_WINDOW_DAYS,
    )
    jaringan_reasons = _jaringan_delay_reasons_by_district(db, districts)
    urgent_report_reasons = _urgent_report_reasons_by_district(db, districts)

    result = []
    for d in districts:
        key = (d.kabupaten, d.distrik)
        csv_target = target_counts.get(key, 0)
        override = override_by_key.get(key)
        target = override if override is not None else csv_target
        target_source = "manual" if override is not None else "csv"
        realisasi = realisasi_by_key.get(key, 0)

        reasons = [n.judul for n in keamanan_matches.get(key, [])]
        reasons.extend(jaringan_reasons.get(key, []))
        reasons.extend(urgent_report_reasons.get(key, []))
        if d.kondisi_jalan in DELAY_KONDISI_JALAN_BURUK:
            reasons.append(f"kondisi_jalan: {d.kondisi_jalan}")
        curah_hujan = d.weather.curah_hujan if d.weather else None
        if curah_hujan is not None and curah_hujan >= DELAY_CURAH_HUJAN_THRESHOLD_MM:
            reasons.append(f"curah hujan tinggi: {curah_hujan}mm")

        berita_penting = [
            schemas.BeritaPentingItemOut(judul=n.judul, kategori=n.kategori, url=n.url, tanggal=n.tanggal)
            for n in berita_penting_matches.get(key, [])
        ]

        result.append(schemas.SampelSummaryRowOut(
            district_id=d.id,
            kabupaten=d.kabupaten,
            distrik=d.distrik,
            target=target,
            target_source=target_source,
            target_csv_count=csv_target,
            realisasi=realisasi,
            kondisi_jalan=d.kondisi_jalan,
            curah_hujan=curah_hujan,
            delay_flag=bool(reasons),
            delay_flag_reasons=reasons,
            berita_penting=berita_penting,
        ))
    return result


# --- Kamtibmas (/kamtibmas -- Laporan keyword filter, Berita verified-sources filter
# (Google News source deferred, not yet implemented), manual advisory banner) ---------

# Narrows Report's "Keamanan & Sosial" bucket to actual security/order reports for the
# Kamtibmas page only -- Report.CATEGORIES has no standalone "Keamanan" value, and adding
# one would mean reclassifying every existing "Keamanan & Sosial" row by hand with no
# reliable automatic way to do it. Biased toward over-inclusion: a false positive (an
# ambiguous report shown on Kamtibmas) costs far less than a false negative (a real
# security report silently missing), so this is a plain substring match with no
# word-boundary or exclusion logic, unlike _is_aid_source_only_mention above.
KAMTIBMAS_KEYWORDS = [
    "kkb", "opm", "keamanan", "penembakan", "pembakaran", "kontak tembak",
    "senjata", "ancaman", "teror", "serangan", "bentrok", "evakuasi",
    "mengungsi", "gangguan keamanan", "situasi keamanan", "papua pegunungan",
    "aparat keamanan",
]


def _is_kamtibmas_relevant(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in KAMTIBMAS_KEYWORDS)


def list_kamtibmas_laporan(db: Session) -> list[models.Report]:
    """Display-only: never writes back to Report.category, never affects /laporan, /peta,
    or the /risiko or /sampel urgent-report signal (_urgent_report_reasons_by_district
    above is category-agnostic already and untouched by this function) -- those all keep
    reading every 'Keamanan & Sosial' report exactly as they do today."""
    reports = (
        db.query(models.Report)
        .filter(models.Report.category == "Keamanan & Sosial")
        .order_by(models.Report.date.desc(), models.Report.created_at.desc())
        .all()
    )
    return [r for r in reports if _is_kamtibmas_relevant(f"{r.title} {r.description}")]


def list_kamtibmas_berita(db: Session) -> list[models.News]:
    """Verified-source Keamanan items, plus every sumber_terverifikasi=False item
    regardless of its own computed kategori -- reserved for a future Google News source
    (deferred, not yet implemented). No rows currently have sumber_terverifikasi=False,
    so that branch is dormant until that source ships."""
    return (
        db.query(models.News)
        .filter(
            or_(
                and_(models.News.kategori == "Keamanan", models.News.sumber_terverifikasi.is_(True)),
                models.News.sumber_terverifikasi.is_(False),
            )
        )
        .order_by(models.News.created_at.desc())
        .all()
    )


def get_kamtibmas_advisory(db: Session) -> models.KamtibmasAdvisory:
    """Singleton row, created with defaults on first read so KamtibmasAdvisoryOut's
    updated_at never has to be Optional just to cover the not-set-yet case."""
    advisory = db.get(models.KamtibmasAdvisory, 1)
    if advisory is None:
        advisory = models.KamtibmasAdvisory(id=1)
        db.add(advisory)
        db.commit()
        db.refresh(advisory)
    return advisory


def upsert_kamtibmas_advisory(
    db: Session, advisory_in: schemas.KamtibmasAdvisoryUpdate, updated_by: str,
) -> models.KamtibmasAdvisory:
    advisory = get_kamtibmas_advisory(db)
    advisory.text = advisory_in.text
    advisory.severity = advisory_in.severity
    advisory.updated_by = updated_by
    db.commit()
    db.refresh(advisory)
    return advisory
