import { useEffect, useState } from 'react'
import { listDistricts } from '../api/districts'
import {
  approveDistrictProposal,
  listDistrictProposals,
  rejectDistrictProposal,
} from '../api/districtProposals'

export default function ApprovalQueuePage() {
  const [proposals, setProposals] = useState([])
  const [districts, setDistricts] = useState([])
  const [error, setError] = useState('')
  const [decidingId, setDecidingId] = useState(null)

  function load() {
    Promise.all([listDistrictProposals('Menunggu'), listDistricts()])
      .then(([p, d]) => {
        setProposals(p)
        setDistricts(d)
      })
      .catch(() => setError('Gagal memuat usulan perubahan'))
  }

  useEffect(load, [])

  function districtFor(proposal) {
    return districts.find((d) => d.id === proposal.district_id)
  }

  async function decide(proposalId, approve) {
    setDecidingId(proposalId)
    setError('')
    try {
      if (approve) {
        await approveDistrictProposal(proposalId)
      } else {
        await rejectDistrictProposal(proposalId)
      }
      setProposals((prev) => prev.filter((p) => p.id !== proposalId))
    } catch {
      setError('Gagal memproses usulan')
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Persetujuan Perubahan Distrik</h1>
      <p className="mb-6 text-sm text-gray-500">
        Usulan menunggu persetujuan Ketua Tim atau Kepala BPS.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {proposals.length === 0 && (
        <p className="text-sm text-gray-500">Tidak ada usulan yang menunggu.</p>
      )}

      <div className="space-y-4">
        {proposals.map((p) => {
          const d = districtFor(p)
          return (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-2 font-semibold text-gray-900">
                {d ? `${d.distrik}, ${d.kabupaten}` : `Distrik #${p.district_id}`}
              </p>

              <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-1 font-medium text-gray-500">Saat Ini</p>
                  <p>Jarak: {d?.jarak_dari_wamena_km ?? '—'} km</p>
                  <p>Waktu: {d?.estimasi_waktu_tempuh_jam ?? '—'} jam</p>
                  <p>Akses: {d?.jenis_akses ?? '—'}</p>
                  <p>Keterangan: {d?.keterangan_akses || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-gray-500">Diusulkan</p>
                  <p>Jarak: {p.jarak_dari_wamena_km ?? '—'} km</p>
                  <p>Waktu: {p.estimasi_waktu_tempuh_jam ?? '—'} jam</p>
                  <p>Akses: {p.jenis_akses}</p>
                  <p>Keterangan: {p.keterangan_akses || '—'}</p>
                </div>
              </div>

              <p className="mb-1 text-sm">
                <span className="font-medium text-gray-500">Alasan: </span>
                {p.alasan}
              </p>
              {p.bukti_dukung_url && (
                <a
                  href={p.bukti_dukung_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-1 block text-sm text-blue-600 hover:underline"
                >
                  Lihat Bukti Dukung
                </a>
              )}
              <p className="mb-3 text-xs text-gray-400">
                Diusulkan oleh {p.proposed_by} pada{' '}
                {new Date(p.created_at).toLocaleString('id-ID')}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={decidingId === p.id}
                  onClick={() => decide(p.id, true)}
                  className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Setujui
                </button>
                <button
                  type="button"
                  disabled={decidingId === p.id}
                  onClick={() => decide(p.id, false)}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Tolak
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
