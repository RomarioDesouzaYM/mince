# Day 4 — Risk Page + Summary + Deploy

Goal: the indicator page and the generated briefing work, and the app is live on the real
domain.

## Tasks (in order)

1. `GET /risk/districts`: per-distrik indicators (jumlah_laporan, urgensi_rata_rata,
   belum_selesai, manual jarak + waktu tempuh, laporan_jaringan, laporan_listrik,
   cuaca_saat_ini from the snapshot) + rule-based `status_perhatian`. No composite score.
2. `/risiko` page: indicator table, status badges, and the UI explanation text from the
   roadmap. Weather + travel time are context columns, not inputs to the status rule.
3. `GET /summary/daily` + `/ringkasan` page: Generate, Copy, Print (browser print is fine).
   Template references jarak, waktu tempuh, jaringan, listrik, cuaca, and top news — no score.
4. Seed ~10 curated news rows as an OFFLINE fallback only (so `/berita` is never empty at a
   venue without internet). This does not replace the scheduler.
5. **Deploy** — prepare everything, then hand the human the login/click steps:
   - Backend → DigitalOcean (App Platform, or Droplet + uvicorn + systemd). Confirm the
     in-process scheduler runs on the host; if not, set up a DO scheduled job hitting
     `/admin/ingest`.
   - Frontend → Vercel. Domain + SSL → Namecheap DNS.
   - Set `.env` on the server (human enters real values).

## Stop-and-ask (human-only)
DigitalOcean/Vercel/Namecheap logins + OAuth, entering `.env` secrets on the server,
adding DNS records, and clicking the final Deploy/Confirm. The agent prepares config,
Dockerfile/systemd unit, and build commands, then stops for me.

## Done-condition
Login on the real domain → map → laporan → risiko → berita (auto) → ringkasan, end to end.
Scheduled ingest confirmed working on the server.
