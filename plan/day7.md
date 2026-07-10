# Day 7 — Risk Endpoint + /risiko + Choropleth Second Mode

## Tasks (in order)

1. `GET /risk/districts`: per-distrik `jumlah_laporan`, `urgensi_rata_rata`,
   `belum_selesai`, manual jarak/waktu tempuh, `laporan_jaringan`, `laporan_listrik`,
   `cuaca_saat_ini`, rule-based `status_perhatian`. No composite score.
2. `/risiko` page: indicator table, status badges, roadmap's UI explanation text.
   Weather and travel time stay context columns, never inputs to the status rule.
3. Add a second choropleth shading mode on `/peta`: a small switch to pick "Jumlah
   Laporan" vs "Status Perhatian" as the shading value. Legend updates to match
   whichever is active.
4. Visual QA: both shading modes render correctly, switching between them updates the
   map and legend together, report markers on top are unaffected by the switch.

## Stop-and-ask

None expected.

## Done-condition

`/risiko` shows the full indicator table with `status_perhatian` badges, matching the
rule: Kritis if belum_selesai >= 3 OR urgensi_rata_rata >= 3.5; Tinggi if
jumlah_laporan >= 5 OR urgensi_rata_rata >= 2.5; Sedang if jumlah_laporan >= 2; Rendah
otherwise. `/peta`'s choropleth can shade by either report density or status
perhatian, switchable, with a matching legend.
