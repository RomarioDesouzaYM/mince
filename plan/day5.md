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

## Outcome (2026-07-11)

**Boundary source (all 3 kabupaten, full distrik-level, no fallback needed):** FAO
GAUL 2024 was tried first per this file's stated order, but its Level 2 layer is
kabupaten-level only worldwide (no Level 3 exists in the 2024 edition) — usable only
as a kabupaten-level fallback, not distrik-level. mapgeek.id is likewise kabupaten/kota
level only. OSM/Overpass had full distrik-level `admin_level=6` boundaries for
Jayawijaya (39 distrik, later reconciled to 40) but **zero** distrik-level boundaries
for Yalimo or Mamberamo Tengah (only point localities) — confirmed via multiple
Overpass queries, not a fluke. Per user direction, BIG (Badan Informasi Geospasial)'s
official ArcGIS REST kecamatan layer
(`BAPANAS/Batas_Administrasi/MapServer/1`) was queried instead and had full
distrik-level polygons for **all 50 real distrik across all 3 kabupaten** —
Jayawijaya 40, Yalimo 5, Mamberamo Tengah 5 — matching verified government/Wikipedia
counts exactly, no gap. **Outcome: full distrik-level choropleth for all three
kabupaten, no fallback taken.** Attribution: "Batas wilayah distrik: Badan Informasi
Geospasial (BIG) — layer Batas Wilayah Kecamatan," shown under the map.

Verification performed: every feature's `WADMPR` confirmed "Papua Pegunungan"
(explicit Mamberamo Tengah collision check — ruling out any unrelated same-named
entity elsewhere in Papua), Jayawijaya's distrik roster cross-checked against an
independent OSM query (exact match), bounding-box + vertex-count sanity across all 50
simplified polygons (no out-of-region, degenerate, or duplicate shapes), and a
representative sample spot-checked per kabupaten.

**Two bugs found and fixed after initial integration:**
1. Polygon hover tooltip closed before a link inside it (berita/bukti-dukung/edit)
   could be reached — `sticky: true` chased the cursor across the polygons' large,
   often-concave hit regions in a way point markers' small convex hit regions never
   triggered. Fixed by dropping `sticky` from the polygon `<Tooltip>` only (point
   markers unchanged).
2. The choropleth's `jumlah_laporan` shading originally reused the dataviz skill's
   default sequential blue ramp, which read too close to the map's other blue tones.
   Replaced with a violet ramp derived at the same OKLCH lightness/chroma steps
   (hue ~285°), distinct from both the urgency marker palette and the old blue.

**Scope correction:** the initial build only covered the original 13 seeded distrik
(a Day 1 demo subset, never a complete roster). Re-queried BIG filtered only by
kabupaten (no distrik-name restriction) and expanded to the full real 50-distrik
roster — `backend/app/seed.py`'s `DISTRICTS` list, `districtBoundaryMap.js`, and demo
reports (26 -> 100, preserving the original ~2-reports/distrik density) were all
expanded accordingly. The ~37 newly added distrik use centroid-derived coordinates,
Haversine-estimated `jarak_dari_wamena_km`, and a simple distance-bucket guess for
`jenis_akses`/`estimasi_waktu_tempuh_jam` — explicitly marked
`"Estimasi awal, belum diverifikasi"` in `keterangan_akses`, never presented as
ground truth, same convention as the original 13's "verify" placeholders.

**Explicitly out of scope, noted for a future day:** desa/kelurahan (village) -level
boundaries. BIG's own layer set goes one level finer than kecamatan/distrik, but
consuming it would require a new `desa` entity in the data model (not just more
polygon sourcing) — a real, separate future consideration, not attempted here.

## Outcome, round 2 (2026-07-12)

Manual testing surfaced a color bug, a tooltip bug that survived round 1's fix
attempt, and a request to fully redesign Edit Data Distrik. All three diagnosed from
source/data before touching code (see below), not guessed a second time.

**Color bug:** 4 Jayawijaya distrik (Itlay Hisage, Koragi, Walelagama, Wouma) had 0
reports, landing on the violet ramp's lightest step (`#dcdcfb`, 1.31:1 contrast —
never checked against the floor when the ramp was derived). Fixed by shifting the
ramp's floor to step 250 (`#acaaee`, 2.10:1) and regenerating all 5 steps
correspondingly darker. Also fixed `DISTRICT_BORDER_COLOR`, which collided with two
of the ramp's own fill steps (border would vanish on districts landing on those
buckets) — moved to a neutral gray (`#374151`) outside the fill ramp entirely.

**Tooltip bug, real fix:** round 1's `sticky` removal didn't work because `sticky`
only controls tooltip *position*, not *close timing* — read `leaflet/src/layer/
Tooltip.js` directly and found Leaflet wires tooltip-close to the polygon's own
`mouseout`, which fires the instant the cursor crosses onto the tooltip's DOM (a
structural Leaflet limitation for Path/area layers, `interactive` doesn't touch it
either). Fixed in the new `frontend/src/components/DistrictPolygon.jsx`: strips
Leaflet's default `mouseout -> closeTooltip` binding, replaces it with a 150ms
debounced close cancelled by `mouseenter` on the tooltip's own DOM node (grabbed via
the `tooltipopen` event). A `<Popup>` is now always rendered (not gated to touch) as
a guaranteed click-to-pin fallback with Leaflet's native close button, closing any
lingering tooltip on open.

**Edit Data Distrik redesign:** replaced the direct-save inline panel with a
propose/approve workflow. New `DistrictEditProposal` table + `routers/
district_proposals.py` (create/list/approve/reject); the old `PUT /districts/{id}`
+ `DistrictUpdate` schema are retired outright, not kept as a bypass. Auth extended
with a `role` JWT claim and two new named accounts (`KETUA_TIM_USER`/`_PASSWORD`,
`KEPALA_BPS_USER`/`_PASSWORD`) alongside the unchanged shared `MINCE_USER` account —
anyone can propose, only these two roles can approve/reject (`require_role`
dependency, frontend `ProtectedRoute` `roles` prop + `Sidebar` conditional nav link).
New pages: `/distrik/:id/ajukan` (propose) and `/persetujuan` (role-gated queue).
Smoke-tested end-to-end: propose as shared account, blocked from the queue (403),
approve as `ketua_tim`, district row updates; confirmed choropleth shading is
unaffected (it reads only from `reports`, never from proposals).

**Roadmap overlap check (Day 6-9):** confirmed real overlap with Day 8 only —
`plan/day8.md` didn't enumerate required `.env` vars, so the two new role-account
pairs could've been silently missed at deploy; added an explicit checklist there. No
functional overlap with Day 6 (coordinate picker, different file/data) or Day 7 (risk
endpoint's `status_perhatian` is report-derived, unrelated to district-edit
proposals) — Day 7 will touch `PetaPage.jsx` again for its shading-mode switch, but
at a different UI region, sequential not conflicting. Day 9's demo script needed no
change — the hover interaction it references still exists (now debounced + backed by
click-to-pin), and the removed in-tooltip edit trigger was never part of it.
