import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/dashboard'
import { listNews } from '../api/news'
import { listDistricts } from '../api/districts'
import { formatWIT } from '../lib/time'

const CARDS = [
  { key: 'total', label: 'Total Laporan' },
  { key: 'baru', label: 'Laporan Baru' },
  { key: 'tinggi_kritis', label: 'Urgensi Tinggi/Kritis' },
  { key: 'belum_selesai', label: 'Belum Selesai' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [topNews, setTopNews] = useState([])
  const [wamenaWeather, setWamenaWeather] = useState(null)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Gagal memuat statistik dashboard'))
    listNews()
      .then((news) => setTopNews(news.slice(0, 3)))
      .catch(() => {})
    listDistricts()
      .then((districts) => {
        const wamena = districts.find((d) => d.distrik === 'Wamena Kota')
        setWamenaWeather(wamena?.weather ?? null)
      })
      .catch(() => {})
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Berita Terkini</p>
            <Link to="/berita" className="text-xs text-blue-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          {topNews.length === 0 && <p className="text-sm text-gray-500">Belum ada berita.</p>}
          <div className="space-y-3">
            {topNews.map((item) => (
              <div key={item.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-gray-900">{item.judul}</p>
                <p className="text-xs text-gray-500">
                  {item.kategori} · {formatWIT(item.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">Cuaca — Wamena Kota</p>
          {wamenaWeather ? (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {wamenaWeather.suhu != null ? `${Math.round(wamenaWeather.suhu)}°C` : '—'}
              </p>
              <p className="text-sm text-gray-600">{wamenaWeather.kondisi ?? '—'}</p>
              <p className="mt-2 text-xs text-gray-400">
                diperbarui otomatis 3× sehari — {formatWIT(wamenaWeather.updated_at)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Belum ada data cuaca.</p>
          )}
        </div>
      </div>
    </div>
  )
}
