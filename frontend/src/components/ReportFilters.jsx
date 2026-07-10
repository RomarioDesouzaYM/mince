import { useEffect, useMemo, useState } from 'react'
import { listDistricts } from '../api/districts'
import { CATEGORIES, ROLES, STATUS, URGENCY } from '../constants'

const FIELDS = [
  { key: 'kabupaten', label: 'Kabupaten' },
  { key: 'category', label: 'Kategori' },
  { key: 'status', label: 'Status' },
  { key: 'urgency', label: 'Urgensi' },
  { key: 'submitted_by_role', label: 'Peran Pengirim' },
]

export default function ReportFilters({ filters, onChange, className = '' }) {
  const [districts, setDistricts] = useState([])

  useEffect(() => {
    listDistricts()
      .then(setDistricts)
      .catch(() => {})
  }, [])

  const kabupatenList = useMemo(
    () => [...new Set(districts.map((d) => d.kabupaten))],
    [districts],
  )

  const optionsByField = {
    kabupaten: kabupatenList,
    category: CATEGORIES,
    status: STATUS,
    urgency: URGENCY,
    submitted_by_role: ROLES,
  }

  function update(field, value) {
    onChange({ ...filters, [field]: value })
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {FIELDS.map(({ key, label }) => (
        <label key={key} className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            {label}
          </span>
          <select
            value={filters[key] ?? ''}
            onChange={(e) => update(key, e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="">Semua</option>
            {optionsByField[key].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}
