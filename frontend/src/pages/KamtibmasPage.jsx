import { useEffect, useState } from 'react'
import { getKamtibmasLaporan } from '../api/reports'
import { getKamtibmasBerita } from '../api/news'
import { getKamtibmasAdvisory, updateKamtibmasAdvisory } from '../api/kamtibmas'
import { getRole } from '../api/auth'
import { buktiDukungFileUrl, isImageFile } from '../lib/uploads'
import { formatWIT } from '../lib/time'

const ADVISORY_ROLES = ['ketua_tim', 'kepala_bps']
const SEVERITY_BADGE = {
  Normal: 'bg-gray-100 text-gray-700',
  Waspada: 'bg-amber-100 text-amber-800',
  Darurat: 'bg-red-600 text-white',
}

function AdvisoryBanner() {
  const [advisory, setAdvisory] = useState(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [severity, setSeverity] = useState('Normal')
  const [saving, setSaving] = useState(false)
  const canEdit = ADVISORY_ROLES.includes(getRole())

  function load() {
    getKamtibmasAdvisory().then((data) => {
      setAdvisory(data)
      setText(data.text)
      setSeverity(data.severity)
    })
  }

  useEffect(load, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateKamtibmasAdvisory(text, severity)
      setAdvisory(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!advisory) return null

  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
      {!editing ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[advisory.severity] ?? SEVERITY_BADGE.Normal}`}
            >
              {advisory.severity}
            </span>
            <p className="text-sm text-red-900">
              {advisory.text || 'Belum ada informasi advisory.'}
            </p>
            {advisory.updated_by && (
              <p className="mt-1 text-xs text-red-700">
                Diperbarui oleh {advisory.updated_by} — {formatWIT(advisory.updated_at)}
              </p>
            )}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Ubah
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input"
          >
            {Object.keys(SEVERITY_BADGE).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input"
            rows={3}
            placeholder="Informasi advisory untuk ditampilkan di halaman Kamtibmas"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function LaporanView() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getKamtibmasLaporan()
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Memuat...</p>
  if (reports.length === 0) return <p className="text-sm text-gray-500">Belum ada laporan.</p>

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="rounded-lg border border-red-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
              {r.urgency}
            </span>
            <span className="text-xs text-gray-400">
              {r.distrik}, {r.kabupaten} — {r.date}
            </span>
          </div>
          <h3 className="mb-1 font-semibold text-gray-900">{r.title}</h3>
          {r.description && <p className="mb-2 text-sm text-gray-600">{r.description}</p>}

          {r.bukti_dukung_file && isImageFile(r.bukti_dukung_file) && (
            <a href={buktiDukungFileUrl(r.bukti_dukung_file)} target="_blank" rel="noreferrer">
              <img
                src={buktiDukungFileUrl(r.bukti_dukung_file)}
                alt="Bukti dukung"
                className="mb-2 max-h-64 rounded border border-gray-200"
              />
            </a>
          )}

          <div className="flex gap-3 text-sm">
            {r.bukti_dukung_url && (
              <a href={r.bukti_dukung_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                Lihat Bukti
              </a>
            )}
            {r.bukti_dukung_file && !isImageFile(r.bukti_dukung_file) && (
              <a
                href={buktiDukungFileUrl(r.bukti_dukung_file)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Lihat File
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function BeritaView() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getKamtibmasBerita()
      .then(setNews)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Memuat...</p>
  if (news.length === 0) return <p className="text-sm text-gray-500">Belum ada berita.</p>

  return (
    <div className="space-y-3">
      {news.map((item) => (
        <div key={item.id} className="rounded-lg border border-red-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
              {item.kategori}
            </span>
            {item.kabupaten_terkait && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {item.kabupaten_terkait}
              </span>
            )}
            <span className="text-xs text-gray-400">{item.sumber}</span>
            {!item.sumber_terverifikasi && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Berita dari sumber lain
              </span>
            )}
          </div>
          <h3 className="mb-1 font-semibold text-gray-900">{item.judul}</h3>
          {item.ringkasan && <p className="mb-2 text-sm text-gray-600">{item.ringkasan}</p>}
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
            Baca Sumber
          </a>
        </div>
      ))}
    </div>
  )
}

export default function KamtibmasPage() {
  const [view, setView] = useState('laporan')

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-red-900">Kamtibmas</h1>

      <AdvisoryBanner />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView('laporan')}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            view === 'laporan' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
          }`}
        >
          Laporan
        </button>
        <button
          type="button"
          onClick={() => setView('berita')}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            view === 'berita' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
          }`}
        >
          Berita
        </button>
      </div>

      {view === 'laporan' ? <LaporanView /> : <BeritaView />}
    </div>
  )
}
