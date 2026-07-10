from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

Category = Literal[
    "Transportasi & Akses Jalan", "Cuaca & Bencana Alam", "Jaringan Komunikasi",
    "Listrik & Penerangan", "Logistik & Sarana", "Keamanan & Sosial",
    "Kegiatan Lapangan", "Berita & Informasi Lain",
]
Urgency = Literal["Rendah", "Sedang", "Tinggi", "Kritis"]
Status = Literal["Baru", "Dipantau", "Ditindaklanjuti", "Selesai"]
Role = Literal["Pegawai Organik", "Mitra", "Admin"]
JenisAkses = Literal["darat_baik", "darat_sulit", "udara"]


class ReportBase(BaseModel):
    date: str
    kabupaten: str
    distrik: str
    category: Category
    urgency: Urgency
    title: str
    description: str = ""
    source: str = ""
    submitted_by_role: Role = "Pegawai Organik"
    bukti_dukung_url: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Status = "Baru"
    follow_up_note: str = ""


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    date: Optional[str] = None
    kabupaten: Optional[str] = None
    distrik: Optional[str] = None
    category: Optional[Category] = None
    urgency: Optional[Urgency] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    submitted_by_role: Optional[Role] = None
    bukti_dukung_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[Status] = None
    follow_up_note: Optional[str] = None


class ReportOut(ReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DistrictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kabupaten: str
    distrik: str
    latitude: float
    longitude: float
    jarak_dari_wamena_km: Optional[float] = None
    estimasi_waktu_tempuh_jam: Optional[float] = None
    jenis_akses: JenisAkses = "darat_baik"
    keterangan_akses: str = ""


class DistrictUpdate(BaseModel):
    jarak_dari_wamena_km: Optional[float] = None
    estimasi_waktu_tempuh_jam: Optional[float] = None
    jenis_akses: Optional[JenisAkses] = None
    keterangan_akses: Optional[str] = None


class DashboardStats(BaseModel):
    total: int
    baru: int
    tinggi_kritis: int
    belum_selesai: int
    kategori_dominan: Optional[str] = None
    distrik_terbanyak: Optional[str] = None
