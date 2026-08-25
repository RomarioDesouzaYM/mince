import { useEffect, useState } from 'react'
import { getRole } from '../api/auth'
import {
  getLatestKegiatan, getSampelSummary, importSampelTarget, updateRealisasi, updateTargetOverride,
} from '../api/sampelTarget'
import { KEGIATAN } from '../constants'

const APPROVER_ROLES = ['ketua_tim', 'kepala_bps']

export default function SampelTargetPage() {
  const canEditRealisasi = APPROVER_ROLES.includes(getRole())

  const [kegiatan, setKegiatan] = useState(KEGIATAN[0])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState(null)
  const [importError, setImportError] = useState('')

  const [editingKey, setEditingKey] = useState(null)
  const [editingValue, setEditingValue] = useState('')

  const [showTargetForm, setShowTargetForm] = useState(false)
  const [targetDistrikKey, setTargetDistrikKey] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [targetError, setTargetError] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)

  function loadSummary() {
    setLoading(true)
    setError('')
    getSampelSummary(kegiatan)
      .then(setRows)
      .catch(() => setError('Gagal memuat data target vs realisasi'))
      .finally(() => setLoading(false))
  }

  useEffect(loadSummary, [kegiatan])

  // Default to whatever kegiatan was actually imported most recently, not just the
  // first entry in the static KEGIATAN list (which may have zero imported data).
  useEffect(() => {
    getLatestKegiatan()
      .then(({ kegiatan: latest }) => {
        if (latest) setKegiatan(latest)
      })
      .catch(() => {})
  }, [])

  async function handleImport(e) {
    e.preventDefault()
    if (!file) return
    setImporting(true)
    setImportError('')
    setImportSummary(null)
    try {
      const summary = await importSampelTarget(file, kegiatan)
      setImportSummary(summary)
      loadSummary()
    } catch {
      setImportError('Gagal mengimpor file CSV')
    } finally {
      setImporting(false)
    }
  }

  function startEdit(row) {
    setEditingKey(`${row.kabupaten}|${row.distrik}`)
    setEditingValue(String(row.realisasi))
  }

  async function saveEdit(row) {
    const value = Number(editingValue)
    if (!Number.isInteger(value) || value < 0) return
    await updateRealisasi(kegiatan, row.kabupaten, row.distrik, value)
    setEditingKey(null)
    loadSummary()
  }

  async function handleTargetOverride(e) {
    e.preventDefault()
    const value = Number(targetValue)
    if (!targetDistrikKey || !Number.isInteger(value) || value < 0) return
    const [kabupaten, distrik] = targetDistrikKey.split('|')
    setSavingTarget(true)
    setTargetError('')
    try {
      await updateTargetOverride(kegiatan, kabupaten, distrik, value)
      setShowTargetForm(false)
      setTargetDistrikKey('')
      setTargetValue('')
      loadSummary()
    } catch {
      setTargetError('Gagal menyimpan target manual')
    } finally {
      setSavingTarget(false)
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Target vs Realisasi Sampel</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-600">
        Target diimpor dari ekspor sampel Fasih, atau diisi manual oleh ketua tim
        (menimpa hasil CSV bila ada, ditandai jelas di kolom Target). Realisasi diisi
        manual oleh ketua tim, belum dihitung otomatis dari data lain. Penanda "Perlu
        Perhatian" di bawah ini{' '}
        <strong>sementara</strong> (ambang batas belum final): menggabungkan berita
        Keamanan terkini, kondisi jalan, curah hujan, dan laporan gangguan jaringan
        yang belum selesai. Kolom "Berita Penting/Darurat" terpisah dari itu --
        menampilkan berita Keamanan maupun Bencana terkini di sekitar distrik ini
        sebagai <strong>sinyal kewaspadaan, bukan prediksi keterlambatan</strong>.
        Tidak ada yang memengaruhi Status Perhatian di halaman Risiko.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Kegiatan</label>
          <select
            value={kegiatan}
            onChange={(e) => setKegiatan(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {KEGIATAN.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        {canEditRealisasi && (
          <button
            type="button"
            onClick={() => setShowTargetForm((v) => !v)}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Input Target Manual
          </button>
        )}
      </div>

      <form onSubmit={handleImport} className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Impor Sampel Target (CSV Fasih)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={!file || importing}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {importing ? 'Mengimpor...' : `Impor untuk "${kegiatan}"`}
          </button>
        </div>

        {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}

        {importSummary && (
          <div className="mt-4 text-sm text-gray-700">
            <p>
              {importSummary.imported} dari {importSummary.rows_total} baris berhasil diimpor
              ({importSummary.skipped} dilewati).
            </p>
            {Object.keys(importSummary.skipped_reasons).length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-gray-500">
                {Object.entries(importSummary.skipped_reasons).map(([reason, count]) => (
                  <li key={reason}>{reason}: {count}</li>
                ))}
              </ul>
            )}
            {importSummary.unmatched_distrik.length > 0 && (
              <p className="mt-2 text-xs text-orange-700">
                Distrik tidak dikenal (tidak diimpor): {importSummary.unmatched_distrik.join(', ')}
              </p>
            )}
          </div>
        )}
      </form>

      {showTargetForm && (
        <form onSubmit={handleTargetOverride} className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Input Target Manual</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={targetDistrikKey}
              onChange={(e) => setTargetDistrikKey(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih distrik...</option>
              {rows.map((r) => {
                const key = `${r.kabupaten}|${r.distrik}`
                return <option key={key} value={key}>{r.distrik}, {r.kabupaten}</option>
              })}
            </select>
            <input
              type="number"
              min="0"
              placeholder="Jumlah target"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="w-32 rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!targetDistrikKey || targetValue === '' || savingTarget}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingTarget ? 'Menyimpan...' : 'Simpan Target Manual'}
            </button>
            <button
              type="button"
              onClick={() => setShowTargetForm(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Batal
            </button>
          </div>
          {targetError && <p className="mt-3 text-sm text-red-600">{targetError}</p>}
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Distrik</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Realisasi</th>
                <th className="px-4 py-3">Curah Hujan (mm)</th>
                <th className="px-4 py-3">Perlu Perhatian (Sementara)</th>
                <th className="px-4 py-3">Berita Penting/Darurat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const key = `${r.kabupaten}|${r.distrik}`
                const isEditing = editingKey === key
                return (
                  <tr key={key}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {r.distrik}, {r.kabupaten}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span>{r.target}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            r.target_source === 'manual'
                              ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {r.target_source === 'manual' ? 'Manual' : 'CSV'}
                          </span>
                        </div>
                        {r.target_source === 'manual' && r.target_csv_count > 0 && (
                          <span className="max-w-[10rem] text-xs text-orange-700">
                            manual override aktif, {r.target_csv_count} sampel dari CSV diabaikan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-20 rounded border border-gray-300 px-2 py-1"
                          />
                          <button
                            type="button"
                            onClick={() => saveEdit(r)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{r.realisasi}</span>
                          {canEditRealisasi && (
                            <button
                              type="button"
                              onClick={() => startEdit(r)}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              Ubah
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {r.curah_hujan != null ? `${r.curah_hujan}mm` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.delay_flag ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                            Ya
                          </span>
                          <ul className="max-w-xs list-disc pl-4 text-xs text-gray-500">
                            {r.delay_flag_reasons.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.berita_penting.length > 0 ? (
                        <ul className="max-w-xs list-disc pl-4 text-xs text-gray-700">
                          {r.berita_penting.map((n, i) => (
                            <li key={i}>
                              <span className="mr-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-800">
                                {n.kategori}
                              </span>
                              <a
                                href={n.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {n.judul}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
