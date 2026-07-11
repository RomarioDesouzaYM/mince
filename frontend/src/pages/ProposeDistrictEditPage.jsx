import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listDistricts } from '../api/districts'
import { createDistrictProposal } from '../api/districtProposals'

export default function ProposeDistrictEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [district, setDistrict] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listDistricts()
      .then((districts) => {
        const d = districts.find((x) => x.id === Number(id))
        if (!d) {
          setError('Distrik tidak ditemukan')
          return
        }
        setDistrict(d)
        setForm({
          jarak_dari_wamena_km: d.jarak_dari_wamena_km ?? '',
          estimasi_waktu_tempuh_jam: d.estimasi_waktu_tempuh_jam ?? '',
          jenis_akses: d.jenis_akses,
          keterangan_akses: d.keterangan_akses ?? '',
          alasan: '',
          bukti_dukung_url: '',
        })
      })
      .catch(() => setError('Gagal memuat data distrik'))
  }, [id])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        jarak_dari_wamena_km:
          form.jarak_dari_wamena_km === '' ? null : Number(form.jarak_dari_wamena_km),
        estimasi_waktu_tempuh_jam:
          form.jenis_akses === 'udara' || form.estimasi_waktu_tempuh_jam === ''
            ? null
            : Number(form.estimasi_waktu_tempuh_jam),
        jenis_akses: form.jenis_akses,
        keterangan_akses: form.keterangan_akses,
        alasan: form.alasan,
        bukti_dukung_url: form.bukti_dukung_url,
      }
      await createDistrictProposal(id, payload)
      navigate('/peta', { replace: true })
    } catch {
      setError('Gagal mengirim usulan perubahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !district) {
    return <p className="text-sm text-red-600">{error}</p>
  }
  if (!form) {
    return <p className="text-sm text-gray-500">Memuat...</p>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Ajukan Perubahan Distrik</h1>
      <p className="mb-6 text-sm text-gray-500">
        {district.distrik}, {district.kabupaten} — perubahan berlaku setelah disetujui
        Ketua Tim atau Kepala BPS.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <Field label="Jarak dari Wamena (km)">
          <input
            type="number"
            step="0.1"
            value={form.jarak_dari_wamena_km}
            onChange={(e) => update('jarak_dari_wamena_km', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Jenis Akses">
          <select
            value={form.jenis_akses}
            onChange={(e) => update('jenis_akses', e.target.value)}
            className="input"
          >
            <option value="darat_baik">darat_baik</option>
            <option value="darat_sulit">darat_sulit</option>
            <option value="udara">udara</option>
          </select>
        </Field>

        <Field label="Estimasi Waktu Tempuh (jam)">
          <input
            type="number"
            step="0.1"
            value={form.estimasi_waktu_tempuh_jam}
            onChange={(e) => update('estimasi_waktu_tempuh_jam', e.target.value)}
            disabled={form.jenis_akses === 'udara'}
            className="input disabled:bg-gray-100"
          />
        </Field>

        <Field label="Keterangan Akses">
          <input
            type="text"
            value={form.keterangan_akses}
            onChange={(e) => update('keterangan_akses', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Alasan Perubahan">
          <textarea
            value={form.alasan}
            onChange={(e) => update('alasan', e.target.value)}
            className="input"
            rows={3}
            required
          />
        </Field>

        <Field label="Link Bukti Dukung (opsional)">
          <input
            type="url"
            value={form.bukti_dukung_url}
            onChange={(e) => update('bukti_dukung_url', e.target.value)}
            className="input"
            placeholder="https://drive.google.com/..."
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : 'Kirim Usulan'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/peta')}
            className="rounded px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}
