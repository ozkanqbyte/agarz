import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAdminAuth from './useAdminAuth'

const NAV = [
  { path: '/admx-agarz-panel/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/admx-agarz-panel/players', icon: '👥', label: 'Oyuncular' },
  { path: '/admx-agarz-panel/live', icon: '🎮', label: 'Canlı Oyun' },
  { path: '/admx-agarz-panel/economy', icon: '💰', label: 'Ekonomi' },
  { path: '/admx-agarz-panel/cosmetics', icon: '✨', label: 'Kozmetik' },
  { path: '/admx-agarz-panel/config', icon: '⚙️', label: 'Sunucu Ayarları' },
  { path: '/admx-agarz-panel/announcements', icon: '📢', label: 'Duyurular' },
  { path: '/admx-agarz-panel/logs', icon: '📋', label: 'Log Kayıtları' },
  { path: '/admx-agarz-panel/moderators', icon: '🛡️', label: 'Moderatörler' },
]

export default function AdminLayout({ children, user, role }) {
  const { logout } = useAdminAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/admx-agarz-panel') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#07071a', color: '#e2e8f0', fontFamily: '"Segoe UI", sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0d0d24; } ::-webkit-scrollbar-thumb { background: #4338ca; border-radius: 4px; }
        .admin-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; color: #6b7280; font-weight: 600; font-size: 13px; text-decoration: none; transition: all 0.15s; cursor: pointer; }
        .admin-nav-link:hover { background: rgba(99,102,241,0.1); color: #a5b4fc; }
        .admin-nav-link.active { background: rgba(99,102,241,0.2); color: #818cf8; border-left: 3px solid #6366f1; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* SIDEBAR */}
      <div style={{
        width: collapsed ? 60 : 220, flexShrink: 0, background: '#0d0d24',
        borderRight: '1px solid rgba(99,102,241,0.15)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 14px', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⬤</div>
          {!collapsed && <div><div style={{ fontWeight: 900, fontSize: 14, color: '#818cf8', letterSpacing: 1 }}>AGARZ</div><div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700 }}>ADMIN PANEL</div></div>}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
          {NAV.map(n => (
            <NavLink key={n.path} to={n.path} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
              title={collapsed ? n.label : ''}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && <span>{n.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
          {!collapsed && (
            <div style={{ padding: '8px 12px', marginBottom: 8, borderRadius: 10, background: 'rgba(99,102,241,0.08)' }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>{user?.email?.slice(0, 22)}</div>
              <div style={{ fontSize: 10, color: role === 'super_admin' ? '#fbbf24' : '#818cf8', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>
                {role === 'super_admin' ? '👑 Süper Admin' : '🛡️ Moderatör'}
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {collapsed ? '🚪' : <><span>🚪</span> Çıkış</>}
          </button>
        </div>
      </div>

      {/* TOGGLE BTN */}
      <button onClick={() => setCollapsed(c => !c)} style={{ position: 'fixed', left: collapsed ? 50 : 210, top: 20, zIndex: 200, background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#818cf8', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'left 0.25s' }}>
        {collapsed ? '▶' : '◀'}
      </button>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
