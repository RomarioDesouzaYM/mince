export function DistrictMarkerContent({ district, counts, news = [] }) {
  return (
    <div className="text-sm">
      <p className="font-semibold">
        {district.distrik}, {district.kabupaten}
      </p>
      <p>
        Jarak dari Wamena: {district.jarak_dari_wamena_km ?? '—'} km
        {district.estimasi_waktu_tempuh_jam != null &&
          ` (±${district.estimasi_waktu_tempuh_jam} jam)`}
      </p>
      <p>Jenis Akses: {district.jenis_akses}</p>
      <p>Jumlah Laporan: {counts.total}</p>
      <p>Laporan Jaringan: {counts.jaringan}</p>
      <p>Laporan Listrik: {counts.listrik}</p>
      {district.weather && (
        <p>
          Cuaca: {district.weather.suhu != null ? `${Math.round(district.weather.suhu)}°C` : '—'}
          {district.weather.kondisi ? `, ${district.weather.kondisi}` : ''}
        </p>
      )}
      {district.weather && (
        <p>
          Besok:{' '}
          {district.weather.besok_min != null && district.weather.besok_max != null
            ? `${Math.round(district.weather.besok_min)}–${Math.round(district.weather.besok_max)}°C`
            : '—'}
          {district.weather.besok_kondisi ? `, ${district.weather.besok_kondisi}` : ''}
          {district.weather.peluang_hujan != null
            ? `, Peluang hujan ${district.weather.peluang_hujan}%`
            : ''}
        </p>
      )}
      {news.length > 0 && (
        <div className="mt-2">
          <p className="font-medium">Berita Terkait:</p>
          <ul className="ml-3 list-disc">
            {news.map((n) => (
              <li key={n.id}>
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
        </div>
      )}
    </div>
  )
}

export function ReportMarkerContent({ report }) {
  return (
    <div className="text-sm">
      <p className="font-semibold">{report.title}</p>
      <p>
        {report.distrik}, {report.kabupaten}
      </p>
      <p>Kategori: {report.category}</p>
      <p>Urgensi: {report.urgency}</p>
      <p>Status: {report.status}</p>
      {report.bukti_dukung_url && (
        <a
          href={report.bukti_dukung_url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          Lihat Bukti
        </a>
      )}
    </div>
  )
}
