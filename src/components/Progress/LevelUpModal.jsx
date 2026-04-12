import { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function LevelUpModal({ level, prestige, onClose }) {
  const isPrestige = prestige > 0 && level === 1

  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 3000)
    return () => clearTimeout(t)
  }, [level])

  return (
    <motion.div
      initial={{ opacity: 0, x: -60, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed',
        bottom: 80,
        left: 16,
        zIndex: 900,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 12,
        background: isPrestige
          ? 'linear-gradient(135deg,rgba(30,20,5,0.96),rgba(20,10,0,0.96))'
          : 'rgba(6,6,18,0.95)',
        border: `1.5px solid ${isPrestige ? '#fbbf24' : '#6366f1'}`,
        boxShadow: isPrestige
          ? '0 0 20px rgba(251,191,36,0.4)'
          : '0 0 20px rgba(99,102,241,0.4)',
        minWidth: 180,
        maxWidth: 260,
      }}>
      <span style={{ fontSize: 22 }}>{isPrestige ? '🌟' : '🎉'}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          color: isPrestige ? '#fbbf24' : '#818cf8',
          textTransform: 'uppercase'
        }}>
          {isPrestige ? `Prestige ${prestige}!` : 'Seviye Atlandı!'}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
          Seviye {level}
        </span>
      </div>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 3, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 3,
          background: isPrestige ? '#fbbf24' : '#6366f1',
          borderRadius: '0 0 12px 12px',
          transformOrigin: 'left',
        }}
      />
    </motion.div>
  )
}
