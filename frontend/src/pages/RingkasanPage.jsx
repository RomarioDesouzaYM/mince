import { useEffect, useState } from 'react'
import { getDailySummary } from '../api/summary'
import { formatWIT } from '../lib/time'

function formatKabupatenLine(row) {
  const jarak = row.jarak_rata_rata_km != null ? `${row.jarak_rata_rata_km} km` : '—'
  const waktu = row.waktu_tempuh_rata_rata_jam != null ? `${row.waktu_tempuh_rata_rata_jam} jam` : '—'
  const cuaca =
    row.suhu_rata_rata != null
      ? `${Math.round(row.suhu_rata_rata)}°C${row.kondisi_dominan ? `, ${row.kondisi_dominan}` : ''}`
      : '—'
  return `${row.kabupaten}: jarak rata-rata ${jarak}, waktu tempuh rata-rata ${waktu}, laporan jaringan ${row.laporan_jaringan}, laporan listrik ${row.laporan_listrik}, cuaca ${cuaca}`
}

function buildPlainText(summary) {
  return [
    `Ringkasan Harian MINCE — ${formatWIT(summary.generated_at)}`,
    '',
    ...summary.kabupaten.map(formatKabupatenLine),
    '',
    'Berita Terkini:',
    ...summary.berita_terkini.map((n) => `- ${n.judul} (${n.sumber}) ${n.url}`),
  ].join('\n')
}

export default function RingkasanPage() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  function generate() {
    setLoading(true)
    setError('')
    getDailySummary()
      .then(setSummary)
      .catch(() => setError('Gagal memuat ringkasan'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    generate()
  }, [])

  async function handleCopy() {
    if (!summary) return
    await navigator.clipboard.writeText(buildPlainText(summary))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ringkasan Harian</h1>
          {summary && (
            <p className="text-xs text-gray-500">Dibuat: {formatWIT(summary.generated_at)}</p>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={generate}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!summary}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {copied ? 'Disalin!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!summary}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Print
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && !error && summary && (
        <>
          <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Kabupaten</th>
                  <th className="px-4 py-3">Jarak Rata-rata</th>
                  <th className="px-4 py-3">Waktu Tempuh Rata-rata</th>
                  <th className="px-4 py-3">Laporan Jaringan</th>
                  <th className="px-4 py-3">Laporan Listrik</th>
                  <th className="px-4 py-3">Cuaca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.kabupaten.map((row) => (
                  <tr key={row.kabupaten}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {row.kabupaten}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {row.jarak_rata_rata_km != null ? `${row.jarak_rata_rata_km} km` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {row.waktu_tempuh_rata_rata_jam != null
                        ? `${row.waktu_tempuh_rata_rata_jam} jam`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.laporan_jaringan}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.laporan_listrik}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {row.suhu_rata_rata != null
                        ? `${Math.round(row.suhu_rata_rata)}°C${row.kondisi_dominan ? `, ${row.kondisi_dominan}` : ''}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 text-lg font-semibold text-gray-900">Berita Terkini</h2>
          {summary.berita_terkini.length === 0 && (
            <p className="text-sm text-gray-500">Belum ada berita.</p>
          )}
          <div className="space-y-3">
            {summary.berita_terkini.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {item.kategori}
                  </span>
                  <span className="text-xs text-gray-400">{item.sumber}</span>
                </div>
                <h3 className="mb-1 font-semibold text-gray-900">{item.judul}</h3>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline print:hidden"
                >
                  Baca Sumber
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
