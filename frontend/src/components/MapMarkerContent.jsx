export function DistrictMarkerContent({ district, counts, onEdit }) {
  return (
    <div className="text-sm">
      <p className="font-semibold">
        {district.distrik}, {district.kabupaten}
      </p>
      <p>Jarak dari Wamena: {district.jarak_dari_wamena_km ?? '—'} km</p>
      <p>
        Waktu tempuh:{' '}
        {district.jenis_akses === 'udara'
          ? 'Akses udara'
          : district.estimasi_waktu_tempuh_jam != null
            ? `${district.estimasi_waktu_tempuh_jam} jam`
            : '—'}
      </p>
      <p>Jenis Akses: {district.jenis_akses}</p>
      <p>Laporan Jaringan: {counts.jaringan}</p>
      <p>Laporan Listrik: {counts.listrik}</p>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 text-blue-600 hover:underline"
        >
          Edit distrik ini
        </button>
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
          Lihat Bukti: {report.title}
        </a>
      )}
    </div>
  )
}
