import client from './client'

export async function listDistrictRisk(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  )
  const { data } = await client.get('/risk/districts', { params })
  return data
}
