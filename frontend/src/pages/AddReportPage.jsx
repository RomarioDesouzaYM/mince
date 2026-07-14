import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { createReport } from '../api/reports'
import { listDistricts } from '../api/districts'
import { CATEGORIES, KEGIATAN, ROLES, URGENCY } from '../constants'

const WAMENA_CENTER = [-4.0917, 138.95]

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  kabupaten: '',
  distrik: '',
  category: CATEGORIES[0],
  urgency: URGENCY[0],
  kegiatan: KEGIATAN[0],
  title: '',
  description: '',
  source: '',
  submitted_by_role: ROLES[0],
  bukti_dukung_url: '',
  latitude: '',
  longitude: '',
}

function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function LocationPicker({ center, position, onPick }) {
  return (
    <div className="overflow-hidden rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 p-2">
      <p className="mb-2 text-xs font-medium text-blue-700">
        Klik peta untuk menandai lokasi bukti dukung
      </p>
      <div className="h-48 w-full overflow-hidden rounded">
        <MapContainer center={center} zoom={10} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} />
          <ClickToPick onPick={onPick} />
          {position && (
            <CircleMarker
              center={position}
              radius={9}
              pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.9 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}

export default function AddReportPage() {
  const navigate = useNavigate()
  const [districts, setDistricts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listDistricts()
      .then(setDistricts)
      .catch(() => setError('Gagal memuat daftar distrik'))
  }, [])

  const kabupatenList = useMemo(
    () => [...new Set(districts.map((d) => d.kabupaten))],
    [districts],
  )
  const distrikOptions = useMemo(
    () => districts.filter((d) => d.kabupaten === form.kabupaten),
    [districts, form.kabupaten],
  )

  // Approximate/fallback center only (plain average, not area-weighted) — good
  // enough to point the picker at the right part of the map, not a precise centroid.
  const pickerCenter = useMemo(() => {
    const inKabupaten = districts.filter((d) => d.kabupaten === form.kabupaten)
    if (inKabupaten.length === 0) return WAMENA_CENTER
    const avgLat = inKabupaten.reduce((sum, d) => sum + d.latitude, 0) / inKabupaten.length
    const avgLng = inKabupaten.reduce((sum, d) => sum + d.longitude, 0) / inKabupaten.length
    return [avgLat, avgLng]
  }, [form.kabupaten, districts])

  const pickedPosition =
    form.latitude !== '' && form.longitude !== ''
      ? [Number(form.latitude), Number(form.longitude)]
      : null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleKabupatenChange(value) {
    setForm((prev) => ({ ...prev, kabupaten: value, distrik: '' }))
  }

  function handlePick(lat, lng) {
    setForm((prev) => ({ ...prev, latitude: lat.toFixed(5), longitude: lng.toFixed(5) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      }
      await createReport(payload)
      navigate('/laporan', { replace: true })
    } catch {
      setError('Gagal menyimpan laporan. Periksa kembali isian Anda.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Tambah Laporan
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tanggal">
            <input
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              className="input"
              required
            />
          </Field>

          <Field label="Peran Pengirim">
            <select
              value={form.submitted_by_role}
              onChange={(e) => update('submitted_by_role', e.target.value)}
              className="input"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kabupaten">
            <select
              value={form.kabupaten}
              onChange={(e) => handleKabupatenChange(e.target.value)}
              className="input"
              required
            >
              <option value="" disabled>
                Pilih kabupaten
              </option>
              {kabupatenList.map((kab) => (
                <option key={kab} value={kab}>
                  {kab}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Distrik">
            <select
              value={form.distrik}
              onChange={(e) => update('distrik', e.target.value)}
              className="input"
              required
              disabled={!form.kabupaten}
            >
              <option value="" disabled>
                Pilih distrik
              </option>
              {distrikOptions.map((d) => (
                <option key={d.id} value={d.distrik}>
                  {d.distrik}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kategori">
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="input"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Urgensi">
            <select
              value={form.urgency}
              onChange={(e) => update('urgency', e.target.value)}
              className="input"
            >
              {URGENCY.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kegiatan">
            <select
              value={form.kegiatan}
              onChange={(e) => update('kegiatan', e.target.value)}
              className="input"
            >
              {KEGIATAN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Judul">
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="input"
            required
          />
        </Field>

        <Field label="Deskripsi">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="input"
            rows={3}
          />
        </Field>

        <Field label="Sumber">
          <input
            type="text"
            value={form.source}
            onChange={(e) => update('source', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Link Bukti Dukung">
          <input
            type="url"
            value={form.bukti_dukung_url}
            onChange={(e) => update('bukti_dukung_url', e.target.value)}
            className="input"
            placeholder="https://drive.google.com/..."
          />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Lokasi Bukti Dukung (opsional)
          </span>
          <LocationPicker center={pickerCenter} position={pickedPosition} onPick={handlePick} />
          <div className="mt-2 grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input
                type="number"
                step="0.00001"
                value={form.latitude}
                onChange={(e) => update('latitude', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.00001"
                value={form.longitude}
                onChange={(e) => update('longitude', e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Laporan'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  )
}
