from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, Integer, Float, JSON, String, Text, DateTime, ForeignKey,
    UniqueConstraint,
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
KONDISI_JALAN = ["baik", "rusak ringan", "rusak sedang", "rusak berat"]
KEGIATAN = [
    "Sensus Ekonomi", "Susenas Maret", "Susenas Agustus", "Sakernas Februari",
    "Sakernas Mei", "Sakernas Agustus", "Sakernas November", "PODES (Potensi Desa)",
    "Seruti Triwulan 1", "Seruti Triwulan 2", "Seruti Triwulan 3", "Seruti Triwulan 4",
    "VHTS", "SHK (Survei Harga Konsumen)", "Desa Cantik", "IMK Tahunan",
    "IMK Triwulanan", "Statpolkam", "KSA", "LPTB", "SKTH", "SKTR", "STPIM",
    "Captive Power", "FIP HORTI", "SKGB", "SKP", "DPA", "DPPD UTL", "SKLNPT",
    "SKTNP", "SKSPPI", "SKNP", "SHKK", "SHPB", "SHP", "SHPJ", "SVPEB", "SHPED",
    "V3", "VPACK", "VRES", "VHTL", "VDTW", "Transportasi Udara", "KSP", "SBH", "NTP",
]


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
    jarak_dari_wamena_km = Column(Float, nullable=True)
    estimasi_waktu_tempuh_jam = Column(Float, nullable=True)  # null when jenis_akses == "udara"
    jenis_akses = Column(String, default="darat_baik")        # see JENIS_AKSES
    keterangan_akses = Column(String, default="")

    # Direct-edit by ketua_tim/kepala_bps only (NOT via DistrictEditProposal) — an
    # observational field (current road condition), not a ground-truth reference
    # correction, so it doesn't need the propose/approve audit trail. NULL = not yet
    # assessed, see KONDISI_JALAN.
    kondisi_jalan = Column(String, nullable=True)

    weather = relationship(
        "WeatherSnapshot", back_populates="district",
        uselist=False, cascade="all, delete-orphan",
    )


class Report(Base):
    """Field report — MANUAL, submitted by Pegawai Organik / Mitra / Admin."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)                     # ISO date string
    kabupaten = Column(String, nullable=False, index=True)
    distrik = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)     # see CATEGORIES
    urgency = Column(String, nullable=False, index=True)       # see URGENCY
    kegiatan = Column(String, nullable=False, index=True)      # see KEGIATAN
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    source = Column(String, default="")
    submitted_by_role = Column(String, default="Pegawai Organik")  # see ROLES
    bukti_dukung_url = Column(String, default="")             # link text; NO file upload
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="Baru", index=True)       # see STATUS
    follow_up_note = Column(Text, default="")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class News(Base):
    """Berita — AUTO. Populated only by scheduler.ingest_news(). Headline + summary + link only."""
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    tanggal = Column(String, nullable=True)                   # publish date from the feed
    judul = Column(String, nullable=False)
    ringkasan = Column(Text, default="")                       # feed's own summary, trimmed
    kategori = Column(String, default="Umum", index=True)      # see NEWS_KATEGORI
    sumber = Column(String, default="")                        # feed title
    url = Column(String, nullable=False, unique=True, index=True)  # dedupe key
    kabupaten_terkait = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=_utcnow)


DISTRICT_EDIT_PROPOSAL_STATUS = ["Menunggu", "Disetujui", "Ditolak"]


class DistrictEditProposal(Base):
    """Proposed change to a District's manual fields — MANUAL, gated by approval.

    Carries full new values for all 4 editable fields (not a sparse diff): simpler
    to display, apply, and reason about than optional per-field patching. Applying
    (on approve) copies these onto the real District row; rejecting just marks the
    proposal decided and leaves District untouched.
    """
    __tablename__ = "district_edit_proposals"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False, index=True)

    jarak_dari_wamena_km = Column(Float, nullable=True)
    estimasi_waktu_tempuh_jam = Column(Float, nullable=True)
    jenis_akses = Column(String, nullable=False)
    keterangan_akses = Column(String, default="")

    alasan = Column(Text, nullable=False)
    bukti_dukung_url = Column(String, default="")

    status = Column(String, default="Menunggu", index=True)  # see DISTRICT_EDIT_PROPOSAL_STATUS
    proposed_by = Column(String, nullable=False)
    approved_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    decided_at = Column(DateTime, nullable=True)

    district = relationship("District")


class WeatherSnapshot(Base):
    """Cuaca — AUTO. One current snapshot per distrik, upserted by scheduler.ingest_weather()."""
    __tablename__ = "weather_snapshots"

    distrik_id = Column(Integer, ForeignKey("districts.id"), primary_key=True)
    suhu = Column(Float, nullable=True)
    kondisi = Column(String, nullable=True)
    besok_min = Column(Float, nullable=True)
    besok_max = Column(Float, nullable=True)
    besok_kondisi = Column(String, nullable=True)
    peluang_hujan = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    district = relationship("District", back_populates="weather")


class DistrictRoute(Base):
    """Rute — AUTO/cached. One route lookup per distrik, cached by
    crud.get_or_fetch_district_route() after the first ORS call so a district's road
    network isn't re-queried on every page view. `available=False, reason="udara"` for
    air-access districts (never queried), `reason="no_reliable_road_data"` when ORS's
    route lands >2km from the district's real coordinates (see SNAP_DISTANCE_THRESHOLD_KM
    in crud.py) — both are durable verdicts and get cached. A transient provider error
    is NOT cached here (retried on the next request instead)."""
    __tablename__ = "district_routes"

    distrik_id = Column(Integer, ForeignKey("districts.id"), primary_key=True)
    available = Column(Boolean, nullable=False)
    reason = Column(String, nullable=True)       # "udara" | "no_reliable_road_data" | None
    geometry = Column(JSON, nullable=True)        # [[lat, lng], ...]
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Float, nullable=True)
    checked_at = Column(DateTime, default=_utcnow)

    district = relationship("District")
