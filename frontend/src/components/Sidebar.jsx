import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'

const links = [
  { to: '/peta', label: 'Peta' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/laporan', label: 'Laporan' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex h-full w-56 flex-col justify-between border-r border-gray-200 bg-white p-4">
      <div>
        <div className="mb-8 px-2">
          <h1 className="text-lg font-semibold text-gray-900">MINCE</h1>
          <p className="text-xs text-gray-500">BPS Kab. Jayawijaya</p>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-100"
      >
        Keluar
      </button>
    </aside>
  )
}
