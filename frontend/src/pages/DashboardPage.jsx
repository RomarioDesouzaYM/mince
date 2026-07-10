import { useEffect, useState } from 'react'
import { getDashboardStats } from '../api/dashboard'

const CARDS = [
  { key: 'total', label: 'Total Laporan' },
  { key: 'baru', label: 'Laporan Baru' },
  { key: 'tinggi_kritis', label: 'Urgensi Tinggi/Kritis' },
  { key: 'belum_selesai', label: 'Belum Selesai' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Gagal memuat statistik dashboard'))
  }, [])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {CARDS.map((card) => (
              <div
                key={card.key}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats[card.key]}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Kategori Dominan</p>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {stats.kategori_dominan ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Distrik Terbanyak</p>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {stats.distrik_terbanyak ?? '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
