import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isAuthenticated, login } from '../api/auth'

const GUEST_USERNAME = 'tamu'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('staff')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated()) {
    return <Navigate to="/peta" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'guest') {
        await login(GUEST_USERNAME, passcode)
      } else {
        await login(username, password)
      }
      navigate('/peta', { replace: true })
    } catch {
      setError(mode === 'guest' ? 'Kode akses salah' : 'Username atau password salah')
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'staff' ? 'guest' : 'staff'))
    setError('')
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-semibold text-gray-900">MINCE</h1>
        <p className="mb-6 text-sm text-gray-500">
          {mode === 'guest'
            ? 'Akses tamu -- hanya lihat, tanpa hak ubah data.'
            : 'Masuk untuk mengakses dashboard pemantauan.'}
        </p>

        {mode === 'guest' ? (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kode Akses
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              autoComplete="off"
              required
            />
          </>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              autoComplete="username"
              required
            />

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              autoComplete="current-password"
              required
            />
          </>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : mode === 'guest' ? 'Masuk sebagai Tamu' : 'Masuk'}
        </button>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-3 w-full text-center text-xs font-medium text-gray-500 hover:underline"
        >
          {mode === 'guest' ? '← Kembali ke login staf' : 'Masuk sebagai Tamu →'}
        </button>
      </form>
    </div>
  )
}
