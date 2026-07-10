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

## Outcome (2026-07-10)

Everything shipped, including the cuttable hover extension — the day didn't run long.
`POST /admin/ingest` confirmed against real feeds/API: 13/13 weather snapshots (one
district transiently failed on first startup ingest due to an SSL handshake timeout,
then succeeded on manual re-trigger — a live demonstration of the graceful-skip path).
Network-failure fallback verified separately via a monkeypatched throwaway script: both
ingest functions log a warning per item and return 0 without raising, and pre-existing
rows are left untouched.

Two fixes beyond the original scope:
- RSS summaries arrived with embedded `<img>` HTML tags from the feed markup, which
  would have rendered as visible garbage text. Added HTML stripping in `ingest_news()`.
- `ingest_news()` was storing every "Umum" article (general Papua news unrelated to
  field operations), drifting from berita's purpose. Now skips inserting anything that
  resolves to "Umum" — only Keamanan/Bencana/Cuaca are kept. Final ingest: 4 relevant
  rows. Keyword matching also tightened to `\b` word-boundary regex instead of raw
  substring (a keyword could match inside an unrelated word, e.g. "aparat" inside
  "Aparatur"). Known remaining limitation, accepted as-is: a keyword can still be a
  genuine standalone word inside an institution's own name (e.g. "Keamanan" inside
  "Kementerian Koordinator Bidang Politik dan Keamanan") and false-positive — this is
  an inherent limit of keyword-based classification without an AI API, not a fixable
  substring bug. See the comment on `_kategori()` in `backend/app/scheduler.py`.

Dashboard's weather card shows Wamena Kota specifically (the reference/capital
district), not one card per distrik — the roadmap's mockup shows a single card.

Three additional feeds added beyond the original 4 Antara feeds, after testing
candidates for working RSS endpoints: `papua.tribunnews.com/rss`, `jubi.id/feed`,
`suarapapua.com/feed` (`ceposonline.com` was tested and rejected — no working feed
endpoint under any URL variant, every path redirects to their HTML search page).
`ingest_news()` now fetches every feed through one consistent path — a browser-like
User-Agent (tribunnews 403s feedparser's default UA) plus an explicit `certifi` CA
bundle (jubi.id's TLS handshake fails against this environment's default trust store)
— rather than giving jubi.id a special-cased fetch method. Checked
`papua.tribunnews.com/robots.txt` before adding it to the permanent 3×/day schedule:
`/rss` isn't disallowed (only `/api/`, `/posts/`, `/ajax/`, etc. are), though the file
does carry a "personal/non-commercial use only" comment worth being aware of.

jubi.id's `/pasifik/` section (international Pacific news — Australia, Fiji, etc.) was
producing topically off-region false positives despite genuine keyword matches (an
Australia-Fiji defense-pact article matched "keamanan" as a real word, just not about
Papua) — now skipped by URL path for that source specifically. Final ingest across all
7 feeds: 10 rows (6 Keamanan, 2 Bencana, 2 Cuaca), spanning all 6 sources. Two rows
carry the same already-documented institutional-name limitation from `_kategori()`
(keyword is a real standalone word inside an institution's own name/acronym, e.g.
"Keamanan" inside a ministry's formal name or an app's expanded acronym) — accepted as
the same known limitation, not a new problem.
