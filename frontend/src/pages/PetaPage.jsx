import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { listDistricts } from '../api/districts'
import { listReports } from '../api/reports'
import { listNews } from '../api/news'
import { listDistrictRisk } from '../api/risk'
import { URGENCY_COLOR, reportCountColor } from '../constants'
import { buildDistrictBoundaryFeatureCollection } from '../data/districtBoundaryMap'
import ReportFilters from '../components/ReportFilters'
import MapLegend from '../components/MapLegend'
import DistrictPolygon from '../components/DistrictPolygon'
import ReportMarker from '../components/ReportMarker'

const WAMENA_CENTER = [-4.0917, 138.95]
// Neutral, deliberately outside the violet fill ramp so the border stays visible
// against every shading bucket (a ramp-matched border color would vanish whenever a
// district's fill happened to land on that same step).
const DISTRICT_BORDER_COLOR = '#374151'
const JARINGAN_CATEGORY = 'Jaringan Komunikasi'
const LISTRIK_CATEGORY = 'Listrik & Penerangan'
const FALLBACK_FILL = '#d1d5db'

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

// Report markers must render above the choropleth polygons regardless of JSX/DOM
// order (which is fragile against re-renders reshuffling insertion order within the
// shared overlayPane) -- a dedicated pane with a higher z-index than overlayPane
// (400) guarantees the stacking order structurally instead.
const REPORT_PANE_NAME = 'reportMarkers'
const REPORT_PANE_Z_INDEX = 650

function CreateReportPane() {
  const map = useMap()
  useEffect(() => {
    if (!map.getPane(REPORT_PANE_NAME)) {
      map.createPane(REPORT_PANE_NAME)
      map.getPane(REPORT_PANE_NAME).style.zIndex = REPORT_PANE_Z_INDEX
    }
  }, [map])
  return null
}

export default function PetaPage() {
  const [districts, setDistricts] = useState([])
  const [reports, setReports] = useState([])
  const [news, setNews] = useState([])
  const [risk, setRisk] = useState([])
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [pickedId, setPickedId] = useState('')
  const [shadingMode, setShadingMode] = useState('jumlah_laporan')

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

  useEffect(() => {
    listDistrictRisk()
      .then(setRisk)
      .catch(() => {})
  }, [])

  const riskByDistrict = useMemo(() => {
    const map = {}
    for (const r of risk) map[`${r.kabupaten}|${r.distrik}`] = r
    return map
  }, [risk])

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

  function fillColorFor(district, counts) {
    if (shadingMode === 'status_perhatian') {
      const statusPerhatian = riskByDistrict[`${district.kabupaten}|${district.distrik}`]?.status_perhatian
      return URGENCY_COLOR[statusPerhatian] ?? FALLBACK_FILL
    }
    return reportCountColor(counts.total)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Peta</h1>

      <ReportFilters filters={filters} onChange={setFilters} className="mb-4" />

      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Tampilkan:</span>
        <button
          type="button"
          onClick={() => setShadingMode('jumlah_laporan')}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            shadingMode === 'jumlah_laporan'
              ? 'bg-gray-900 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Jumlah Laporan
        </button>
        <button
          type="button"
          onClick={() => setShadingMode('status_perhatian')}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            shadingMode === 'status_perhatian'
              ? 'bg-gray-900 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Status Perhatian
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="relative mb-2 h-[65vh] w-full overflow-hidden rounded-lg border border-gray-200">
        <MapContainer center={WAMENA_CENTER} zoom={9} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds districts={filteredDistricts} />
          <CreateReportPane />

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
                  fillColor: fillColorFor(d, counts),
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
              <ReportMarker
                key={`report-${r.id}`}
                report={r}
                center={[r.latitude, r.longitude]}
                radius={6}
                pane={REPORT_PANE_NAME}
                pathOptions={{
                  color: URGENCY_COLOR[r.urgency] ?? '#6b7280',
                  fillColor: URGENCY_COLOR[r.urgency] ?? '#6b7280',
                  fillOpacity: 0.9,
                }}
              />
            ))}
        </MapContainer>
        <MapLegend mode={shadingMode} />
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
