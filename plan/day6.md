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
