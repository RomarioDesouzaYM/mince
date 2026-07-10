import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { listDistricts, updateDistrict } from '../api/districts'
import { listReports } from '../api/reports'
import { listNews } from '../api/news'
import { URGENCY_COLOR } from '../constants'
import ReportFilters from '../components/ReportFilters'
import { DistrictMarkerContent, ReportMarkerContent } from '../components/MapMarkerContent'

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
const DISTRICT_COLOR = '#2563eb'
const JARINGAN_CATEGORY = 'Jaringan Komunikasi'
const LISTRIK_CATEGORY = 'Listrik & Penerangan'

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
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const editPanelRef = useRef(null)
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

  useEffect(() => {
    setSaveError('')
    setSaveSuccess(false)
  }, [editingId])

  useEffect(() => {
    if (!editingId) {
      setEditForm(null)
      return
    }
    const district = districts.find((d) => d.id === Number(editingId))
    if (!district) return
    setEditForm({
      jarak_dari_wamena_km: district.jarak_dari_wamena_km ?? '',
      estimasi_waktu_tempuh_jam: district.estimasi_waktu_tempuh_jam ?? '',
      jenis_akses: district.jenis_akses,
      keterangan_akses: district.keterangan_akses ?? '',
    })
  }, [editingId, districts])

  const filteredDistricts = useMemo(() => {
    if (!filters.kabupaten) return districts
    return districts.filter((d) => d.kabupaten === filters.kabupaten)
  }, [districts, filters.kabupaten])

  function countsFor(district) {
    const distrikReports = reports.filter(
      (r) => r.distrik === district.distrik && r.kabupaten === district.kabupaten,
    )
    return {
      jaringan: distrikReports.filter((r) => r.category === JARINGAN_CATEGORY).length,
      listrik: distrikReports.filter((r) => r.category === LISTRIK_CATEGORY).length,
    }
  }

  function newsFor(district) {
    return news.filter((n) => n.kabupaten_terkait === district.kabupaten).slice(0, 2)
  }

  function updateEditField(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  function jumpToEdit(districtId) {
    setEditingId(String(districtId))
    editPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSaveDistrict(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const payload = {
        jarak_dari_wamena_km:
          editForm.jarak_dari_wamena_km === '' ? null : Number(editForm.jarak_dari_wamena_km),
        estimasi_waktu_tempuh_jam:
          editForm.jenis_akses === 'udara' || editForm.estimasi_waktu_tempuh_jam === ''
            ? null
            : Number(editForm.estimasi_waktu_tempuh_jam),
        jenis_akses: editForm.jenis_akses,
        keterangan_akses: editForm.keterangan_akses,
      }
      const updated = await updateDistrict(editingId, payload)
      setDistricts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch {
      setSaveError('Gagal menyimpan perubahan distrik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Peta</h1>

      <ReportFilters filters={filters} onChange={setFilters} className="mb-4" />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 h-[65vh] w-full overflow-hidden rounded-lg border border-gray-200">
        <MapContainer center={WAMENA_CENTER} zoom={9} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds districts={filteredDistricts} />

          {filteredDistricts.map((d) => {
            const counts = countsFor(d)
            const relevantNews = newsFor(d)
            return (
              <CircleMarker
                key={`district-${d.id}`}
                center={[d.latitude, d.longitude]}
                radius={9}
                pathOptions={{ color: DISTRICT_COLOR, fillColor: DISTRICT_COLOR, fillOpacity: 0.8 }}
              >
                {isTouch ? (
                  <Popup>
                    <DistrictMarkerContent
                      district={d}
                      counts={counts}
                      news={relevantNews}
                      onEdit={() => jumpToEdit(d.id)}
                    />
                  </Popup>
                ) : (
                  <Tooltip sticky interactive>
                    <DistrictMarkerContent district={d} counts={counts} news={relevantNews} />
                  </Tooltip>
                )}
              </CircleMarker>
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
      </div>

      <div ref={editPanelRef} className="max-w-md rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Edit Data Distrik</h2>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Distrik</span>
          <select
            value={editingId}
            onChange={(e) => setEditingId(e.target.value)}
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

        {editForm && (
          <form onSubmit={handleSaveDistrict} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Jarak dari Wamena (km)
              </span>
              <input
                type="number"
                step="0.1"
                value={editForm.jarak_dari_wamena_km}
                onChange={(e) => updateEditField('jarak_dari_wamena_km', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Jenis Akses</span>
              <select
                value={editForm.jenis_akses}
                onChange={(e) => updateEditField('jenis_akses', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="darat_baik">darat_baik</option>
                <option value="darat_sulit">darat_sulit</option>
                <option value="udara">udara</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Estimasi Waktu Tempuh (jam)
              </span>
              <input
                type="number"
                step="0.1"
                value={editForm.estimasi_waktu_tempuh_jam}
                onChange={(e) => updateEditField('estimasi_waktu_tempuh_jam', e.target.value)}
                disabled={editForm.jenis_akses === 'udara'}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Keterangan Akses
              </span>
              <input
                type="text"
                value={editForm.keterangan_akses}
                onChange={(e) => updateEditField('keterangan_akses', e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {saveSuccess && (
                <p className="rounded bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800">
                  ✓ Data distrik berhasil diubah
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
