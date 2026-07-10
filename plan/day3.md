# Day 3 — Choropleth Boundaries + Hover Tooltips

Goal: distrik/report popups become hover tooltips (not click), and an optional
choropleth polygon layer ships on `/peta`, shaded by report count.

**Hard stop: if usable distrik-level boundaries for Jayawijaya, Yalimo, and Mamberamo
Tengah aren't confirmed by 12:00, STOP sourcing.** Ship kabupaten-level-only polygons,
or skip choropleth entirely and move to Day 4. This is not optional — do not let
boundary sourcing run past noon.

## Tasks (in order)

1. Download FAO GAUL 2024 level 2 SHP from data.apps.fao.org (CC-BY-4.0, no
   registration). Filter to Indonesia → Papua. Convert to GeoJSON via mapshaper.org.
   Eyeball Jayawijaya/Yalimo/Mamberamo Tengah against a real map — distinct, correctly
   shaped, correctly located?
2. For anything missing/wrong: try mapgeek.id SHP as a second opinion (compare against
   GAUL where both exist — agreement is a trust signal). Still gaps → OSM/Overpass
   (`admin_level=6/7/8`) as last resort. Simplify large files via mapshaper.
3. Build `frontend/src/data/districtBoundaryMap.js` BY HAND, one verified pairing at a
   time, noting which source each polygon came from. **Never match by string equality
   alone** — double-check every "Mamberamo Tengah" against its actual kabupaten (it's
   also an unrelated distrik name elsewhere in Papua).
4. **12:00 DECISION POINT:** continue / kabupaten-level-only / skip entirely.
5. Convert existing marker popups (both distrik and report, from Day 2) to hover
   tooltips: `bindTooltip({sticky: true, interactive: true})`. Distrik tooltip: jarak,
   estimasi waktu tempuh (or "Akses udara"), jenis akses, laporan jaringan/listrik
   counts. Report tooltip: judul, kategori, urgensi, status, and "Lihat Bukti: {title}"
   link when `bukti_dukung_url` is present. Touch/mobile: tap opens the same content
   pinned open (fallback, since hover doesn't exist on touch).
6. *(If continuing choropleth)* Add a `<GeoJSON>` layer to `PetaPage.jsx`, shaded by
   `jumlah_laporan`, same hover-tooltip pattern for polygons. Marker/Choropleth toggle
   above the map. Add a small attribution note near the map ("Batas wilayah: FAO GAUL
   2024") — required by CC-BY-4.0.
7. Visual QA in browser: hover on both marker types (and polygons if built); touch
   emulation confirms tap-to-pin; bukti dukung link visible + clickable without the
   tooltip vanishing first; Mamberamo Tengah check if choropleth shipped.

## Stop-and-ask

None expected today — no new accounts, no deploy, no secrets. This is all frontend +
static asset work.

## Done-condition

Hovering any distrik or report marker on desktop instantly shows correct data,
including a clickable bukti dukung link with a visible title — no click needed to open
or close. Touch/mobile: tap achieves the same, pinned open. Choropleth: working with
verified polygons + attribution, OR kabupaten-level-only, OR explicitly skipped — all
three are acceptable outcomes. Note in this file afterward which one happened and which
boundary source was used per district.

## Outcome (2026-07-10)

Choropleth: **skipped entirely.** Implementation started at 13:41, already past the
12:00 hard stop, so boundary sourcing (FAO GAUL / mapgeek.id / OSM) was never
attempted — per this file's own rule, that time is not optional. Hover tooltips
shipped as planned: distrik and report `CircleMarker`s on `/peta` use react-leaflet
`<Tooltip sticky interactive>` on hover-capable devices, with a `<Popup>` (tap to
open/close) fallback on touch devices detected via `matchMedia('(hover: none)')`.
