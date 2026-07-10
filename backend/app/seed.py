"""
seed.py — MINCE demo data.

Seeds districts across Jayawijaya, Yalimo, Mamberamo Tengah with MANUAL jarak /
waktu tempuh / jenis_akses, plus a spread of demo reports (incl. Jaringan +
Listrik categories) so the dashboard and reports table have something to show.

IMPORTANT: coordinates and jarak/waktu values below are APPROXIMATE seed
placeholders. Because jarak & waktu tempuh are manual by design, replace them
with real field values before the demo. They are marked "verify".

Run: python -m app.seed
"""

from datetime import datetime, timedelta, timezone
import random

from app.database import SessionLocal, Base, engine
from app.models import District, Report

random.seed(7)

# jenis_akses: darat_baik | darat_sulit | udara
# jarak_km / waktu_jam are MANUAL estimates (verify against ground truth).
DISTRICTS = [
    # Jayawijaya (Wamena is the reference point / capital)
    ("Jayawijaya", "Wamena Kota",  -4.0917, 138.9500,   0.0, 0.0, "darat_baik",  "Pusat, referensi jarak"),
    ("Jayawijaya", "Kurulu",       -4.0300, 138.9700,   8.0, 0.5, "darat_baik",  "Akses jalan baik"),
    ("Jayawijaya", "Asologaima",   -4.1200, 138.7800,  32.0, 1.5, "darat_sulit", "Jalan berbukit, musiman"),
    ("Jayawijaya", "Bolakme",      -3.9800, 138.8300,  40.0, 2.0, "darat_sulit", "Sebagian rusak saat hujan"),
    ("Jayawijaya", "Musatfak",     -4.1500, 139.0500,  28.0, 1.5, "darat_sulit", "verify"),

    # Yalimo (capital Elelim)
    ("Yalimo", "Elelim",           -3.9600, 139.4300,  70.0, 3.0, "darat_sulit", "Ibukota kabupaten"),
    ("Yalimo", "Abenaho",          -3.9200, 139.3800,  85.0, 4.0, "darat_sulit", "verify"),
    ("Yalimo", "Apalapsili",       -4.0100, 139.5200,  95.0, None, "udara",      "Sebagian akses udara"),
    ("Yalimo", "Welarek",          -4.0500, 139.5800, 110.0, None, "udara",      "Akses udara"),

    # Mamberamo Tengah (capital Kobakma)
    ("Mamberamo Tengah", "Kobakma", -3.6800, 138.7000, 130.0, None, "udara",     "Ibukota, akses udara"),
    ("Mamberamo Tengah", "Kelila",  -3.7300, 138.7500, 120.0, None, "udara",     "Akses udara"),
    ("Mamberamo Tengah", "Eragayam",-3.7800, 138.6500, 140.0, None, "udara",     "verify"),
    ("Mamberamo Tengah", "Ilugwa",  -3.7000, 138.8000, 125.0, None, "udara",     "verify"),
]

CATEGORIES = [
    "Transportasi & Akses Jalan", "Cuaca & Bencana Alam", "Jaringan Komunikasi",
    "Listrik & Penerangan", "Logistik & Sarana", "Keamanan & Sosial",
    "Kegiatan Lapangan", "Berita & Informasi Lain",
]
URGENCY = ["Rendah", "Sedang", "Tinggi", "Kritis"]
STATUS = ["Baru", "Dipantau", "Ditindaklanjuti", "Selesai"]
ROLES = ["Pegawai Organik", "Mitra", "Admin"]

SAMPLE_TITLES = {
    "Transportasi & Akses Jalan": "Jalan tergerus longsor menuju distrik",
    "Cuaca & Bencana Alam": "Hujan deras dan kabut tebal sejak pagi",
    "Jaringan Komunikasi": "Sinyal seluler hilang beberapa hari",
    "Listrik & Penerangan": "Pemadaman listrik memengaruhi kegiatan malam",
    "Logistik & Sarana": "Pasokan logistik survei tertunda",
    "Keamanan & Sosial": "Situasi keamanan perlu dipantau",
    "Kegiatan Lapangan": "Pendataan lapangan berjalan sesuai jadwal",
    "Berita & Informasi Lain": "Informasi umum dari lapangan",
}


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # wipe demo tables (do NOT do this in prod with real data)
        db.query(Report).delete()
        db.query(District).delete()
        db.commit()

        district_rows = []
        for kab, dist, lat, lng, jarak, waktu, akses, ket in DISTRICTS:
            d = District(
                kabupaten=kab, distrik=dist, latitude=lat, longitude=lng,
                jarak_dari_wamena_km=jarak, estimasi_waktu_tempuh_jam=waktu,
                jenis_akses=akses, keterangan_akses=ket,
            )
            db.add(d)
            district_rows.append(d)
        db.commit()

        now = datetime.now(timezone.utc)
        # ensure coverage of jaringan + listrik, then fill to ~25
        forced = ["Jaringan Komunikasi", "Jaringan Komunikasi",
                  "Listrik & Penerangan", "Listrik & Penerangan",
                  "Listrik & Penerangan"]
        total = 26
        for i in range(total):
            d = random.choice(district_rows)
            cat = forced[i] if i < len(forced) else random.choice(CATEGORIES)
            urg = random.choice(URGENCY)
            report = Report(
                date=(now - timedelta(days=random.randint(0, 14))).date().isoformat(),
                kabupaten=d.kabupaten,
                distrik=d.distrik,
                category=cat,
                urgency=urg,
                title=SAMPLE_TITLES.get(cat, "Laporan lapangan"),
                description=f"{SAMPLE_TITLES.get(cat, 'Laporan')} di {d.distrik}.",
                source="Laporan lapangan",
                submitted_by_role=random.choice(ROLES),
                bukti_dukung_url="" if random.random() < 0.5
                                 else "https://drive.google.com/file/d/DEMO/view",
                latitude=d.latitude + random.uniform(-0.03, 0.03),
                longitude=d.longitude + random.uniform(-0.03, 0.03),
                status=random.choice(STATUS),
                follow_up_note="",
                created_at=now,
                updated_at=now,
            )
            db.add(report)
        db.commit()
        print(f"Seeded {len(district_rows)} districts and {total} reports.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
