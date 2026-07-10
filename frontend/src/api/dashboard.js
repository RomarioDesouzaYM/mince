import client from './client'

export async function getDashboardStats() {
  const { data } = await client.get('/dashboard/stats')
  return data
}
