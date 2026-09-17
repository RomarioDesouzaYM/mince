import client from './client'

export async function listNews(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  )
  const { data } = await client.get('/news', { params })
  return data
}

export async function getKamtibmasBerita() {
  const { data } = await client.get('/kamtibmas/berita')
  return data
}
