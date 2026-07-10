import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReports } from '../api/reports'

const URGENCY_STYLE = {
  Rendah: 'bg-gray-100 text-gray-700',
  Sedang: 'bg-yellow-100 text-yellow-800',
  Tinggi: 'bg-orange-100 text-orange-800',
  Kritis: 'bg-red-100 text-red-800',
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => setError('Gagal memuat daftar laporan'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Laporan</h1>
        <Link
          to="/laporan/tambah"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Tambah Laporan
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && !error && reports.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada laporan.</p>
      )}

      {reports.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Distrik</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Urgensi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {r.distrik}, {r.kabupaten}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.category}</td>
                  <td className="px-4 py-3 text-gray-900">{r.title}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${URGENCY_STYLE[r.urgency] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {r.urgency}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.submitted_by_role}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.bukti_dukung_url ? (
                      <a
                        href={r.bukti_dukung_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Bukti
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
