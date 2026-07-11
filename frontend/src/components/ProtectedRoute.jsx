import { Navigate, Outlet } from 'react-router-dom'
import { getRole, isAuthenticated } from '../api/auth'

export default function ProtectedRoute({ roles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(getRole())) {
    return <Navigate to="/peta" replace />
  }
  return <Outlet />
}
