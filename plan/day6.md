# Day 6 — Report Coordinate Picker

Goal: Mitra/Pegawai can click a map to set a report's location when submitting,
instead of only typing raw coordinates. No backend changes — `Report.latitude`/
`longitude` already exist since Day 1.

## Tasks (in order)

1. Confirm `react-leaflet`'s map-click handling (`useMapEvents`) is available — same
   dependency installed Day 2, nothing new to install.
2. Build the picker: a small `<MapContainer>` embedded in `AddReportPage.jsx`. Clicking
   it places a marker and sets `latitude`/`longitude` in the form state.
3. Default center: the selected Kabupaten's approximate area once chosen in the form;
   falls back to Wamena if no kabupaten is selected yet.
4. Keep the existing manual lat/lng number inputs visible below the picker, wired
   two-way — typing a value also moves the marker, not just the reverse.
5. Styling: make the picker visually distinct from anything else on the page, short
   label above it ("Klik peta untuk menandai lokasi bukti dukung").
6. Confirm the picker stays fully optional — submitting without picking a location
   must still work exactly as it did before (nullable lat/long, unchanged).

## Stop-and-ask

None expected — pure frontend feature, no new accounts or secrets.

## Done-condition

Submitting a report using the map picker produces a report whose marker appears at
that exact position on `/peta` afterward. Submitting without picking a location still
works fine (optional field). Manual coordinate entry still works for anyone who
prefers typing over clicking.

## Outcome (2026-07-12)

**Day 6 closed — QA passed.** Discrepancy found before building: this file assumed
manual lat/lng inputs already existed in `AddReportPage.jsx` ("keep the existing...
inputs"). They didn't (grepped the file, zero matches) — only `seed.py` ever set
report coordinates. Built both the manual inputs and the picker together instead of
a picker bolted onto pre-existing fields. Kabupaten default-center is a plain average
of that kabupaten's districts (approximate/fallback only, not area-weighted),
falling back to Wamena when no kabupaten is picked yet. Picker uses `CircleMarker`,
not Leaflet's default `Marker`, to stay consistent with the rest of the app and avoid
the default-icon-asset issue under Vite. Verified in browser: kabupaten re-centering,
click-to-set, manual-input two-way sync, marker position accuracy on `/peta`, and the
no-location edge case — all confirmed working.

**Scope extended same night, two hotfixes found in testing:**
1. Report markers were rendering underneath the choropleth polygon fill on `/peta`.
   Fixed with a dedicated Leaflet pane (`reportMarkers`, z-index 650) instead of
   relying on JSX/DOM order, which is fragile against re-renders.
2. Report marker tooltips had the same hover-closes-before-clickable bug the
   district polygons had before the Day 5 fix. Extracted that fix into a shared hook
   (`frontend/src/hooks/useDebouncedTooltip.js`) and applied it to both report
   markers (new `frontend/src/components/ReportMarker.jsx`) and district polygons,
   rather than duplicating the imperative Leaflet logic a second time.

Both hotfixes verified working in browser alongside the Day 6 QA pass.
