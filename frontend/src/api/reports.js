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
