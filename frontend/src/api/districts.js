import client from './client'

export async function listDistricts() {
  const { data } = await client.get('/districts')
  return data
}

export async function updateDistrict(id, updates) {
  const { data } = await client.put(`/districts/${id}`, updates)
  return data
}
