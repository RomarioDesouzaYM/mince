import { useEffect, useMemo, useState } from 'react'
import { listNews } from '../api/news'
import { NEWS_CATEGORIES } from '../constants'
import { formatWIT } from '../lib/time'

export default function BeritaPage() {
  const [news, setNews] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [kategori, setKategori] = useState('')

  useEffect(() => {
    setLoading(true)
    listNews({ kategori })
      .then(setNews)
      .catch(() => setError('Gagal memuat berita'))
      .finally(() => setLoading(false))
  }, [kategori])

  const lastUpdated = useMemo(() => {
    if (news.length === 0) return null
    return news.reduce((latest, n) => (n.created_at > latest ? n.created_at : latest), news[0].created_at)
  }, [news])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Berita</h1>
        {lastUpdated && (
          <p className="text-xs text-gray-500">
            Terakhir diperbarui: {formatWIT(lastUpdated)} — diperbarui otomatis 3× sehari
          </p>
        )}
      </div>

      <label className="mb-4 block max-w-xs">
        <span className="mb-1 block text-xs font-medium text-gray-500">Kategori</span>
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Semua</option>
          {NEWS_CATEGORIES.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && !error && news.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada berita.</p>
      )}

      <div className="space-y-3">
        {news.map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {item.kategori}
              </span>
              {item.kabupaten_terkait && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {item.kabupaten_terkait}
                </span>
              )}
              <span className="text-xs text-gray-400">{item.sumber}</span>
            </div>
            <h2 className="mb-1 font-semibold text-gray-900">{item.judul}</h2>
            {item.ringkasan && (
              <p className="mb-2 text-sm text-gray-600">{item.ringkasan}</p>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Baca Sumber
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
