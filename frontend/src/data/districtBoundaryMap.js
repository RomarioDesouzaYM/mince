import boundaries from './districtBoundaries.json'

// All 50 distrik across Jayawijaya (40), Yalimo (5), Mamberamo Tengah (5) — the full
// real roster, sourced from BIG (Badan Informasi Geospasial)'s ArcGIS REST kecamatan
// layer (BAPANAS/Batas_Administrasi/MapServer/1), filtered by WADMKK only (no
// distrik-name restriction). Verified: every one of the 50 features' WADMPR is
// "Papua Pegunungan" (rules out collision with any unrelated same-named entity
// elsewhere in Papua, including "Mamberamo Tengah"), all 50 are simple Polygons with
// no duplicate (kabupaten, distrik) pairs, and every bounding box sits inside the
// expected regional envelope (lat -5.2..-1.8, lon 137.8..140.8) with no outlier-sized
// shapes. Count matches the verified Wikipedia/government roster exactly (40+5+5=50)
// — BIG has no gap for these three kabupaten.
//
// For every distrik except one, our app's canonical name IS BIG's WADMKC verbatim —
// there's nothing to hand-match, since the app's naming originates from this same
// source. The single exception is BIG's "Wamena" kecamatan, which this app has always
// called "Wamena Kota" (the original Day 1 seed name for the kabupaten capital/
// reference point) — recorded here explicitly rather than silently renamed.
const WADMKC_TO_APP_DISTRIK = {
  Wamena: 'Wamena Kota',
}

export const DISTRICT_BOUNDARY_FEATURES_RAW = boundaries.features

// Builds a GeoJSON FeatureCollection whose features carry our app's `kabupaten`/
// `distrik` fields (instead of BIG's WADMKK/WADMKC).
export function buildDistrictBoundaryFeatureCollection() {
  const features = boundaries.features.map((feature) => {
    const { WADMKK, WADMKC } = feature.properties
    return {
      ...feature,
      properties: {
        kabupaten: WADMKK,
        distrik: WADMKC_TO_APP_DISTRIK[WADMKC] || WADMKC,
      },
    }
  })
  return { type: 'FeatureCollection', features }
}
