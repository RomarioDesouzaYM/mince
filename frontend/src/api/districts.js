import client from './client'

export async function listDistricts() {
  const { data } = await client.get('/districts')
  return data
}

export async function updateKondisiJalan(id, kondisi_jalan) {
  const { data } = await client.patch(`/districts/${id}/kondisi-jalan`, { kondisi_jalan })
  return data
}

export async function getDistrictRoute(id) {
  const { data } = await client.get(`/districts/${id}/route`)
  return data
}
