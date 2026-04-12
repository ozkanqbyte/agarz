import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useProgressStore from '../../store/useProgressStore'
import usePremiumStore from '../../store/usePremiumStore'

const RARITY_COLORS = {
  common: '#60a5fa',
  rare: '#a78bfa',
  epic: '#ec4899',
  legendary: '#fbbf24',
}

const REWARD_POOL = [
  { rarity: 'common', weight: 40, icon: '💰', name: 'Coin Kasası', desc: '+30 Coin', type: 'coins', value: 30 },
  { rarity: 'common', weight: 40, icon: '✨', name: 'XP Bonusu', desc: '+200 XP', type: 'xp', value: 200 },
  { rarity: 'rare', weight: 30, icon: '💎', name: 'Büyük Coin', desc: '+150 Coin', type: 'coins', value: 150 },
  { rarity: 'rare', weight: 30, icon: '🌀', name: 'Hız Tozu', desc: 'Hız Güçlendirmesi', type: 'boost', value: 'speed' },
  { rarity: 'rare', weight: 30, icon: '⚡', name: 'XP Boost', desc: '+600 XP', type: 'xp', value: 600 },
  { rarity: 'epic', weight: 20, icon: '💠', name: 'Epik Coin', desc: '+400 Coin', type: 'coins', value: 400 },
  { rarity: 'epic', weight: 20, icon: '🎭', name: 'Özel Çerçeve', desc: 'Geçici Avatar Çerçevesi', type: 'frame', value: 'epic' },
  { rarity: 'epic', weight: 20, icon: '👑', name: 'Geçici GOD', desc: '1 Oyun GOD Modu', type: 'god_temp', value: 1 },
  { rarity: 'legendary', weight: 10, icon: '🏆', name: 'Efsane Coin', desc: '+1200 Coin', type: 'coins', value: 1200 },
  { rarity: 'legendary', weight: 10, icon: '🌌', name: 'Galaksi Skin', desc: 'Özel Galaksi Görünümü', type: 'skin', value: 'galaxy' },
  { rarity: 'legendary', weight: 10, icon: '🎖️', name: 'Kalıcı Çerçeve', desc: 'Altın Avatar Çerçevesi', type: 'frame_permanent', value: 'golden' },
]

function getRandomReward() {
  const totalWeight = REWARD_POOL.reduce((s, r) => s + r.weight, 0)
  let rand = Math.random() * totalWeight
  for (const reward of REWARD_POOL) {
    rand -= reward.weight
    if (rand <= 0) return reward
  }
  return REWARD_POOL[0]
}

export default function LootBoxModal({ onClose, onRewardEarned }) {
  const { pendingLootBoxes, useLootBox, addCoins, addXP, addPendingGod, addFrame, addBoost } = useProgressStore()
  const { _hydrate: premiumHydrate } = usePremiumStore()
  const [phase, setPhase] = useState('idle')
  const [reward, setReward] = useState(null)
  const [particles, setParticles] = useState([])

  const handleOpen = () => {
    if (!useLootBox()) return
    setPhase('shaking')
    setTimeout(() => setPhase('cracking'), 800)
    setTimeout(() => setPhase('exploding'), 1400)
    setTimeout(() => {
      const r = getRandomReward()
      setReward(r)
      setPhase('revealed')
      const pts = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        angle: (i / 30) * Math.PI * 2,
        speed: 3 + Math.random() * 5,
        color: RARITY_COLORS[r.rarity],
      }))
      setParticles(pts)
      if (r.type === 'coins') addCoins(r.value)
      if (r.type === 'xp') addXP(r.value)
      if (r.type === 'skin') premiumHydrate({ ownedSkins: [r.value] })
      if (r.type === 'god_temp') addPendingGod(r.value)
      if (r.type === 'frame' || r.type === 'frame_permanent') addFrame(r.value)
      if (r.type === 'boost') addBoost(r.value)
      onRewardEarned?.(r)
    }, 1900)
  }

  useEffect(() => {
    handleOpen()
  }, [])

  const rarityColor = reward ? RARITY_COLORS[reward.rarity] : '#60a5fa'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative flex flex-col items-center gap-6 p-10 rounded-3xl"
        style={{ background: 'rgba(6,6,18,0.98)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 360 }}>

        <div className="text-white font-black text-2xl tracking-widest">📦 LOOT BOX</div>

        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          {phase === 'revealed' && particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(p.angle) * 120 * p.speed * 0.3,
                y: Math.sin(p.angle) * 120 * p.speed * 0.3,
                opacity: 0,
                scale: 0
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute w-3 h-3 rounded-full"
              style={{ background: p.color }}
            />
          ))}

          <AnimatePresence mode="wait">
            {phase !== 'revealed' && (
              <motion.div
                key="box"
                animate={
                  phase === 'shaking'
                    ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 1.05, 1, 1.05, 1] }
                    : phase === 'cracking'
                    ? { scale: [1, 1.1, 0.95, 1.15] }
                    : phase === 'exploding'
                    ? { scale: [1.2, 0], opacity: [1, 0] }
                    : {}
                }
                transition={{ duration: phase === 'shaking' ? 0.6 : 0.4, repeat: phase === 'shaking' ? 1 : 0 }}
                className="text-8xl select-none">
                {phase === 'cracking' ? '📦' : '📦'}
              </motion.div>
            )}

            {phase === 'revealed' && reward && (
              <motion.div
                key="reward"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center gap-2">
                <motion.div
                  animate={{ textShadow: [`0 0 20px ${rarityColor}`, `0 0 50px ${rarityColor}`, `0 0 20px ${rarityColor}`] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-7xl">
                  {reward.icon}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {phase === 'revealed' && reward && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-2">
              <div className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ background: `${rarityColor}25`, color: rarityColor, border: `1px solid ${rarityColor}55` }}>
                {reward.rarity.toUpperCase()}
              </div>
              <div className="text-white font-black text-xl">{reward.name}</div>
              <div className="text-gray-400 text-sm">{reward.desc}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'revealed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 w-full">
            {pendingLootBoxes > 0 && (
              <motion.button
                onClick={() => {
                  setPhase('idle')
                  setReward(null)
                  setParticles([])
                  setTimeout(handleOpen, 50)
                }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                Tekrar Aç ({pendingLootBoxes})
              </motion.button>
            )}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex-1 py-3 rounded-xl font-black text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${rarityColor}aa, ${rarityColor})` }}>
              Tamam!
            </motion.button>
          </motion.div>
        )}

        {phase !== 'revealed' && (
          <div className="text-gray-500 text-sm animate-pulse">Açılıyor...</div>
        )}
      </motion.div>
    </motion.div>
  )
}
