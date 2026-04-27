import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAdminAuth, { ADMIN_URL_KEY } from './useAdminAuth'
import AdminLayout from './AdminLayout'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import LiveGame from './pages/LiveGame'
import Economy from './pages/Economy'
import Announcements from './pages/Announcements'
import ServerConfig from './pages/ServerConfig'
import Logs from './pages/Logs'
import Moderators from './pages/Moderators'
import Cosmetics from './pages/Cosmetics'

function AdminGuard({ children, user, role, loading }) {
  const [searchParams] = useSearchParams()
  const urlKey = searchParams.get('key')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07071a' }}>
      <div style={{ color: '#818cf8', fontSize: 14, fontWeight: 700, animation: 'pulse 1.5s infinite' }}>⬤ Yükleniyor...</div>
    </div>
  )

  if (!user || !role) return <Navigate to={`/admx-agarz-panel?key=${ADMIN_URL_KEY}`} replace />
  return children
}

export default function AdminApp() {
  const { user, role, loading, error, login } = useAdminAuth()

  return (
    <AnimatePresence>
      <Routes>
        <Route path="/" element={<AdminLogin onLogin={login} loading={loading} error={error} />} />

        <Route path="/dashboard" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Dashboard user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/players" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Players user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/live" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <LiveGame user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/economy" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Economy user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/announcements" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Announcements user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/config" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <ServerConfig user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/logs" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Logs user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/moderators" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Moderators user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="/cosmetics" element={
          <AdminGuard user={user} role={role} loading={loading}>
            <AdminLayout user={user} role={role}>
              <Cosmetics user={user} />
            </AdminLayout>
          </AdminGuard>
        } />

        <Route path="*" element={<Navigate to="/admx-agarz-panel" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
