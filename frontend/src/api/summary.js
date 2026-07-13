import client from './client'

export async function getDailySummary() {
  const { data } = await client.get('/summary/daily')
  return data
}
