# Day 2 — Map as Home + Manual Distance / Travel Time

Goal: after login the user lands on a map of all 3 kabupaten, and each distrik shows its
manual jarak + estimasi waktu tempuh.

## Tasks (in order)

1. Leaflet map covering Jayawijaya, Yalimo, Mamberamo Tengah. Load reports from
   `GET /reports`; draw report markers colored by urgensi
   (Rendah=green, Sedang=yellow, Tinggi=orange, Kritis=red).
2. Report popup: judul, distrik, kategori, urgensi, status, and a "Lihat Bukti" link when
   `bukti_dukung_url` is present.
3. Filters on the map + reports table: kabupaten, kategori, status, urgensi, peran pengirim.
4. Distrik markers (from the seeded `districts`). Popup reads the **manual** fields:
   `jarak_dari_wamena_km`, `± estimasi_waktu_tempuh_jam` (render "Akses udara" when
   `jenis_akses == "udara"`), plus derived `laporan_jaringan` and `laporan_listrik` counts.
5. Small admin form to edit a distrik's jarak / waktu tempuh / jenis_akses (or confirm the
   seeded values) via `PUT /districts/{id}`.
6. Make `/peta` the post-login landing route.
7. Run `seed.py`; confirm report + distrik markers spread across all 3 kabupaten.

## Notes
- Jarak and waktu tempuh are NOT computed by Haversine here. They come from the manual
  district fields. Haversine may only be used inside `seed.py` as a starting suggestion.

## Done-condition
Login lands on the map. Every distrik popup shows manual jarak + waktu tempuh + the
jaringan/listrik counts, across all three kabupaten.
