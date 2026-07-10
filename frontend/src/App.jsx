import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import PetaPage from './pages/PetaPage'
import DashboardPage from './pages/DashboardPage'
import ReportsPage from './pages/ReportsPage'
import AddReportPage from './pages/AddReportPage'
import BeritaPage from './pages/BeritaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/peta" element={<PetaPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/laporan" element={<ReportsPage />} />
            <Route path="/laporan/tambah" element={<AddReportPage />} />
            <Route path="/berita" element={<BeritaPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/peta" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
