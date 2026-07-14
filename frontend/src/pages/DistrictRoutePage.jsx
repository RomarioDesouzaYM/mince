import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listDistricts, updateKondisiJalan } from '../api/districts'
import { getRole } from '../api/auth'
import { KONDISI_JALAN } from '../constants'
import DistrictRouteMap from '../components/DistrictRouteMap'

const KONDISI_JALAN_EDITOR_ROLES = ['ketua_tim', 'kepala_bps']

export default function DistrictRoutePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [district, setDistrict] = useState(null)
  const [error, setError] = useState('')
  const [kondisiDraft, setKondisiDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    listDistricts()
      .then((districts) => {
        const d = districts.find((x) => x.id === Number(id))
        if (!d) {
          setError('Distrik tidak ditemukan')
          return
        }
        setDistrict(d)
        setKondisiDraft(d.kondisi_jalan ?? '')
      })
      .catch(() => setError('Gagal memuat data distrik'))
  }, [id])

  async function handleSaveKondisiJalan(e) {
    e.preventDefault()
    if (!kondisiDraft) return
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateKondisiJalan(id, kondisiDraft)
      setDistrict(updated)
    } catch {
      setSaveError('Gagal menyimpan kondisi jalan')
    } finally {
      setSaving(false)
    }
  }

  if (error && !district) {
    return <p className="text-sm text-red-600">{error}</p>
  }
  if (!district) {
    return <p className="text-sm text-gray-500">Memuat...</p>
  }

  const canEditKondisiJalan = KONDISI_JALAN_EDITOR_ROLES.includes(getRole())

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Rute ke Distrik</h1>
      <p className="mb-6 text-sm text-gray-500">
        {district.distrik}, {district.kabupaten}
      </p>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-1 text-sm text-gray-700">
          <p>Jarak dari Wamena: {district.jarak_dari_wamena_km ?? '—'} km</p>
          <p>
            Waktu tempuh:{' '}
            {district.jenis_akses === 'udara'
              ? 'Akses udara'
              : district.estimasi_waktu_tempuh_jam != null
                ? `${district.estimasi_waktu_tempuh_jam} jam`
                : '—'}
          </p>
          <p>Jenis Akses: {district.jenis_akses}</p>
          <p>Kondisi Jalan: {district.kondisi_jalan ?? 'Belum dinilai'}</p>
        </div>

        {district.weather && (
          <div className="space-y-1 border-t border-gray-100 pt-4 text-sm text-gray-700">
            <p>
              Cuaca: {district.weather.suhu != null ? `${Math.round(district.weather.suhu)}°C` : '—'}
              {district.weather.kondisi ? `, ${district.weather.kondisi}` : ''}
            </p>
            <p>
              Besok:{' '}
              {district.weather.besok_min != null && district.weather.besok_max != null
                ? `${Math.round(district.weather.besok_min)}–${Math.round(district.weather.besok_max)}°C`
                : '—'}
              {district.weather.besok_kondisi ? `, ${district.weather.besok_kondisi}` : ''}
              {district.weather.peluang_hujan != null
                ? `, Peluang hujan ${district.weather.peluang_hujan}%`
                : ''}
            </p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-2 text-sm font-medium text-gray-900">Rute</p>
          <DistrictRouteMap district={district} />
        </div>

        {canEditKondisiJalan && (
          <form
            onSubmit={handleSaveKondisiJalan}
            className="flex items-end gap-3 border-t border-gray-100 pt-4"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Perbarui Kondisi Jalan
              </span>
              <select
                value={kondisiDraft}
                onChange={(e) => setKondisiDraft(e.target.value)}
                className="input"
              >
                <option value="" disabled>
                  Pilih kondisi
                </option>
                {KONDISI_JALAN.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        )}
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => navigate('/peta')}
            className="rounded px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  )
}
