import client from './client'

export async function getKamtibmasAdvisory() {
  const { data } = await client.get('/kamtibmas/advisory')
  return data
}

export async function updateKamtibmasAdvisory(text, severity) {
  const { data } = await client.put('/kamtibmas/advisory', { text, severity })
  return data
}
