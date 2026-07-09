# MINCE — MVP Roadmap (Revised, v4)

**Monitoring Informasi dan Navigasi Cerdas untuk Evaluasi Risiko**
BPS Kabupaten Jayawijaya — 5-Day Working MVP Build (Dynamic Data Edition)

---

## The One Rule That Defines v4

**Two kinds of data, two kinds of update.**

| | Source of truth | How it updates | Examples |
|---|---|---|---|
| **MANUAL** | A human who saw the ground | Entered through a form, whenever it changes | Laporan Organik & Mitra, jarak & estimasi waktu tempuh per distrik, jenis akses, status/tindak lanjut laporan |
| **AUTOMATIC** | The internet, on a clock | A scheduled job pulls it **3× a day, every 8 hours**, with no human touching it | Berita (RSS), cuaca & prakiraan (Open-Meteo) |

Everything derived from manual data (indicator counts, `status_perhatian`) recomputes automatically on read. Everything pulled from the internet refreshes on the scheduler. Nobody ever types a news item or a temperature by hand.

The scheduled fetch runs at **06:00, 14:00, 22:00 WIT (Asia/Jayapura)** — plus once at server startup so the app is never empty.

---

## What Changed From v3

| Area | v3 | v4 (this document) |
|---|---|---|
| News | Admin-curated `news` table; RSS "optional stretch" | **RSS ingestion is the core path.** Scheduled job pulls Papua feeds 3×/day, dedupes, keyword-filters, stores. Curated seed kept **only** as an offline demo fallback. |
| Weather | On-read cache | **Scheduled refresh** on the same 8-hour clock, snapshot stored per distrik so pages load instantly and survive an API outage |
| Scheduler | None | **APScheduler** running inside FastAPI (`06:00 / 14:00 / 22:00` WIT), with a system-cron fallback |
| Jarak / waktu tempuh | Auto-derived by Haversine | **Manual per distrik** (ground-truth terrain), because highland road reality ≠ straight-line math. Haversine kept only as a suggested default when seeding. |
| Manual vs auto | Implicit | **Made explicit and central** (the table above) |

Still locked from earlier versions: no file upload, no weighted 0–100 score, `status_perhatian` not `status_flag`, "Indikator Evaluasi Risiko" not "Risk Model", one unified `reports` table, commit after every working feature, build boring first.

---

## Manual Data — Entered By Humans

These never come from the internet. A person who was there types them in.

**1. Laporan (Organik & Mitra)** — the field report form. This is the heart of the system. Fields: tanggal, kabupaten, distrik, kategori, urgensi, judul, deskripsi, sumber, `submitted_by_role` (Pegawai Organik / Mitra / Admin), `bukti_dukung_url`, lat/long, status, catatan tindak lanjut.

**2. Distrik reference data** — seeded once, edited rarely, through a small admin form or by editing `seed.py`:

```
distrik, kabupaten, latitude, longitude,
jarak_dari_wamena_km      -- MANUAL: real road/field distance, not straight-line
estimasi_waktu_tempuh_jam -- MANUAL: realistic travel hours (or null if air-access)
jenis_akses               -- darat_baik / darat_sulit / udara
keterangan_akses          -- e.g. "Trans-Wamena, longsor musiman"
```

Why manual for jarak: in the highlands, a village 20 km away as the crow flies can be 6 hours by road or reachable only by air. A human estimate is more truthful than a Haversine number. When you seed, you may *start* from the Haversine value as a suggestion, then correct it by hand.

**3. Status & tindak lanjut** — updating a report from Baru → Dipantau → Ditindaklanjuti → Selesai, and writing follow-up notes.

---

## Automatic Data — Pulled On A Schedule

Nobody enters these. The scheduler does.

### Berita (RSS, 3× a day)

Real, working feeds for the region:

```
https://papua.antaranews.com/rss/terkini.xml
https://papua.antaranews.com/rss/top-news.xml
https://papua.antaranews.com/rss/daerah.xml
https://papuatengah.antaranews.com/rss/terkini.xml
```

Ingestion job (`ingest_news()`):

```
1. For each feed URL, parse with feedparser.
2. For each entry, keep: judul (title), ringkasan (the feed's own <description>/summary,
   trimmed to ~300 chars), url (link), tanggal (published), sumber (feed title).
3. Keyword-tag kategori by scanning title+summary:
     Keamanan  -> keamanan, KKB, TNI, Polri, konflik, aparat
     Bencana   -> banjir, longsor, gempa, bencana, erupsi, cuaca ekstrem
     Cuaca     -> cuaca, hujan, BMKG, angin
     Umum      -> everything else
4. Flag kabupaten_terkait if title/summary mentions Jayawijaya, Wamena, Yalimo,
   Mamberamo, or a known distrik name.
5. Dedupe on url (unique constraint). Skip anything already stored.
6. Insert new rows. Log count ingested.
```

**Legality / scope:** MINCE stores only what an RSS feed is *made* to syndicate — headline, the publisher's own short summary, publish date, source name, and a link back. It never fetches or stores full article bodies. That is exactly what RSS is for, so this is not "scraping."

### Cuaca (Open-Meteo, 3× a day)

Same free, no-key API as before, but now the **scheduler** refreshes it and stores a snapshot per distrik, instead of fetching lazily on each page load:

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude={lat}&longitude={lng}
    &current=temperature_2m,weather_code
    &daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max
    &forecast_days=2&timezone=Asia/Jayapura
```

`ingest_weather()` loops over all distrik, calls Open-Meteo, maps `weather_code` → Indonesian label (Cerah, Berawan, Hujan, Hujan Lebat, Kabut…), and upserts a `weather_snapshot` row `{distrik_id, suhu, kondisi, besok_min, besok_max, besok_kondisi, peluang_hujan, updated_at}`. Pages read the stored snapshot, so they load instantly and still show the last-known weather if Open-Meteo is briefly down.

---

## The Scheduler

Use **APScheduler** (`BackgroundScheduler`) started in the FastAPI lifespan:

```python
# scheduler.py (concept)
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

def start_scheduler():
    sched = BackgroundScheduler(timezone="Asia/Jayapura")
    trigger = CronTrigger(hour="6,14,22", minute=0)   # every 8 hours
    sched.add_job(ingest_news,    trigger, id="news",    replace_existing=True)
    sched.add_job(ingest_weather, trigger, id="weather", replace_existing=True)
    sched.start()
    # also run once now so the app is never empty on fresh boot
    ingest_news(); ingest_weather()
```

Wire `start_scheduler()` into the app lifespan so it launches with the server.

**Manual trigger for demo/debug:** expose `POST /admin/ingest` (auth-guarded) that calls both jobs on demand — handy when rehearsing so you can force fresh news without waiting for the clock.

**Fallback if in-process scheduling fights the host:** drop APScheduler and use a system crontab (or a DigitalOcean scheduled job) that hits `POST /admin/ingest` at `0 6,14,22 * * *`. Either path gives the same 3×/day behavior.

**One-instance caveat:** the in-process scheduler assumes a single always-on backend instance (which the MVP is). If you ever scale to multiple instances, move to the cron/DO-scheduled-job path so the ingest doesn't run N times at once.

---

## Data Model

### `reports` (unchanged from v3 — includes `Listrik & Penerangan` category)

```
id, date, kabupaten, distrik, category, urgency, title, description, source,
submitted_by_role, bukti_dukung_url, latitude, longitude, status,
follow_up_note, created_at, updated_at
```

Category options:

```
Transportasi & Akses Jalan | Cuaca & Bencana Alam | Jaringan Komunikasi
Listrik & Penerangan | Logistik & Sarana | Keamanan & Sosial
Kegiatan Lapangan | Berita & Informasi Lain
```

### `districts` (jarak & waktu tempuh now manual fields)

```
id, kabupaten, distrik, latitude, longitude,
jarak_dari_wamena_km       -- MANUAL
estimasi_waktu_tempuh_jam  -- MANUAL (nullable; null when jenis_akses = udara)
jenis_akses                -- darat_baik / darat_sulit / udara
keterangan_akses
```

### `news` (populated ONLY by the scheduler)

```
id, tanggal, judul, ringkasan, kategori, sumber, url (UNIQUE),
kabupaten_terkait (nullable), created_at
```

### `weather_snapshot` (populated ONLY by the scheduler)

```
distrik_id (PK/FK), suhu, kondisi,
besok_min, besok_max, besok_kondisi, peluang_hujan, updated_at
```

### Derived on read (from manual report data)

```
laporan_jaringan = count(category == "Jaringan Komunikasi") per distrik
laporan_listrik  = count(category == "Listrik & Penerangan") per distrik
urgensi_rata_rata, belum_selesai, jumlah_laporan ... per distrik
status_perhatian = rule below
```

**Rule-based status perhatian (unchanged, still explainable):**

```
Kritis  if belum_selesai >= 3  OR  urgensi_rata_rata >= 3.5
Tinggi  if jumlah_laporan >= 5  OR  urgensi_rata_rata >= 2.5
Sedang  if jumlah_laporan >= 2
Rendah  otherwise
```

Weather and travel time stay **context columns**, never inputs to the status rule.

---

## Auth — Cheapest Version That Is Still Real

One shared operational account. `.env` credentials (`MINCE_USER`, `MINCE_PASSWORD`), JWT (python-jose, 12-hour expiry) in localStorage, a `require_auth` FastAPI dependency guarding every data route, and a `/login` page that gates the whole app. No registration, no user table, no per-user roles. `submitted_by_role` on the report form still records Organik / Mitra / Admin.

---

## Backend API

```
POST   /auth/login

GET/POST/PUT/DELETE  /reports  (+ /reports/{id})       -- manual
GET    /districts     PUT /districts/{id}               -- manual (jarak, akses)
GET    /dashboard/stats
GET    /risk/districts     -- indicators + status_perhatian + waktu tempuh + weather
GET    /weather/{distrik_id}   -- reads stored snapshot
GET    /news               -- ?kategori=&kabupaten=   (read-only to users)
GET    /summary/daily
POST   /admin/ingest       -- auth-guarded manual trigger for news+weather jobs
```

`/risk/districts` response shape:

```json
[
  {
    "distrik": "Kurulu", "kabupaten": "Jayawijaya",
    "jumlah_laporan": 6, "urgensi_rata_rata": 3.2, "belum_selesai": 2,
    "jarak_dari_wamena_km": 8, "jenis_akses": "darat_baik",
    "estimasi_waktu_tempuh_jam": 0.5,
    "laporan_jaringan": 2, "laporan_listrik": 1,
    "cuaca_saat_ini": {"suhu": 22, "kondisi": "Cerah"},
    "status_perhatian": "Tinggi"
  }
]
```

Note: `POST /news` is gone. News is never entered by hand — the scheduler owns that table.

---

## Pages

```
/login        -- only public page
/peta         -- POST-LOGIN HOME. Jayawijaya + Yalimo + Mamberamo Tengah.
                 Distrik popups: jarak, ± waktu tempuh, cuaca, laporan jaringan/listrik,
                 status perhatian
/dashboard    -- stat cards + "Berita Terkini" panel (auto) + weather card (auto)
/laporan      -- unified reports table (filter: kabupaten, distrik, kategori,
                 urgensi, status, peran pengirim)
/laporan/tambah
/berita       -- auto-updated news list; each item shows waktu ambil terakhir /
                 "diperbarui otomatis 3× sehari" + link "Baca Sumber"
/risiko       -- indicator table + status_perhatian badges
/ringkasan    -- generated briefing: Generate, Copy, Print
```

Show a small "Terakhir diperbarui: {updated_at} WIT" stamp on `/berita` and the weather card, so it's visibly automatic.

---

## MVP Core Loop (v4)

```
Login
→ peta 3 kabupaten (jarak / waktu tempuh MANUAL, cuaca AUTO)
→ input laporan organik & mitra (MANUAL)
→ dashboard + indicators update (AUTO from manual data)
→ berita panel updates itself 3× a day (AUTO)
→ summary references the same indicators
```

Nothing that doesn't strengthen this loop gets built until the loop works end-to-end.

---

# Day 0 (evening, ~1 hour) — Claim GitHub Student Pack

| Task |
|---|
| Enable GitHub Pro; create private repo `mince` |
| Claim **DigitalOcean $200 credit** (window open through 31 Jul 2026 — do not postpone) |
| Claim **Namecheap** free .me domain + SSL; register e.g. `mince-bps.me` |
| Create **Sentry** student account (optional error monitoring) |

---

# Day 1 — Backend + Auth + Manual Data Flow

| Time | Task |
|---|---|
| 08:00–09:00 | Backend + frontend skeletons, git init, first commit |
| 09:00–10:00 | `POST /auth/login` + JWT + `require_auth`; test in Swagger |
| 10:00–12:00 | `Report`, `District` (manual jarak/akses), `News`, `WeatherSnapshot` models + schemas; report CRUD; `PUT /districts/{id}`; test in Swagger |
| 12:00–13:00 | Buffer / lunch |
| 13:00–15:00 | Frontend layout, sidebar, routing, `/login` + route guard |
| 15:00–17:30 | Add Report form (Peran Pengirim, Link Bukti, kategori Listrik & Penerangan) + Reports table, wired with auth header |
| 17:30–18:30 | Buffer |
| 19:00–21:30 | `/dashboard/stats` + Dashboard page |
| 21:30–22:00 | Commit. `seed.py` skeleton: districts (manual jarak) + reports |

**Done-condition:** login → submit a report → see it in table → dashboard updates. Wrong password rejected.

---

# Day 2 — Map Home + Manual Distance/Travel Time

| Time | Task |
|---|---|
| 08:00–10:30 | Leaflet map covering all 3 kabupaten; distrik + report markers colored by urgency; "Lihat Bukti" link |
| 10:30–12:00 | Filters by kabupaten, category, status, urgency |
| 12:00–13:00 | Buffer / lunch |
| 13:00–15:00 | Distrik popups read **manual** jarak + estimasi waktu tempuh (+ "Akses udara" when jenis_akses = udara) + laporan jaringan/listrik counts |
| 15:00–16:30 | Small admin form to edit distrik jarak/akses (or confirm seed values) |
| 16:30–17:00 | Buffer |
| 17:00–19:30 | Make `/peta` the post-login home; run `seed.py`; verify markers spread across 3 kabupaten |
| 19:30–22:00 | Commit. Full-loop sanity check |

**Done-condition:** login lands on the map; every distrik popup shows manual jarak + waktu tempuh + indicator counts.

---

# Day 3 — The Scheduler: Auto News + Auto Weather

This is the v4 centerpiece.

| Time | Task |
|---|---|
| 08:00–09:00 | Install `apscheduler`, `feedparser`, `httpx`; add `scheduler.py` |
| 09:00–11:30 | `ingest_news()`: parse the 4 Papua feeds, trim summary, keyword-tag kategori, flag kabupaten, dedupe on `url`, insert. Test by calling it directly. |
| 11:30–12:30 | Buffer / lunch |
| 12:30–14:30 | `ingest_weather()`: loop distrik → Open-Meteo → map weather_code → upsert `weather_snapshot`. Graceful skip on API error (keep last snapshot). |
| 14:30–15:30 | Wire `BackgroundScheduler` (06/14/22 WIT) into app lifespan + run-once-on-boot; add auth-guarded `POST /admin/ingest` |
| 15:30–16:00 | Buffer |
| 16:00–18:00 | `/berita` page: kategori filter, judul + ringkasan + "Baca Sumber", "Terakhir diperbarui" stamp; "Berita Terkini" (top 3) panel on Dashboard |
| 18:00–19:30 | Weather column in `/risiko` + weather card on Dashboard, both reading the snapshot |
| 19:30–22:00 | Commit. Test: trigger `/admin/ingest`, confirm new rows; block network and confirm pages still render last-known data |

**Done-condition:** `/berita` fills itself from the internet on trigger; weather shows on `/risiko` and Dashboard; app survives feeds/Open-Meteo being down.

---

# Day 4 — Risk Page + Summary + Deploy

| Time | Task |
|---|---|
| 08:00–10:00 | `/risk/districts` endpoint (indicators + status_perhatian, joins manual jarak + weather snapshot) |
| 10:00–12:00 | `/risiko` page: indicator table, status badges, UI explanation text |
| 12:00–13:00 | Buffer / lunch |
| 13:00–15:00 | `/ringkasan`: Generate, Copy, Print. Template references jarak, waktu tempuh, jaringan, listrik, cuaca, and top news — no score |
| 15:00–16:00 | Seed ~10 curated news rows as an **offline demo fallback only** (so `/berita` is never empty if the venue has no internet) |
| 16:00–19:00 | **Deploy.** Backend → DigitalOcean (App Platform or Droplet + uvicorn + systemd; confirm the in-process scheduler runs there, else switch to a DO scheduled job hitting `/admin/ingest`). Frontend → Vercel. Domain → Namecheap DNS + SSL. Set `.env` on server. |
| 19:00–20:00 | Sentry DSN wired in (optional) |
| 20:00–22:00 | Commit. Run `seed.py` on prod. Trigger `/admin/ingest` on prod. Full loop on the real domain |

**Done-condition:** login at `https://mince-bps.me` → map → laporan → risiko → berita (auto) → ringkasan, end to end; scheduled ingest confirmed working on the server.

---

# Day 5 — Polish + Demo Prep

| Time | Task |
|---|---|
| 08:00–08:30 | Re-run `seed.py`; verify ≥25 reports across 3 kabupaten (incl. jaringan + listrik), spread by distance/urgency/status |
| 08:30–11:30 | UI polish: MINCE branding, BPS Kabupaten Jayawijaya label, status badge colors, empty states, "diperbarui otomatis" stamps, icons (Icons8) |
| 11:30–12:30 | Buffer |
| 12:30–14:00 | Print/export for Ringkasan + Daily Report (browser print acceptable) |
| 14:00–15:30 | Buffer — leftover bugs |
| 15:30–17:00 | Record fallback demo video on localhost |
| 17:00–19:00 | Screenshots, Instagram post, PDF write-up |
| 19:00–21:00 | Rehearse the 3-minute demo script out loud, twice |

---

## Demo Script (v4)

| Step | Page | Line |
|---|---|---|
| 1 | Login | "Akses menggunakan autentikasi. Setelah login, pengguna langsung melihat peta wilayah kerja." |
| 2 | Peta | "Peta mencakup Jayawijaya, Yalimo, dan Mamberamo Tengah. Tiap distrik menampilkan jarak dan estimasi waktu tempuh dari Wamena yang diinput manual berdasarkan kondisi lapangan, serta cuaca terkini yang diperbarui otomatis." |
| 3 | Tambah Laporan | Tambah laporan: Kurulu, Listrik & Penerangan, Tinggi — dari Mitra |
| 4 | Berita | "Berita keamanan, bencana, dan cuaca ditarik otomatis dari kanal berita Papua tiga kali sehari, lengkap dengan tautan ke sumber aslinya." |
| 5 | Evaluasi Risiko | "Sistem menampilkan indikator per distrik — jumlah laporan, urgensi rata-rata, laporan belum selesai, jarak dan estimasi waktu tempuh, laporan jaringan, laporan listrik, dan cuaca. Tidak memakai skor tunggal agar setiap angka bisa dijelaskan langsung." |
| 6 | Ringkasan | Generated text references the same indicators + top news, with coordination recommendations |

Key framing sentence for evaluators: **"Data lapangan diinput manual oleh petugas organik dan mitra; berita dan cuaca ditarik otomatis dari internet tiga kali sehari. Keduanya bertemu di satu peta."**

---

## Cut List (if time dies — cut in this order)

```
1. Prakiraan cuaca besok        (keep current weather)
2. Sentry integration
3. Weather snapshot scheduling   (fall back to on-read fetch + 60-min cache)
4. PDF export polish
5. Edit report
6. Delete report
7. Charts
8. Optional /distrik page
```

**Never cut:** Login, Peta (manual jarak + waktu tempuh), Input laporan, Dashboard, auto Berita (scheduler), `/risiko` indicator table, Ringkasan.

Note: the **news scheduler is never cut** — it's the point of v4. If everything else is on fire, curated seed news is the emergency fallback, but ship the scheduler.

---

## Final Build Rule

**Build the whole app boring first. Make it beautiful last.**
Manual = laporan + jarak + akses. Automatic = berita + cuaca, on an 8-hour clock.
No file upload. No AI API. No weighted score. No multi-user accounts.
RSS gives you headline + summary + link only — never full article bodies.
Make the loop work end-to-end, then polish the UI.
