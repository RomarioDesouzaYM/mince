# Day 1 — Backend + Auth + Manual Data Flow

Goal: a human can log in and submit a field report, and the dashboard reacts.

## Tasks (in order)

1. Scaffold `backend/` (FastAPI) and `frontend/` (React + Vite). `git init`, first commit.
2. `backend/app/database.py`: SQLite engine (`sqlite:///./mince.db`), SessionLocal, Base.
3. `POST /auth/login`: read `MINCE_USER` / `MINCE_PASSWORD` from `.env`, verify, return a
   JWT (python-jose, 12h). Add a `require_auth` dependency. Test in `/docs`.
4. Models + schemas: `Report`, `District` (with manual `jarak_dari_wamena_km`,
   `estimasi_waktu_tempuh_jam`, `jenis_akses`, `keterangan_akses`), `News`,
   `WeatherSnapshot`. Only the report + district tables are used today.
5. Report CRUD (`GET/POST /reports`, then `GET/PUT/DELETE /reports/{id}`) — all guarded by
   `require_auth`. `PUT /districts/{id}` for editing manual jarak/akses.
6. Frontend shell: layout, sidebar, React Router, `/login` page + a route guard that
   bounces to `/login` without a valid token. Axios sends the JWT header.
7. Add Report form: fields incl. Peran Pengirim (Organik/Mitra/Admin), Link Bukti Dukung
   (URL text field), Kategori list incl. **Listrik & Penerangan**. On submit → `POST
   /reports` → redirect to `/laporan`. Reports table page reads `GET /reports`.
8. `GET /dashboard/stats` + Dashboard page (total, baru, tinggi/kritis, belum selesai,
   kategori dominan, distrik terbanyak).
9. Commit. Write `seed.py` skeleton (see draft/seed.py for reference).

## Stop-and-ask
- Creating the GitHub repo / first `git push` → make sure my SSH key or `gh auth` is set
  up (see plan/00-prerequisites.md). Don't attempt browser auth.
- `.env`: create `.env.example` with blank keys and gitignore `.env`. I fill real values.

## Done-condition (verify by running the app)
Log in → submit a report → see it in the table → dashboard numbers change. A wrong
password is rejected. Data persists after a backend restart.
