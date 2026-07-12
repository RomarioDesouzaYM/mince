import client from './client'

export async function listDistrictRisk() {
  const { data } = await client.get('/risk/districts')
  return data
}
