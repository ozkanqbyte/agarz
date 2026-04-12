import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import toast from 'react-hot-toast'

export default function InGameProfilePopup({ player, onClose }) {
  const { user, profile } = useAuthStore()
  const [sent, setSent] = useState(false)

  if (!player) return null

  const addFriend = async () => {
    if (!user?.uid || user.uid.startsWith('guest_')) {
      toast.error('Arkadaş eklemek için giriş yapmalısın')
      return
    }
    try {
      await set(ref(db, `users/${player.id}/friendRequests/${user.uid}`), {
        name: profile?.name || 'Player',
        color: profile?.color || '#6366f1',
        uid: user.uid,
        status: 'pending',
        sentAt: Date.now()
      })
      setSent(true)
      toast.success(`${player.name}'e arkadaşlık isteği gönderildi!`)
    } catch {
      toast.error('İstek gönderilemedi')
    }
  }

  const pc = player.color || '#6366f1'
  const initial = player.name?.[0]?.toUpperCase() || '?'
  const isSelf = player.id === user?.uid

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}>

        <motion.div
          initial={{ scale: 0.8, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: 'rgba(5,5,18,0.99)',
            border: `1px solid ${pc}35`,
            boxShadow: `0 0 80px ${pc}25, 0 25px 60px rgba(0,0,0,0.6)`,
            width: 280
          }}>

          <div className="h-24 relative"
            style={{ background: `linear-gradient(135deg, ${pc}40, ${pc}15)` }}>
            <div className="absolute inset-0"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          </div>

          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors text-xs"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ✕
          </button>

          <div className="px-5 pb-5">
            <div className="flex items-end gap-3 -mt-10 mb-4">
              <motion.div
                animate={{
                  boxShadow: [`0 0 20px ${pc}66`, `0 0 40px ${pc}aa`, `0 0 20px ${pc}66`]
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${pc}ff, ${pc}88)`,
                  border: `3px solid ${pc}bb`,
                  flexShrink: 0
                }}>
                {initial}
              </motion.div>
              <div className="pb-1 flex-1 min-w-0">
                <div className="text-white font-black text-lg truncate leading-tight">{player.name}</div>
                {player.clan && (
                  <div className="text-xs mt-0.5 inline-block px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                    [{player.clan}]
                  </div>
                )}
              </div>
            </div>

            {player.isGod && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-yellow-400 text-xs font-bold">Premium Oyuncu</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs text-gray-600 mb-1 uppercase tracking-wider">Kütle</div>
                <div className="text-white font-black text-xl leading-tight">
                  {(player.mass || 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs text-gray-600 mb-1 uppercase tracking-wider">Durum</div>
                <div className="font-black text-base leading-tight"
                  style={{ color: '#4ade80' }}>
                  Aktif
                </div>
              </div>
            </div>

            {!isSelf && (
              <motion.button
                onClick={addFriend}
                disabled={sent}
                whileHover={{ scale: sent ? 1 : 1.03 }}
                whileTap={{ scale: sent ? 1 : 0.97 }}
                className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all"
                style={{
                  background: sent
                    ? 'linear-gradient(135deg, #059669, #10b981)'
                    : `linear-gradient(135deg, #6366f1, #8b5cf6)`,
                  boxShadow: sent
                    ? '0 0 20px rgba(16,185,129,0.3)'
                    : '0 0 25px rgba(99,102,241,0.35)',
                  opacity: sent ? 0.85 : 1
                }}>
                {sent ? 'İstek Gönderildi' : 'Arkadaş Ekle'}
              </motion.button>
            )}

            {isSelf && (
              <div className="text-center text-xs text-gray-600 py-2">Kendi profolin</div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
