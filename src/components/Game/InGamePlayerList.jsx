import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import toast from 'react-hot-toast'

export default function InGamePlayerList({ players, myPlayerId, onClose, onPlayerClick }) {
  const { user, profile } = useAuthStore()
  const [sentRequests, setSentRequests] = useState(new Set())

  const addFriend = async (e, p) => {
    e.stopPropagation()
    if (!user?.uid || user.uid.startsWith('guest_')) {
      toast.error('Arkadaş eklemek için giriş yapmalısın')
      return
    }
    if (p.id === user.uid) return
    try {
      await set(ref(db, `users/${p.id}/friendRequests/${user.uid}`), {
        name: profile?.name || 'Player',
        color: profile?.color || '#6366f1',
        uid: user.uid,
        status: 'pending',
        sentAt: Date.now()
      })
      setSentRequests(prev => new Set([...prev, p.id]))
      toast.success(`${p.name}'e istek gönderildi!`)
    } catch {
      toast.error('İstek gönderilemedi')
    }
  }

  const allPlayers = players || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(5,5,18,0.97)',
        border: '1px solid rgba(99,102,241,0.25)',
        backdropFilter: 'blur(24px)',
        width: 272,
        maxHeight: 440
      }}>

      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-bold text-sm">Oyundaki Oyuncular</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}>
            {allPlayers.length + 1}
          </span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors text-xs"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          ✕
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 380 }}>

        <div className="flex items-center gap-3 px-4 py-2.5"
          style={{ background: 'rgba(99,102,241,0.07)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{
              background: `radial-gradient(circle at 35% 35%, ${profile?.color || '#6366f1'}ee, ${profile?.color || '#6366f1'}66)`,
              border: `2px solid ${profile?.color || '#6366f1'}99`,
              boxShadow: `0 0 12px ${profile?.color || '#6366f1'}55`
            }}>
            {(profile?.name || 'S')?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-sm truncate">{profile?.name || 'Sen'}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 9 }}>
                SEN
              </span>
            </div>
            <div className="text-xs text-gray-600">Bu sensin</div>
          </div>
        </div>

        <AnimatePresence>
          {allPlayers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onPlayerClick?.(p)}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${p.color || '#6366f1'}ee, ${p.color || '#6366f1'}66)`,
                  border: `2px solid ${p.color || '#6366f1'}88`,
                  boxShadow: `0 0 10px ${p.color || '#6366f1'}44`
                }}>
                {p.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white font-semibold text-sm truncate">{p.name}</span>
                  {p.isGod && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: 9, border: '1px solid rgba(251,191,36,0.3)' }}>
                      PRO
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {(p.mass || 0).toLocaleString()} kütle{p.clan ? ` · [${p.clan}]` : ''}
                </div>
              </div>
              {p.id !== myPlayerId && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={e => addFriend(e, p)}
                  disabled={sentRequests.has(p.id)}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all disabled:opacity-60"
                  style={{
                    background: sentRequests.has(p.id) ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${sentRequests.has(p.id) ? 'rgba(52,211,153,0.35)' : 'rgba(99,102,241,0.35)'}`,
                    color: sentRequests.has(p.id) ? '#34d399' : '#a5b4fc'
                  }}
                  title={sentRequests.has(p.id) ? 'İstek gönderildi' : 'Arkadaş ekle'}>
                  {sentRequests.has(p.id) ? '✓' : '+'}
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {allPlayers.length === 0 && (
          <div className="text-center py-8 px-4">
            <div className="text-gray-600 text-sm">Henüz başka oyuncu yok</div>
            <div className="text-gray-700 text-xs mt-1">Arkadaşlarını davet et!</div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
