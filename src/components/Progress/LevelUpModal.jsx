import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LevelUpModal({ level, prestige, onClose, rewards }) {
  const [displayLevel, setDisplayLevel] = useState(level - 1)
  const [particles, setParticles] = useState([])
  const isPrestige = prestige > 0 && level === 1

  useEffect(() => {
    const pts = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      color: isPrestige
        ? ['#fbbf24', '#f59e0b', '#fcd34d'][i % 3]
        : ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'][i % 4],
    }))
    setParticles(pts)

    const timer = setTimeout(() => setDisplayLevel(level), 300)
    const closeTimer = setTimeout(() => onClose?.(), 4000)
    return () => {
      clearTimeout(timer)
      clearTimeout(closeTimer)
    }
  }, [level, prestige])

  const accentColor = isPrestige ? '#fbbf24' : '#6366f1'
  const glowColor = isPrestige ? '251,191,36' : '99,102,241'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 900 }}>

      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: '100vh', opacity: 1 }}
          animate={{ y: '-10vh', opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: p.color, left: 0, top: 0 }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.3, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -40 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        className="flex flex-col items-center gap-5 px-12 py-10 rounded-3xl text-center"
        style={{
          background: isPrestige
            ? 'linear-gradient(135deg, rgba(20,10,0,0.98), rgba(30,20,5,0.98))'
            : 'rgba(6,6,18,0.98)',
          border: `2px solid ${accentColor}`,
          boxShadow: `0 0 60px rgba(${glowColor},0.5), 0 0 120px rgba(${glowColor},0.2)`,
          minWidth: 320,
        }}>

        {isPrestige && (
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 4 }}
            className="text-5xl">
            🌟
          </motion.div>
        )}

        <div className="text-xs font-black uppercase tracking-widest"
          style={{ color: accentColor }}>
          {isPrestige ? '✨ PRESTİJ KAZANILDI!' : '🎉 SEVİYE ATLANDI!'}
        </div>

        <motion.div
          className="font-black"
          style={{ fontSize: 80, lineHeight: 1, color: 'white' }}
          animate={{ textShadow: [`0 0 20px rgba(${glowColor},0.8)`, `0 0 50px rgba(${glowColor},1)`, `0 0 20px rgba(${glowColor},0.8)`] }}
          transition={{ duration: 0.8, repeat: Infinity }}>
          {displayLevel}
        </motion.div>

        {isPrestige && (
          <div className="px-4 py-2 rounded-xl font-black text-sm"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000' }}>
            🏆 Prestige {prestige}
          </div>
        )}

        <div className="text-gray-400 text-sm">
          {isPrestige ? 'Tebrikler! Efsane oyuncu oldun!' : 'Harika iş! Devam et!'}
        </div>

        {rewards && rewards.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {rewards.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm"
                style={{ background: `rgba(${glowColor},0.15)`, border: `1px solid rgba(${glowColor},0.3)` }}>
                <span className="text-xl">{r.icon}</span>
                <span className="text-white font-bold">{r.label}</span>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 4, ease: 'linear' }}
          className="h-1 rounded-full"
          style={{ background: accentColor, alignSelf: 'stretch' }}
        />
      </motion.div>
    </motion.div>
  )
}
