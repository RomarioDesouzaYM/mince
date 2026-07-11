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

// UI-gating only (shows/hides nav links and blocks routes client-side) -- the
// backend's require_role is the real enforcement point, this just avoids showing
// controls a user's token can't actually use.
export function getRole() {
  const token = localStorage.getItem('mince_token')
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.role ?? null
  } catch {
    return null
  }
}
