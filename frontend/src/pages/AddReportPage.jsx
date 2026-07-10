import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createReport } from '../api/reports'
import { listDistricts } from '../api/districts'
import { CATEGORIES, ROLES, URGENCY } from '../constants'

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  kabupaten: '',
  distrik: '',
  category: CATEGORIES[0],
  urgency: URGENCY[0],
  title: '',
  description: '',
  source: '',
  submitted_by_role: ROLES[0],
  bukti_dukung_url: '',
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

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleKabupatenChange(value) {
    setForm((prev) => ({ ...prev, kabupaten: value, distrik: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createReport(form)
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
