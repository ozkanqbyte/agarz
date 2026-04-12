import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, onValue, remove } from 'firebase/database'
import { useNavigate } from 'react-router-dom'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'

export default function LobbyInviteNotifier() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])

  const uid = user?.uid
  useEffect(() => {
    if (!uid || uid.startsWith('guest_')) return
    const inviteRef = ref(db, `users/${uid}/lobbyInvites`)
    const unsub = onValue(inviteRef, snap => {
      if (!snap.exists()) { setInvites([]); return }
      const list = Object.entries(snap.val()).map(([key, inv]) => ({ key, ...inv }))
      setInvites(list)
    })
    return () => unsub()
  }, [uid])

  const accept = async (inv) => {
    try { await remove(ref(db, `users/${uid}/lobbyInvites/${inv.key}`)) } catch {}
    navigate(`/lobby?room=${inv.lobbyId}`)
  }

  const decline = async (inv) => {
    try { await remove(ref(db, `users/${uid}/lobbyInvites/${inv.key}`)) } catch {}
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 20, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {invites.map(inv => (
          <motion.div
            key={inv.key}
            initial={{ opacity: 0, x: 120, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 120, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 16, minWidth: 280, maxWidth: 340,
              background: 'linear-gradient(135deg, rgba(10,10,30,0.97), rgba(20,20,50,0.97))',
              border: '1px solid rgba(99,102,241,0.5)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.15)',
            }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: inv.fromColor || '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 18, color: '#fff',
              boxShadow: `0 0 16px ${inv.fromColor || '#6366f1'}88`,
            }}>
              {inv.fromName?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
                <span style={{ color: inv.fromColor || '#818cf8' }}>{inv.fromName}</span>
                <span style={{ color: '#d1d5db' }}> seni lobiye davet etti!</span>
              </div>
              <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600 }}>🎮 Lobi daveti</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <motion.button
                onClick={() => accept(inv)}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                style={{
                  padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 900, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(16,185,129,0.2))',
                  border: '1px solid rgba(34,197,94,0.5)', color: '#4ade80',
                }}>
                Katıl
              </motion.button>
              <motion.button
                onClick={() => decline(inv)}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                style={{
                  padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
                }}>
                Reddet
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
