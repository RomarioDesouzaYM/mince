# Day 4 — The Scheduler: Auto News + Auto Weather + Hover Extension

Goal: berita and cuaca update themselves 3x/day with no human input, and the Day 3
hover tooltip gets extended with real weather/news once this data exists.

## Tasks (in order)

1. Install `apscheduler`, `feedparser`, `httpx`. Create `backend/app/scheduler.py`
   (reference: `draft/scheduler.py`).
2. `ingest_news()`: parse the 4 Papua Antara RSS feeds, keep judul/ringkasan/url/
   tanggal/sumber, keyword-tag kategori, flag `kabupaten_terkait`, dedupe on `url`,
   insert new rows only. Never store full article bodies.
3. `ingest_weather()`: loop districts, call Open-Meteo (no key), map `weather_code` to
   Indonesian label, upsert `WeatherSnapshot` per distrik. Graceful skip + keep last
   snapshot on API error.
4. `start_scheduler()`: `BackgroundScheduler`, `CronTrigger hour="6,14,22"`, both jobs,
   run once at startup. Wire into FastAPI lifespan.
5. `POST /admin/ingest` (auth-guarded): triggers both jobs on demand.
6. `/berita` page: kategori filter, judul + ringkasan + "Baca Sumber" link, "Terakhir
   diperbarui: ... WIT" stamp. Top-3 "Berita Terkini" panel on Dashboard.
7. Weather card on Dashboard, reading the stored snapshot (not live-fetching).
8. **Extend the Day 3 distrik hover tooltip:** add cuaca saat ini (suhu + kondisi from
   `weather_snapshot`) and up to 2 relevant berita headlines (filtered by
   `kabupaten_terkait`, with links). Reuse already-fetched data — no duplicate
   fetching logic. **CUTTABLE if behind schedule** — weather/news still visible on
   Dashboard/berita regardless.

## Stop-and-ask

None expected — Open-Meteo and RSS feeds need no API keys.

## Done-condition

Trigger `POST /admin/ingest` → `/berita` fills with real feed items. Weather shows on
Dashboard. Block the network → pages still render last-known data gracefully. If the
hover extension shipped: hovering a distrik marker also shows current weather + up to
2 relevant news headlines.
