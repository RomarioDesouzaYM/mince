import { useEffect, useState } from 'react'
import { listDistrictRisk } from '../api/risk'
import { URGENCY_BADGE } from '../constants'

export default function RisikoPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listDistrictRisk()
      .then(setRows)
      .catch(() => setError('Gagal memuat data indikator risiko'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Indikator Evaluasi Risiko</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-600">
        Status Perhatian adalah aturan sederhana berbasis laporan, bukan skor gabungan:
        distrik ditandai <strong>Kritis</strong> jika ada 3+ laporan belum selesai atau
        urgensi rata-rata &ge;3.5; <strong>Tinggi</strong> jika 5+ laporan atau urgensi
        rata-rata &ge;2.5; <strong>Sedang</strong> jika 2+ laporan; selain itu{' '}
        <strong>Rendah</strong>. Jarak, waktu tempuh, dan cuaca ditampilkan sebagai
        konteks saja — bukan bagian dari aturan ini.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Distrik</th>
                <th className="px-4 py-3">Jumlah Laporan</th>
                <th className="px-4 py-3">Belum Selesai</th>
                <th className="px-4 py-3">Urgensi Rata-rata</th>
                <th className="px-4 py-3">Laporan Jaringan</th>
                <th className="px-4 py-3">Laporan Listrik</th>
                <th className="px-4 py-3">Jarak</th>
                <th className="px-4 py-3">Waktu Tempuh</th>
                <th className="px-4 py-3">Cuaca Saat Ini</th>
                <th className="px-4 py-3">Status Perhatian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.district_id}>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {r.distrik}, {r.kabupaten}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.jumlah_laporan}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.belum_selesai}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.urgensi_rata_rata}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.laporan_jaringan}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{r.laporan_listrik}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {r.jarak_dari_wamena_km ?? '—'} km
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {r.jenis_akses === 'udara'
                      ? 'Akses udara'
                      : r.estimasi_waktu_tempuh_jam != null
                        ? `${r.estimasi_waktu_tempuh_jam} jam`
                        : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {r.cuaca_saat_ini
                      ? `${Math.round(r.cuaca_saat_ini.suhu)}°C, ${r.cuaca_saat_ini.kondisi}`
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${URGENCY_BADGE[r.status_perhatian] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {r.status_perhatian}
                    </span>
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
