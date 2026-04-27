import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ADMIN_URL_KEY } from '../useAdminAuth'

export default function AdminLogin({ onLogin, loading, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  if (searchParams.get('key') !== ADMIN_URL_KEY) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07071a' }}>
        <div style={{ color: '#4b5563', fontSize: 14 }}>404 Not Found</div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const ok = await onLogin(email, password)
    setBusy(false)
    if (ok) navigate(`/admx-agarz-panel/dashboard?key=${ADMIN_URL_KEY}`)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07071a' }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: 380, background: '#0d0d24', borderRadius: 20, padding: '40px 36px', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, animation: 'float 3s ease-in-out infinite', marginBottom: 12 }}>⬤</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#818cf8', letterSpacing: 2 }}>ADMIN PANEL</div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>Agarz Yönetim Sistemi</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1 }}>E-POSTA</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoComplete="email"
              style={{ width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 1 }}>ŞİFRE</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password"
              style={{ width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
          </div>

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>{error}</div>}

          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={busy || loading}
            style={{ padding: '12px', borderRadius: 12, border: 'none', background: busy ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
            {busy ? '⏳ Giriş yapılıyor...' : '🔐 GİRİŞ YAP'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
