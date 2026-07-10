# Day 5 — Risk Page + Summary + Deploy + Choropleth Stretch

## Tasks (in order)

1. `GET /risk/districts`: per-distrik `jumlah_laporan`, `urgensi_rata_rata`,
   `belum_selesai`, manual jarak/waktu tempuh, `laporan_jaringan`, `laporan_listrik`,
   `cuaca_saat_ini`, rule-based `status_perhatian`. No composite score.
2. `/risiko` page: indicator table, status badges, roadmap's UI explanation text.
   Weather and travel time stay context columns, never inputs to the status rule.
3. `GET /summary/daily` + `/ringkasan` page: Generate, Copy, Print. References jarak,
   waktu tempuh, jaringan, listrik, cuaca, top news — no score.
4. Seed ~10 curated news rows as an OFFLINE fallback only (does not replace the
   scheduler).
5. **STRETCH, cut if behind:** second choropleth shading mode using
   `status_perhatian`, same hover pattern as the Day 3 density mode. Skip without
   guilt.
6. Deploy: backend → DigitalOcean, frontend → Vercel (confirm
   `frontend/public/geo/*.geojson` deploys as static assets), domain → Namecheap DNS +
   SSL, `.env` set on server (human enters real values).

## Stop-and-ask (human-only)

DigitalOcean/Vercel/Namecheap logins, entering `.env` secrets on the server, adding
DNS records, clicking final Deploy/Confirm. Agent prepares config, stops for these.

## Done-condition

Login on the real domain → map (marker + choropleth if shipped) → laporan → risiko →
berita (auto) → ringkasan, end to end. Scheduled ingest confirmed on the server. Hover
tooltips confirmed working in production, not just localhost.
