# Day 5 — Full Choropleth: Boundary Sourcing + Polygon Rendering

Goal: replace distrik point markers with real district polygons shaded by report
count. Report markers (from Day 2/3) stay exactly as they are, rendered on top.

**Run this as its own fresh session, started in the morning — the 12:00 hard stop only
works as a safety valve if there's real runway before it. (The prior attempt at this
work was skipped entirely because the session started at 13:41, already past the
cutoff.)**

**Hard stop: if usable distrik-level boundaries for Jayawijaya, Yalimo, and Mamberamo
Tengah aren't confirmed by 12:00, STOP sourcing.** Ship kabupaten-level-only polygons,
or fall back to keeping the existing distrik point markers for this build — both are
acceptable outcomes.

## Tasks (in order)

1. Download FAO GAUL 2024 level 2 SHP from data.apps.fao.org (CC-BY-4.0, no
   registration). Filter to Indonesia → Papua. Convert to GeoJSON via mapshaper.
   Eyeball Jayawijaya/Yalimo/Mamberamo Tengah against a real map.
2. Gaps → mapgeek.id SHP as a second opinion (compare where both exist) → still gaps
   → OSM/Overpass (`admin_level=6/7/8`) as last resort. Simplify large files.
3. Build `frontend/src/data/districtBoundaryMap.js` by hand, one verified pairing at a
   time. **Never match by string equality alone** — explicit Mamberamo Tengah
   collision check against its actual kabupaten.
4. **12:00 DECISION POINT:** continue / kabupaten-level-only / fall back to distrik
   point markers for this build.
5. Remove distrik `CircleMarker`s from `PetaPage.jsx`. Add a `<GeoJSON>` layer shaded
   by `jumlah_laporan` (report count per distrik). Hover tooltip on polygons, reusing
   the Day 3 pattern (`bindTooltip({sticky:true, interactive:true})`), showing the
   same content the old distrik markers showed: jarak, waktu tempuh (or "Akses
   udara"), jenis akses, laporan jaringan/listrik, cuaca/berita if already wired.
6. Keep report `CircleMarker`s exactly as-is — confirm they still render correctly on
   top of the polygon layer, hover tooltips still work, "Lihat Bukti" still works.
7. Build a legend: polygon-shading gradient key (e.g. "Jumlah Laporan: rendah → tinggi")
   + marker-urgency color key (Rendah/Sedang/Tinggi/Kritis), fixed position near the
   map. Two independent color systems now share the map — this isn't optional polish,
   it's needed to avoid confusion.
8. Attribution note near the map (e.g. "Batas wilayah: FAO GAUL 2024", or whichever
   source ended up used per district) — required by CC-BY-4.0.
9. **Remove the old Marker/Choropleth toggle UI entirely.** This is now the only view
   — choropleth is always the base layer, markers are always on top. No toggle.

## Stop-and-ask

None expected — no new accounts, no deploy, no secrets. Frontend + static GeoJSON
assets only.

## Done-condition

`/peta` shows shaded district polygons as the base layer, with report markers (hover
tooltips, urgency colors, Lihat Bukti) rendered on top. A legend distinguishes the two
color systems. No leftover toggle UI. No distrik point markers remain. Note in this
file afterward which boundary source was used per district, and whether any fallback
(kabupaten-level, or point-markers-only) was taken.
