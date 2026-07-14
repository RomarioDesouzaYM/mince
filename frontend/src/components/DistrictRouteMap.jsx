import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { getDistrictRoute } from '../api/districts'

const WAMENA_CENTER = [-4.0917, 138.95]

// Wamena Kota's own route page has jarak_dari_wamena_km == 0 -- Wamena and the
// district are the same point, so fitBounds would zoom into a degenerate box.
const SAME_POINT_EPSILON = 0.0005 // ~50m

// Mirrors backend/app/crud.py's _haversine_km -- the dashed line drawn on the map is a
// real geometric line between two coordinates, so its label should show that line's
// actual length, not district.jarak_dari_wamena_km (a manual BPS ground-truth figure
// with no relation to this line's geometry).
function haversineKm(lat1, lon1, lat2, lon2) {
  const r = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dphi = toRad(lat2 - lat1)
  const dlambda = toRad(lon2 - lon1)
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function FitTwoPoints({ points }) {
  const map = useMap()
  useEffect(() => {
    const [a, b] = points
    const samePoint =
      Math.abs(a[0] - b[0]) < SAME_POINT_EPSILON && Math.abs(a[1] - b[1]) < SAME_POINT_EPSILON
    if (samePoint) {
      map.setView(a, 12)
    } else {
      map.fitBounds(points, { padding: [40, 40] })
    }
  }, [points, map])
  return null
}

function EstimateInfoCard({ district, straightLineKm }) {
  return (
    <div className="absolute bottom-3 right-3 z-[1000] rounded-lg border border-gray-200 bg-white/95 p-3 text-xs shadow-md">
      {district.jenis_akses === 'udara' ? (
        <>
          <p className="font-semibold text-gray-900">Akses Udara</p>
          <p className="text-gray-600">Tidak ada rute darat</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-gray-900">{straightLineKm.toFixed(1)} km</p>
          <p className="mb-2 text-gray-500">Jarak lurus (garis lurus)</p>
          <p className="font-semibold text-gray-900">
            {district.estimasi_waktu_tempuh_jam != null
              ? `${district.estimasi_waktu_tempuh_jam} jam`
              : '—'}
          </p>
          <p className="text-gray-500">Estimasi waktu tempuh (manual BPS)</p>
        </>
      )}
    </div>
  )
}

function RealRouteInfoCard({ route }) {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-blue-300 bg-blue-50/95 p-3 text-xs shadow-md">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-blue-500">
        Rute Jalan Nyata
      </p>
      <p className="font-semibold text-blue-900">{route.distance_km} km</p>
      <p className="mb-2 text-blue-600">Jarak tempuh jalan</p>
      <p className="font-semibold text-blue-900">{route.duration_min} menit</p>
      <p className="text-blue-600">Estimasi waktu tempuh</p>
    </div>
  )
}

export default function DistrictRouteMap({ district }) {
  const districtPoint = [district.latitude, district.longitude]
  const isUdara = district.jenis_akses === 'udara'
  const [route, setRoute] = useState(null)

  useEffect(() => {
    setRoute(null)
    if (isUdara) return
    getDistrictRoute(district.id)
      .then(setRoute)
      .catch(() => {}) // stay on the dashed straight-line estimate if this fails
  }, [district.id, isUdara])

  const hasRealRoute = route?.available && route.geometry?.length > 0
  const straightLineKm = haversineKm(
    WAMENA_CENTER[0], WAMENA_CENTER[1], districtPoint[0], districtPoint[1],
  )

  return (
    <div>
      <div className="relative h-64 w-full overflow-hidden rounded-lg border border-gray-200">
        <MapContainer center={WAMENA_CENTER} zoom={9} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitTwoPoints points={[WAMENA_CENTER, districtPoint]} />

          <CircleMarker
            center={WAMENA_CENTER}
            radius={6}
            pathOptions={{ color: '#374151', fillColor: '#374151', fillOpacity: 0.9 }}
          >
            <Tooltip direction="top">Wamena</Tooltip>
          </CircleMarker>

          <CircleMarker
            center={districtPoint}
            radius={6}
            pathOptions={{ color: '#374151', fillColor: '#374151', fillOpacity: 0.9 }}
          >
            <Tooltip direction="top">{district.distrik}</Tooltip>
          </CircleMarker>

          {!isUdara && (
            <Polyline
              positions={[WAMENA_CENTER, districtPoint]}
              pathOptions={{ color: '#6b7280', weight: 3, dashArray: '8 6', opacity: 0.8 }}
            >
              <Tooltip permanent direction="center" className="route-distance-tooltip">
                Jarak lurus
              </Tooltip>
            </Polyline>
          )}

          {hasRealRoute && (
            <Polyline
              positions={route.geometry}
              pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
            >
              <Tooltip direction="top">Rute jalan</Tooltip>
            </Polyline>
          )}
        </MapContainer>
        <EstimateInfoCard district={district} straightLineKm={straightLineKm} />
        {hasRealRoute && <RealRouteInfoCard route={route} />}
      </div>
      {!isUdara && (
        <p className="mt-2 text-xs text-gray-500">
          Jarak garis lurus, bukan rute jalan sebenarnya.
          {hasRealRoute && ' Garis biru menunjukkan rute jalan nyata.'}
        </p>
      )}
    </div>
  )
}
