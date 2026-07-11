import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { listDistricts } from '../api/districts'
import { listReports } from '../api/reports'
import { listNews } from '../api/news'
import { URGENCY_COLOR, reportCountColor } from '../constants'
import { buildDistrictBoundaryFeatureCollection } from '../data/districtBoundaryMap'
import ReportFilters from '../components/ReportFilters'
import MapLegend from '../components/MapLegend'
import DistrictPolygon from '../components/DistrictPolygon'
import { ReportMarkerContent } from '../components/MapMarkerContent'

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(hover: none)')
    setIsTouch(query.matches)
    const handler = (e) => setIsTouch(e.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])
  return isTouch
}

const WAMENA_CENTER = [-4.0917, 138.95]
// Neutral, deliberately outside the violet fill ramp so the border stays visible
// against every shading bucket (a ramp-matched border color would vanish whenever a
// district's fill happened to land on that same step).
const DISTRICT_BORDER_COLOR = '#374151'
const JARINGAN_CATEGORY = 'Jaringan Komunikasi'
const LISTRIK_CATEGORY = 'Listrik & Penerangan'

const DISTRICT_BOUNDARY_FEATURES = buildDistrictBoundaryFeatureCollection().features

// GeoJSON rings are [lng, lat]; Leaflet's Polygon `positions` wants [lat, lng].
function ringsToLatLngs(coordinates) {
  return coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng]))
}

const emptyFilters = {
  kabupaten: '',
  category: '',
  status: '',
  urgency: '',
  submitted_by_role: '',
}

function FitBounds({ districts }) {
  const map = useMap()
  useEffect(() => {
    if (districts.length === 0) return
    map.fitBounds(
      districts.map((d) => [d.latitude, d.longitude]),
      { padding: [30, 30] },
    )
  }, [districts, map])
  return null
}

export default function PetaPage() {
  const [districts, setDistricts] = useState([])
  const [reports, setReports] = useState([])
  const [news, setNews] = useState([])
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [pickedId, setPickedId] = useState('')
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    listDistricts()
      .then(setDistricts)
      .catch(() => setError('Gagal memuat daftar distrik'))
  }, [])

  useEffect(() => {
    listReports(filters)
      .then(setReports)
      .catch(() => setError('Gagal memuat daftar laporan'))
  }, [filters])

  useEffect(() => {
    listNews()
      .then(setNews)
      .catch(() => {})
  }, [])

  const filteredDistricts = useMemo(() => {
    if (!filters.kabupaten) return districts
    return districts.filter((d) => d.kabupaten === filters.kabupaten)
  }, [districts, filters.kabupaten])

  const pickedDistrict = districts.find((d) => d.id === Number(pickedId))

  function countsFor(district) {
    const distrikReports = reports.filter(
      (r) => r.distrik === district.distrik && r.kabupaten === district.kabupaten,
    )
    return {
      total: distrikReports.length,
      jaringan: distrikReports.filter((r) => r.category === JARINGAN_CATEGORY).length,
      listrik: distrikReports.filter((r) => r.category === LISTRIK_CATEGORY).length,
    }
  }

  function newsFor(district) {
    return news.filter((n) => n.kabupaten_terkait === district.kabupaten).slice(0, 2)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Peta</h1>

      <ReportFilters filters={filters} onChange={setFilters} className="mb-4" />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="relative mb-2 h-[65vh] w-full overflow-hidden rounded-lg border border-gray-200">
        <MapContainer center={WAMENA_CENTER} zoom={9} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds districts={filteredDistricts} />

          {DISTRICT_BOUNDARY_FEATURES.map((feature) => {
            const { kabupaten, distrik } = feature.properties
            const d = filteredDistricts.find(
              (fd) => fd.kabupaten === kabupaten && fd.distrik === distrik,
            )
            if (!d) return null
            const counts = countsFor(d)
            return (
              <DistrictPolygon
                key={`district-${d.id}`}
                district={d}
                positions={ringsToLatLngs(feature.geometry.coordinates)}
                pathOptions={{
                  color: DISTRICT_BORDER_COLOR,
                  weight: 1.5,
                  fillColor: reportCountColor(counts.total),
                  fillOpacity: 0.65,
                }}
                counts={counts}
                news={newsFor(d)}
              />
            )
          })}

          {reports
            .filter((r) => r.latitude != null && r.longitude != null)
            .map((r) => (
              <CircleMarker
                key={`report-${r.id}`}
                center={[r.latitude, r.longitude]}
                radius={6}
                pathOptions={{
                  color: URGENCY_COLOR[r.urgency] ?? '#6b7280',
                  fillColor: URGENCY_COLOR[r.urgency] ?? '#6b7280',
                  fillOpacity: 0.9,
                }}
              >
                {isTouch ? (
                  <Popup>
                    <ReportMarkerContent report={r} />
                  </Popup>
                ) : (
                  <Tooltip sticky interactive>
                    <ReportMarkerContent report={r} />
                  </Tooltip>
                )}
              </CircleMarker>
            ))}
        </MapContainer>
        <MapLegend />
      </div>
      <p className="mb-6 text-xs text-gray-500">
        Batas wilayah distrik: Badan Informasi Geospasial (BIG) — layer Batas Wilayah
        Kecamatan.
      </p>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Data Distrik</h2>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Distrik</span>
          <select
            value={pickedId}
            onChange={(e) => setPickedId(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Pilih distrik</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.distrik}, {d.kabupaten}
              </option>
            ))}
          </select>
        </label>

        {pickedDistrict && (
          <div className="space-y-1 text-sm text-gray-700">
            <p>Jarak dari Wamena: {pickedDistrict.jarak_dari_wamena_km ?? '—'} km</p>
            <p>
              Waktu tempuh:{' '}
              {pickedDistrict.jenis_akses === 'udara'
                ? 'Akses udara'
                : pickedDistrict.estimasi_waktu_tempuh_jam != null
                  ? `${pickedDistrict.estimasi_waktu_tempuh_jam} jam`
                  : '—'}
            </p>
            <p>Jenis Akses: {pickedDistrict.jenis_akses}</p>
            <p>Keterangan: {pickedDistrict.keterangan_akses || '—'}</p>

            <Link
              to={`/distrik/${pickedDistrict.id}/ajukan`}
              className="mt-3 inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Ajukan Perubahan
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
