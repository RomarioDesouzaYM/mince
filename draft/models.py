"""
models.py — MINCE SQLAlchemy tables (REFERENCE DRAFT for checking the agent's output)

Four tables, matching what draft/scheduler.py and draft/seed.py assume:

  District          MANUAL   — jarak / waktu tempuh / jenis_akses are human-maintained
  Report            MANUAL   — field reports from Organik & Mitra
  News              AUTO     — filled only by the scheduler (RSS); never entered by hand
  WeatherSnapshot   AUTO     — filled only by the scheduler (Open-Meteo)

Design choices kept deliberately simple for the MVP:
  - Option lists (kategori, urgensi, status, peran, jenis_akses) are stored as plain
    strings with the allowed values documented in comments. No DB-level enums, so the
    frontend/backend can evolve the lists without a migration.
  - `date` on Report is an ISO string (seed.py writes `...isoformat()`); created_at /
    updated_at are real DateTimes.
  - WeatherSnapshot uses distrik_id as its primary key (one current snapshot per distrik),
    which is what scheduler.py's `db.get(WeatherSnapshot, d.id)` + `db.merge(...)` expects.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, Float, String, Text, DateTime, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# -- Allowed values (documentation; enforced in the API/schemas, not the DB) ---
CATEGORIES = [
    "Transportasi & Akses Jalan",
    "Cuaca & Bencana Alam",
    "Jaringan Komunikasi",
    "Listrik & Penerangan",
    "Logistik & Sarana",
    "Keamanan & Sosial",
    "Kegiatan Lapangan",
    "Berita & Informasi Lain",
]
URGENCY = ["Rendah", "Sedang", "Tinggi", "Kritis"]
STATUS = ["Baru", "Dipantau", "Ditindaklanjuti", "Selesai"]
ROLES = ["Pegawai Organik", "Mitra", "Admin"]
JENIS_AKSES = ["darat_baik", "darat_sulit", "udara"]
NEWS_KATEGORI = ["Keamanan", "Bencana", "Cuaca", "Umum"]


class District(Base):
    """Distrik reference data. jarak / waktu tempuh / akses are MANUAL (human ground-truth)."""
    __tablename__ = "districts"
    __table_args__ = (
        UniqueConstraint("kabupaten", "distrik", name="uq_kabupaten_distrik"),
    )

    id = Column(Integer, primary_key=True, index=True)
    kabupaten = Column(String, nullable=False, index=True)   # Jayawijaya / Yalimo / Mamberamo Tengah
    distrik = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # --- MANUAL fields ---
    jarak_dari_wamena_km = Column(Float, nullable=True)          # real road/field distance
    estimasi_waktu_tempuh_jam = Column(Float, nullable=True)     # null when jenis_akses == "udara"
    jenis_akses = Column(String, default="darat_baik")          # see JENIS_AKSES
    keterangan_akses = Column(String, default="")

    weather = relationship(
        "WeatherSnapshot", back_populates="district",
        uselist=False, cascade="all, delete-orphan",
    )


class Report(Base):
    """Field report — MANUAL, submitted by Pegawai Organik / Mitra / Admin."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)                       # ISO date string
    kabupaten = Column(String, nullable=False, index=True)
    distrik = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)       # see CATEGORIES
    urgency = Column(String, nullable=False, index=True)        # see URGENCY
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    source = Column(String, default="")
    submitted_by_role = Column(String, default="Pegawai Organik")  # see ROLES
    bukti_dukung_url = Column(String, default="")               # Google Drive link; NO file upload
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="Baru", index=True)         # see STATUS
    follow_up_note = Column(Text, default="")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class News(Base):
    """Berita — AUTO. Populated only by scheduler.ingest_news(). Headline + summary + link only."""
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    tanggal = Column(String, nullable=True)                     # publish date from the feed
    judul = Column(String, nullable=False)
    ringkasan = Column(Text, default="")                        # feed's own summary, trimmed
    kategori = Column(String, default="Umum", index=True)       # see NEWS_KATEGORI
    sumber = Column(String, default="")                         # feed title, e.g. "ANTARA News Papua"
    url = Column(String, nullable=False, unique=True, index=True)  # dedupe key
    kabupaten_terkait = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=_utcnow)


class WeatherSnapshot(Base):
    """Cuaca — AUTO. One current snapshot per distrik, upserted by scheduler.ingest_weather()."""
    __tablename__ = "weather_snapshots"

    distrik_id = Column(Integer, ForeignKey("districts.id"), primary_key=True)
    suhu = Column(Float, nullable=True)                         # current temperature_2m
    kondisi = Column(String, nullable=True)                     # mapped weather_code label
    besok_min = Column(Float, nullable=True)
    besok_max = Column(Float, nullable=True)
    besok_kondisi = Column(String, nullable=True)
    peluang_hujan = Column(Integer, nullable=True)              # precipitation_probability_max
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    district = relationship("District", back_populates="weather")
