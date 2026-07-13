"""
seed.py — MINCE demo data.

Seeds districts across Jayawijaya, Yalimo, Mamberamo Tengah with MANUAL jarak /
waktu tempuh / jenis_akses, plus a spread of demo reports (incl. Jaringan +
Listrik categories) so the dashboard and reports table have something to show.

IMPORTANT: coordinates and jarak/waktu values below are APPROXIMATE seed
placeholders. Because jarak & waktu tempuh are manual by design, replace them
with real field values before the demo. They are marked "verify".

The full 50-distrik roster (Day 5, Part B) was reconciled against BIG's official
kecamatan boundary layer: 40 in Jayawijaya, 5 in Yalimo, 5 in Mamberamo Tengah,
matching verified government/Wikipedia counts exactly. The original 13 rows keep
their Day 1 hand-set values. The ~37 rows added since then use each distrik
polygon's centroid for lat/lng, a Haversine estimate from Wamena Kota for
jarak_dari_wamena_km, and a simple distance-bucket guess for jenis_akses/waktu
(<15km darat_baik, 15-90km darat_sulit, >90km udara) — never ground-truthed,
which is why `keterangan_akses` spells that out explicitly instead of a normal
note. Replace with real field values before the demo, same as the original 13.

Run: python -m app.seed
"""

from datetime import datetime, timedelta, timezone
import random

from app.database import SessionLocal, Base, engine
from app.models import District, News, Report

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

    # Jayawijaya (new, unverified placeholders — see module docstring)
    ("Jayawijaya", "Napua", -4.1208, 138.8894, 7.5, 0.4, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Walaik", -4.1667, 138.7933, 19.3, 1.0, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Wouma", -4.1141, 138.9488, 2.5, 0.1, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Hubikiak", -4.0632, 138.9151, 5.0, 0.3, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Ibele", -4.0552, 138.7342, 24.3, 1.2, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Taelarek", -4.1051, 138.7542, 21.8, 1.1, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Itlay Hisage", -4.0436, 139.1417, 21.9, 1.1, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Siepkosi", -4.0052, 139.0595, 15.5, 0.8, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Usilimo", -3.9134, 138.8832, 21.2, 1.1, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Wita Waya", -4.0189, 138.9190, 8.8, 0.4, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Libarek", -3.9917, 138.9753, 11.5, 0.6, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Wadangku", -3.9365, 138.9796, 17.6, 0.9, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Pisugi", -4.0437, 138.9544, 5.4, 0.3, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Koragi", -3.8659, 138.8027, 30.0, 1.5, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Tagime", -3.8025, 138.7264, 40.6, 2.0, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Molagalome", -3.8499, 138.6934, 39.2, 2.0, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Tagineri", -3.7896, 138.6590, 46.6, 2.3, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Silo Karno Doga", -3.9325, 138.8251, 22.5, 1.1, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Piramid", -3.8893, 138.7488, 31.7, 1.6, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Muliama", -4.0051, 138.7971, 19.5, 1.0, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Bugi", -3.8737, 138.8245, 28.0, 1.4, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Bpiri", -3.8237, 138.8537, 31.7, 1.6, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Welesi", -4.2022, 138.8893, 14.0, 0.7, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Asotipo", -4.1979, 138.9677, 12.0, 0.6, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Maima", -4.1455, 139.0727, 14.9, 0.7, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Popugoba", -4.1095, 139.1530, 22.6, 1.1, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Wame", -3.9248, 138.7469, 29.2, 1.5, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Wesaput", -4.0905, 138.9657, 1.7, 0.1, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Hubikosi", -4.0489, 138.8745, 9.6, 0.5, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Walelagama", -4.0921, 139.0131, 7.0, 0.4, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Wolo", -3.8696, 138.8838, 25.8, 1.3, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Asolokobal", -4.1576, 138.9442, 7.4, 0.4, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Pelebaga", -4.0845, 138.8447, 11.7, 0.6, "darat_baik", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Yalengga", -3.8824, 138.7921, 29.1, 1.5, "darat_sulit", "Estimasi awal, belum diverifikasi"),
    ("Jayawijaya", "Trikora", -4.3319, 138.6910, 39.2, 2.0, "darat_sulit", "Estimasi awal, belum diverifikasi"),

    # Yalimo (capital Elelim)
    ("Yalimo", "Elelim",           -3.9600, 139.4300,  70.0, 3.0, "darat_sulit", "Ibukota kabupaten"),
    ("Yalimo", "Abenaho",          -3.9200, 139.3800,  85.0, 4.0, "darat_sulit", "verify"),
    ("Yalimo", "Apalapsili",       -4.0100, 139.5200,  95.0, None, "udara",      "Sebagian akses udara"),
    ("Yalimo", "Welarek",          -4.0500, 139.5800, 110.0, None, "udara",      "Akses udara"),
    ("Yalimo", "Benawa", -3.6824, 139.8077, 105.5, None, "udara", "Estimasi awal, belum diverifikasi"),

    # Mamberamo Tengah (capital Kobakma)
    ("Mamberamo Tengah", "Kobakma", -3.6800, 138.7000, 130.0, None, "udara",     "Ibukota, akses udara"),
    ("Mamberamo Tengah", "Kelila",  -3.7300, 138.7500, 120.0, None, "udara",     "Akses udara"),
    ("Mamberamo Tengah", "Eragayam",-3.7800, 138.6500, 140.0, None, "udara",     "verify"),
    ("Mamberamo Tengah", "Ilugwa",  -3.7000, 138.8000, 125.0, None, "udara",     "verify"),
    ("Mamberamo Tengah", "Megambilis", -3.4750, 139.0971, 70.5, 3.5, "darat_sulit", "Estimasi awal, belum diverifikasi"),
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

# Offline demo fallback ONLY — used when the news table is empty (e.g. a fresh demo
# environment with no internet access for scheduler.ingest_news()). Never overwrites
# real scheduler-fetched rows; see seed_news_fallback()'s empty-table guard. sumber
# and url are intentionally non-real (example.com) so this is never mistaken for an
# actual published article. (kategori, kabupaten_terkait, judul, ringkasan)
NEWS_SEED = [
    ("Bencana", "Jayawijaya", "Longsor tutup akses jalan Wamena–Kurulu",
     "Material longsor menutup sebagian badan jalan, kendaraan roda empat dialihkan sementara."),
    ("Keamanan", "Yalimo", "Aparat tingkatkan patroli di wilayah Yalimo",
     "Patroli gabungan TNI-Polri diperketat menyusul laporan warga soal aktivitas mencurigakan."),
    ("Cuaca", None, "BMKG: Hujan lebat diperkirakan landa Pegunungan Tengah Papua",
     "Prakiraan cuaca menunjukkan potensi hujan lebat disertai angin kencang beberapa hari ke depan."),
    ("Bencana", "Mamberamo Tengah", "Banjir rendam permukiman di Kobakma",
     "Sejumlah rumah warga terendam setelah curah hujan tinggi mengguyur wilayah Kobakma."),
    ("Keamanan", "Jayawijaya", "Situasi keamanan Wamena kembali kondusif",
     "Aktivitas warga dan roda perekonomian berangsur normal pascapenambahan personel keamanan."),
    ("Cuaca", "Yalimo", "Kabut tebal ganggu penerbangan perintis ke Elelim",
     "Sejumlah penerbangan perintis tertunda akibat jarak pandang terbatas di Bandara Elelim."),
    ("Umum", None, "Pemkab Jayawijaya gelar rapat koordinasi lintas distrik",
     "Rapat membahas percepatan pembangunan dan pendataan wilayah terpencil."),
    ("Bencana", "Jayawijaya", "Gempa bumi guncang wilayah Pegunungan Tengah, tidak ada korban",
     "Guncangan dirasakan warga selama beberapa detik, belum ada laporan kerusakan signifikan."),
    ("Keamanan", "Mamberamo Tengah", "TNI-Polri kawal distribusi logistik ke Mamberamo Tengah",
     "Pengawalan dilakukan untuk memastikan kelancaran distribusi bahan pokok ke distrik terpencil."),
    ("Cuaca", "Jayawijaya", "Cuaca ekstrem berpotensi ganggu aktivitas lapangan pekan ini",
     "Petugas lapangan diimbau memperhatikan kondisi cuaca sebelum melakukan kunjungan distrik."),
]


def seed_news_fallback(db) -> int:
    """Insert NEWS_SEED only if the news table is currently empty. Idempotent — safe
    to call on every seed() run without duplicating or overwriting real ingested news."""
    if db.query(News).count() > 0:
        return 0
    now = datetime.now(timezone.utc)
    for i, (kategori, kabupaten, judul, ringkasan) in enumerate(NEWS_SEED, start=1):
        db.add(News(
            tanggal=None,
            judul=judul,
            ringkasan=ringkasan,
            kategori=kategori,
            sumber="Contoh offline (demo)",
            url=f"https://example.com/demo-berita/{i}",
            kabupaten_terkait=kabupaten,
            created_at=now,
        ))
    db.commit()
    return len(NEWS_SEED)


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
        # ensure coverage of jaringan + listrik, then fill enough reports to give the
        # full 50-distrik roster meaningful choropleth spread (same ~2 reports/distrik
        # density as the original 13-distrik seed, scaled up: 26/13 -> 100/50).
        forced = ["Jaringan Komunikasi", "Jaringan Komunikasi",
                  "Listrik & Penerangan", "Listrik & Penerangan",
                  "Listrik & Penerangan"]
        total = 100
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

        news_inserted = seed_news_fallback(db)
        print(
            f"Seeded {len(district_rows)} districts, {total} reports, "
            f"{news_inserted} demo news rows (0 = news table already populated)."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
