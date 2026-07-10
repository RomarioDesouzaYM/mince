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
   enters real values).

## Stop-and-ask (human-only)

DigitalOcean/Vercel/Namecheap logins + OAuth, entering `.env` secrets on the server,
adding DNS records, clicking final Deploy/Confirm. Agent prepares config, stops for
these.

## Done-condition

Login on the real domain → choropleth map with report markers on top → laporan (with
coordinate picker) → risiko → berita (auto) → ringkasan, end to end. Scheduled ingest
confirmed working on the server. Choropleth, coordinate picker, and hover interactions
all confirmed working in production, not just localhost.
