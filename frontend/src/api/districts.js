import client from './client'

export async function listDistricts() {
  const { data } = await client.get('/districts')
  return data
}
