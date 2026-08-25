import client from './client'

export async function importSampelTarget(file, kegiatan) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('kegiatan', kegiatan)
  const { data } = await client.post('/sampel-target/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getLatestKegiatan() {
  const { data } = await client.get('/sampel-target/kegiatan-terakhir')
  return data
}

export async function getSampelSummary(kegiatan) {
  const { data } = await client.get('/sampel-target/summary', { params: { kegiatan } })
  return data
}

export async function updateRealisasi(kegiatan, kabupaten, distrik, jumlah_realisasi) {
  const { data } = await client.put('/sampel-target/realisasi', {
    kegiatan,
    kabupaten,
    distrik,
    jumlah_realisasi,
  })
  return data
}

export async function updateTargetOverride(kegiatan, kabupaten, distrik, jumlah_target) {
  const { data } = await client.put('/sampel-target/target-override', {
    kegiatan,
    kabupaten,
    distrik,
    jumlah_target,
  })
  return data
}
