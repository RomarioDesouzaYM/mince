import client from './client'

export async function listReports() {
  const { data } = await client.get('/reports')
  return data
}

export async function createReport(report) {
  const { data } = await client.post('/reports', report)
  return data
}
