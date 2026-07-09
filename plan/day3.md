# Day 3 — The Scheduler: Auto News + Auto Weather

Goal: berita and cuaca update themselves 3×/day with no human input. This is the point
of v4 — do not cut it.

## Tasks (in order)

1. Install `apscheduler`, `feedparser`, `httpx`. Create `backend/app/scheduler.py`
   (reference: draft/scheduler.py).
2. `ingest_news()`: parse the 4 Papua Antara RSS feeds. Per entry keep judul, ringkasan
   (feed's own summary, trimmed ~300 chars), url, tanggal, sumber. Keyword-tag `kategori`
   (Keamanan / Bencana / Cuaca / Umum). Flag `kabupaten_terkait` on name match. Dedupe on
   `url` (unique). Insert new rows only. Never store full article bodies.
3. `ingest_weather()`: loop over districts → call Open-Meteo (no key) → map `weather_code`
   to an Indonesian label → upsert a `WeatherSnapshot` per distrik. On API error, keep the
   last snapshot (graceful skip).
4. `start_scheduler()`: `BackgroundScheduler(timezone="Asia/Jayapura")`, CronTrigger
   `hour="6,14,22", minute=0`, both jobs. Run both once at startup. Wire into the FastAPI
   lifespan.
5. `POST /admin/ingest` (auth-guarded): triggers both jobs on demand for demo/debug.
6. `/berita` page: kategori filter, judul + ringkasan + "Baca Sumber" link, and a
   "Terakhir diperbarui: … WIT" stamp. Top-3 "Berita Terkini" panel on the Dashboard.
7. Weather column in `/risiko` + weather card on Dashboard, both reading the stored
   snapshot (not fetching live on each load).

## Deploy-shape note
The in-process scheduler assumes ONE always-on backend instance. If you later scale out,
switch to a system cron / DigitalOcean scheduled job hitting `POST /admin/ingest`.

## Done-condition
Trigger `POST /admin/ingest` → `/berita` fills with real feed items. Weather shows on
`/risiko` and Dashboard. Block the network and confirm pages still render last-known data.
