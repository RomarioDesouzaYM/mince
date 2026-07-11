# Day 8 — Summary + Deploy

## Tasks (in order)

1. `GET /summary/daily` + `/ringkasan` page: Generate, Copy, Print. References jarak,
   waktu tempuh, jaringan, listrik, cuaca, top news — no score.
2. Seed ~10 curated news rows as an OFFLINE fallback only (does not replace the
   scheduler).
3. Deploy: backend → DigitalOcean (App Platform or Droplet + uvicorn + systemd;
   confirm the in-process scheduler runs there, else switch to a DO scheduled job
   hitting `/admin/ingest`). Frontend → Vercel — confirm `frontend/public/geo/*.geojson`
   deploys as static assets. Domain → Namecheap DNS + SSL. `.env` set on server (human
   enters real values) — **all required vars, added Day 5 Part 3** (approval-role
   accounts, easy to silently miss since they're new since this file was first
   written):
   - `MINCE_USER`, `MINCE_PASSWORD` — shared operational account (unchanged since Day 1)
   - `JWT_SECRET`
   - `KETUA_SOSIAL_USER`/`_PASSWORD`, `KETUA_DISTRIBUSI_USER`/`_PASSWORD`,
     `KETUA_NERACA_USER`/`_PASSWORD`, `KETUA_UMUM_USER`/`_PASSWORD`,
     `KETUA_PENGOLAHAN_USER`/`_PASSWORD` — 5 distinct Ketua Tim accounts (same
     `ketua_tim` approval role, separate identities for audit trail)
   - `KEPALA_BPS_USER`, `KEPALA_BPS_PASSWORD` — district-edit approval role

## Stop-and-ask (human-only)

DigitalOcean/Vercel/Namecheap logins + OAuth, entering `.env` secrets on the server,
adding DNS records, clicking final Deploy/Confirm. Agent prepares config, stops for
these.

## Done-condition

Login on the real domain → choropleth map with report markers on top → laporan (with
coordinate picker) → risiko → berita (auto) → ringkasan, end to end. Scheduled ingest
confirmed working on the server. Choropleth, coordinate picker, and hover interactions
all confirmed working in production, not just localhost.
