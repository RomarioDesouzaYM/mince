# CLAUDE.md — MINCE

MINCE (Monitoring Informasi dan Navigasi Cerdas untuk Evaluasi Risiko) is a field
monitoring dashboard for BPS Kabupaten Jayawijaya covering Jayawijaya, Yalimo, and
Mamberamo Tengah. Build it by following `MINCE_MVP_Roadmap_v4.md` in this repo.

## How to work on this project

- The roadmap is the spec. Build **one day at a time**, in order (Day 1 → Day 5).
- Do NOT start a later day until the current day's **Done-condition** passes.
- Commit after every working feature (`git commit`), with a short message.
- Build boring first, polish last. No feature that isn't in the roadmap.
- When a task is ambiguous, ask me before inventing requirements.

## The one rule that defines the app

Two kinds of data:
- **MANUAL** (a human types it through a form): laporan Organik & Mitra, per-distrik
  `jarak_dari_wamena_km` + `estimasi_waktu_tempuh_jam` + `jenis_akses`, report status.
- **AUTOMATIC** (a scheduler pulls it 3×/day at 06:00/14:00/22:00 WIT): berita (RSS),
  cuaca (Open-Meteo). No human ever types a news item or a temperature.

Derived indicators (`laporan_jaringan`, `laporan_listrik`, `status_perhatian`) are
computed on read from manual data.

## Tech stack (locked — do not swap)

- Backend: FastAPI + SQLite + SQLAlchemy, Python 3.11+
- Scheduler: APScheduler (BackgroundScheduler) in the app lifespan
- News: feedparser against the Papua Antara RSS feeds listed in the roadmap
- Weather: Open-Meteo (no API key)
- Auth: one shared account, `.env` creds, JWT (python-jose), `require_auth` dependency
- Frontend: React + Vite + React Router + Axios + Tailwind + Leaflet
- DB stays SQLite. Do NOT introduce Postgres or MongoDB.

## Hard nos

- No file upload (use `bukti_dukung_url` text field).
- No weighted 0–100 risk score. Use rule-based `status_perhatian` only.
- No AI API, no scraping full article bodies (RSS headline + summary + link only).
- No multi-user accounts / registration.
- Never commit real secrets. `.env` stays gitignored; commit `.env.example` instead.

## Things I (the human) handle — never do these yourself

Do not try to register domains, create accounts, claim credits, enter passwords or
payment details, or run irreversible deploy/DNS steps. When the roadmap reaches one of
these, STOP and tell me exactly what to do. See `plan/00-prerequisites.md`.

## Repo layout

```
backend/app/{main,database,models,schemas,crud,scheduler,seed}.py
backend/app/routers/{auth,reports,districts,dashboard,risk,weather,news,summary}.py
frontend/src/{pages,components,api}/...
```

## Verify before saying a day is done

Run the backend, hit the endpoints in Swagger (`/docs`), run the frontend, and walk the
day's Done-condition manually. Report what you actually observed, not what you expect.
