import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LUCKY_BOXES, getRandomReward } from '../../store/useShopStore'
import useProgressStore from '../../store/useProgressStore'
import usePremiumStore from '../../store/usePremiumStore'
import toast from 'react-hot-toast'

const RARITY_COLORS = {
  common: '#60a5fa',
  rare: '#a78bfa',
  epic: '#ec4899',
  legendary: '#fbbf24',
}

const RARITY_LABELS = {
  common: 'NORMAL',
  rare: 'NADİR',
  epic: 'EPİK',
  legendary: 'EFSANE',
}

export default function LuckyBoxModal({ boxType, onClose }) {
  const box = LUCKY_BOXES[boxType]
  const { addCoins, spendCoins, coins, addXP, addPendingGod, addFrame, addLootBox, activateXpBoost, addNameEffect } = useProgressStore()
  const { _hydrate: premiumHydrate } = usePremiumStore()

  const [phase, setPhase] = useState('idle')
  const [reward, setReward] = useState(null)
  const [spinItems, setSpinItems] = useState([])
  const [spinOffset, setSpinOffset] = useState(0)
  const [particles, setParticles] = useState([])
  const spinRef = useRef(null)
  const ITEM_WIDTH = 100

  const buildSpinItems = (finalReward) => {
    const pool = box.rewards
    const randomItems = Array.from({ length: 40 }, () => pool[Math.floor(Math.random() * pool.length)])
    randomItems[randomItems.length - 5] = finalReward
    return randomItems
  }

  const handleOpen = () => {
    if (!spendCoins(box.price)) {
      toast.error(`Yetersiz Gold! ${box.price} Gold gerekiyor.`)
      return
    }
    const finalReward = getRandomReward(boxType)
    const items = buildSpinItems(finalReward)
    setSpinItems(items)
    setPhase('spinning')
    setSpinOffset(0)

    const targetIndex = items.length - 5
    const targetOffset = -(targetIndex * ITEM_WIDTH - (window.innerWidth < 500 ? 150 : 200))

    setTimeout(() => {
      setSpinOffset(targetOffset)
    }, 100)

    setTimeout(() => {
      setPhase('revealed')
      setReward(finalReward)
      const pts = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        angle: (i / 50) * Math.PI * 2,
        speed: 2 + Math.random() * 6,
        color: RARITY_COLORS[finalReward.rarity],
        size: 4 + Math.random() * 8,
      }))
      setParticles(pts)
      applyReward(finalReward)
    }, 4500)
  }

  const applyReward = (r) => {
    if (r.type === 'gold') addCoins(r.amount)
    if (r.type === 'xp') addXP(r.amount)
    if (r.type === 'xpBoost') activateXpBoost()
    if (r.type === 'godTemp') addPendingGod(r.games || 1)
    if (r.type === 'frame') addFrame(r.id)
    if (r.type === 'skin') premiumHydrate({ ownedSkins: [r.id] })
    if (r.type === 'nameEffect') addNameEffect(r.id)
    if (r.type === 'lootbox') for (let i = 0; i < (r.amount || 1); i++) addLootBox()
  }

  const rarityColor = reward ? RARITY_COLORS[reward.rarity] : box.color

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 2000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={phase === 'revealed' ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative flex flex-col items-center gap-6 rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(8,8,20,0.98)',
          border: `2px solid ${box.color}55`,
          boxShadow: `0 0 60px ${box.glowColor}30, 0 0 120px ${box.glowColor}15`,
          width: 480, maxWidth: '95vw', padding: '32px 24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% 0%, ${box.glowColor}15 0%, transparent 60%)`,
        }} />

        <div className="relative flex flex-col items-center gap-2">
          <motion.div
            animate={phase === 'idle' ? { scale: [1, 1.05, 1], rotate: [-2, 2, -2] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-7xl"
          >{box.icon}</motion.div>
          <div className="font-black text-xl tracking-widest text-white">{box.name}</div>
          <div className="text-sm font-bold" style={{ color: box.color }}>
            💰 {box.price} Gold
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 w-full">
              <div className="text-gray-400 text-sm text-center">Kutunun içinde neler var?</div>
              <div className="grid grid-cols-4 gap-2 w-full">
                {box.rewards.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 rounded-xl p-2"
                    style={{ background: `${RARITY_COLORS[r.rarity]}15`, border: `1px solid ${RARITY_COLORS[r.rarity]}30` }}>
                    <div className="text-xl">{r.icon}</div>
                    <div className="text-xs font-bold text-center" style={{ color: RARITY_COLORS[r.rarity], fontSize: 9 }}>
                      {RARITY_LABELS[r.rarity]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 w-full">
                <motion.button
                  onClick={handleOpen}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="flex-1 py-4 rounded-2xl font-black text-white text-lg"
                  style={{ background: box.gradient, boxShadow: `0 4px 24px ${box.glowColor}50` }}>
                  🎰 KUTUNU AÇ!
                </motion.button>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="px-4 py-4 rounded-2xl font-bold text-gray-400 text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  İptal
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === 'spinning' && (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 w-full">
              <div className="text-yellow-400 font-black text-sm tracking-widest animate-pulse">
                🎰 DÖNÜYOR...
              </div>
              <div className="relative w-full overflow-hidden rounded-2xl"
                style={{ height: 110, background: 'rgba(0,0,0,0.5)', border: `1px solid ${box.color}40` }}>
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 z-20"
                  style={{ background: box.glowColor, boxShadow: `0 0 12px ${box.glowColor}` }} />
                <div className="absolute inset-y-0 left-0 right-0 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to right, rgba(8,8,20,1) 0%, transparent 25%, transparent 75%, rgba(8,8,20,1) 100%)' }} />
                <motion.div
                  className="flex items-center gap-1 absolute"
                  style={{ left: '50%', top: '50%', translateY: '-50%', height: 90 }}
                  animate={{ x: spinOffset }}
                  transition={{ duration: 4, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {spinItems.map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center rounded-xl flex-shrink-0"
                      style={{
                        width: ITEM_WIDTH - 8, height: 88,
                        background: `${RARITY_COLORS[item.rarity]}18`,
                        border: `2px solid ${RARITY_COLORS[item.rarity]}50`,
                        marginRight: 8,
                      }}>
                      <div className="text-3xl">{item.icon}</div>
                      <div className="text-xs font-bold mt-1" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {RARITY_LABELS[item.rarity]}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {phase === 'revealed' && reward && (
            <motion.div key="reward" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-5 w-full relative">
              {particles.map(p => (
                <motion.div key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(p.angle) * 180 * p.speed * 0.12,
                    y: Math.sin(p.angle) * 180 * p.speed * 0.12,
                    opacity: 0, scale: 0
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute rounded-full pointer-events-none"
                  style={{ width: p.size, height: p.size, background: p.color }}
                />
              ))}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{
                    textShadow: [
                      `0 0 20px ${rarityColor}`,
                      `0 0 60px ${rarityColor}`,
                      `0 0 20px ${rarityColor}`,
                    ]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-8xl">{reward.icon}</motion.div>
                <div className="px-4 py-1 rounded-full font-black text-sm tracking-widest"
                  style={{ background: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}60` }}>
                  {RARITY_LABELS[reward.rarity]}
                </div>
                <div className="font-black text-2xl text-white text-center">{reward.name}</div>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="w-full py-4 rounded-2xl font-black text-white text-lg"
                style={{ background: `linear-gradient(135deg, ${rarityColor}aa, ${rarityColor})` }}>
                SÜPER! Devam Et →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
