import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

export default function Moderators({ user }) {
  const [roles, setRoles] = useState({})
  const [uid, setUid] = useState('')
  const [role, setRole] = useState('moderator')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const d = await adminApi.roles(); setRoles(d.roles || {}); setLoading(false) } catch { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const assign = async () => {
    if (!uid.trim()) return toast.error('UID boş olamaz')
    setBusy(true)
    try {
      await adminApi.setRole(uid, role, user?.uid)
      toast.success(`${uid.slice(0, 12)}... → ${role} olarak atandı`)
      setUid('')
      await load()
    } catch (e) { toast.error(e.message) }
    setBusy(false)
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', marginBottom: 6 }}>🛡️ Moderatörler</h1>
      <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 24 }}>Admin ve moderatör rollerini yönet</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '24px', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 16 }}>YENİ ROL ATA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={uid} onChange={e => setUid(e.target.value)} placeholder="Firebase UID"
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: '#131330', color: '#e2e8f0', fontSize: 13 }}>
              <option value="moderator">🛡️ Moderatör</option>
              <option value="super_admin">👑 Süper Admin</option>
            </select>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 11, color: '#6b7280' }}>
              {role === 'super_admin' ? '👑 Süper Admin: Tüm yetkiler, silme, rol atama dahil' : '🛡️ Moderatör: Ban/unban, duyuru, coin, kick. Silme ve rol atama YOK.'}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !uid} onClick={assign}
              style={{ padding: '11px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: busy || !uid ? 'not-allowed' : 'pointer', opacity: !uid ? 0.5 : 1 }}>
              {busy ? '⏳ Atanıyor...' : '🛡️ Rol Ata'}
            </motion.button>
          </div>
        </div>

        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '24px', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 16 }}>MEVCUT YÖNETICILER</div>
          {loading ? (
            <div style={{ color: '#4b5563', fontSize: 12 }}>Yükleniyor...</div>
          ) : Object.keys(roles).length === 0 ? (
            <div style={{ color: '#4b5563', fontSize: 12 }}>Henüz yönetici yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(roles).map(([uid, data]) => (
                <div key={uid} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#e2e8f0' }}>{uid.slice(0, 20)}...</div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>
                        {data.grantedAt ? new Date(data.grantedAt).toLocaleString('tr-TR') : ''}
                      </div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 6, background: data.role === 'super_admin' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)', color: data.role === 'super_admin' ? '#fbbf24' : '#818cf8', fontSize: 10, fontWeight: 800 }}>
                      {data.role === 'super_admin' ? '👑 SÜPER ADMİN' : '🛡️ MODERATÖR'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '14px 18px', borderRadius: 12, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)', fontSize: 12, color: '#fbbf24' }}>
        ⚠️ Firebase UID'yi bulmak için oyuncunun profil sayfasına git veya Firebase Console'u kullan. Oyuncu panelinde UID gözükür.
      </div>
    </div>
  )
}
