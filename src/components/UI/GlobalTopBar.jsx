import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useProgressStore from '../../store/useProgressStore'
import useAuthStore from '../../store/useAuthStore'

const HIDE_ON = ['/', '/auth', '/game']

export default function GlobalTopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { coins, level, prestige, xpBoostEndTime } = useProgressStore()
  const { user, profile } = useAuthStore()
  const [boostMs, setBoostMs] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const ms = Math.max(0, xpBoostEndTime - Date.now())
      setBoostMs(ms)
    }, 5000)
    setBoostMs(Math.max(0, xpBoostEndTime - Date.now()))
    return () => clearInterval(id)
  }, [xpBoostEndTime])

  const path = location.pathname
  if (HIDE_ON.some(p => path === p)) return null
  if (!user && !profile) return null

  const boostHours = Math.floor(boostMs / 3600000)
  const boostMins = Math.floor((boostMs % 3600000) / 60000)
  const boostActive = boostMs > 0

  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9000,
      display: 'flex', alignItems: 'center', gap: 8,
      pointerEvents: 'auto',
    }}>
      {boostActive && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 20,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.35)',
        }}>
          <span style={{ fontSize: 12 }}>⚡</span>
          <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 11 }}>
            2x {boostHours > 0 ? `${boostHours}s` : `${boostMins}dk`}
          </span>
        </div>
      )}

      <motion.div
        whileHover={{ scale: 1.05 }}
        onClick={() => navigate('/shop')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
        <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 14 }}>{coins.toLocaleString('tr-TR')}</span>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        onClick={() => navigate('/profile')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
        <span style={{ color: '#818cf8', fontWeight: 900, fontSize: 12 }}>
          {prestige > 0 ? `✦${prestige} ` : ''}Sv{level}
        </span>
      </motion.div>
    </div>
  )
}
