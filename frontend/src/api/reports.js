import client from './client'

export async function listReports(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  )
  const { data } = await client.get('/reports', { params })
  return data
}

export async function createReport(report) {
  const { data } = await client.post('/reports', report)
  return data
}

export async function uploadBuktiDukung(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await client.post('/reports/bukti-dukung/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getKamtibmasLaporan() {
  const { data } = await client.get('/kamtibmas/laporan')
  return data
}

export async function deleteReport(id) {
  await client.delete(`/reports/${id}`)
}
