import { REPORT_COUNT_COLOR_SCALE, URGENCY_COLOR } from '../constants'

export default function MapLegend({ mode }) {
  return (
    <div className="absolute bottom-3 right-3 z-[1000] rounded-lg border border-gray-200 bg-white/95 p-3 text-xs shadow-md">
      {mode === 'status_perhatian' ? (
        <>
          <p className="mb-1 font-semibold text-gray-900">Status Perhatian (Distrik)</p>
          <ul className="mb-3 space-y-1">
            {Object.entries(URGENCY_COLOR).map(([label, color]) => (
              <li key={label} className="flex items-center gap-2 text-gray-700">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {label}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mb-1 font-semibold text-gray-900">Jumlah Laporan (Distrik)</p>
          <div className="mb-1 flex overflow-hidden rounded">
            {REPORT_COUNT_COLOR_SCALE.map((step) => (
              <span key={step.color} className="h-3 w-6" style={{ backgroundColor: step.color }} />
            ))}
          </div>
          <div className="mb-3 flex justify-between text-[10px] text-gray-500">
            <span>Rendah</span>
            <span>Tinggi</span>
          </div>
        </>
      )}

      <p className="mb-1 font-semibold text-gray-900">Urgensi Laporan</p>
      <ul className="space-y-1">
        {Object.entries(URGENCY_COLOR).map(([label, color]) => (
          <li key={label} className="flex items-center gap-2 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
