import client from './client'

export async function login(username, password) {
  const { data } = await client.post('/auth/login', { username, password })
  localStorage.setItem('mince_token', data.access_token)
  return data
}

export function logout() {
  localStorage.removeItem('mince_token')
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('mince_token'))
}
