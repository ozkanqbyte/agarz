import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useProgressStore from '../../store/useProgressStore'
import { GOLD_PACKAGES, LUCKY_BOXES, NAME_EFFECTS, FRAMES } from '../../store/useShopStore'
import LuckyBoxModal from './LuckyBoxModal'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'boxes', label: '🎰 Şans Kutusu' },
  { id: 'gold', label: '💰 Gold Al' },
  { id: 'effects', label: '✨ Efektler' },
  { id: 'frames', label: '🖼️ Çerçeveler' },
  { id: 'boosts', label: '⚡ Boost' },
]

export default function ShopPage() {
  const navigate = useNavigate()
  const { coins, spendCoins, addCoins, isXpBoostActive, activateXpBoost, xpBoostRemaining,
    ownedNameEffects, ownedFrames, activeNameEffect, activeFrame,
    setActiveNameEffect, setActiveFrame, addNameEffect, addFrame } = useProgressStore()
  const [tab, setTab] = useState('boxes')
  const [openBox, setOpenBox] = useState(null)
  const [showGoldSuccess, setShowGoldSuccess] = useState(null)

  const boostMs = xpBoostRemaining()
  const boostHours = Math.floor(boostMs / 3600000)
  const boostMins = Math.floor((boostMs % 3600000) / 60000)

  const handleBuyGold = (pkg) => {
    toast('💳 Ödeme sistemi yakında aktif!', { icon: '🔜' })
    addCoins(pkg.amount)
    setShowGoldSuccess(pkg)
    setTimeout(() => setShowGoldSuccess(null), 2500)
  }

  const handleBuyEffect = (effect) => {
    if (ownedNameEffects.includes(effect.id)) {
      setActiveNameEffect(effect.id)
      toast.success(`${effect.icon} ${effect.name} aktif edildi!`)
      return
    }
    if (!spendCoins(effect.price)) {
      toast.error(`Yetersiz Gold! ${effect.price} Gold gerekiyor.`)
      return
    }
    addNameEffect(effect.id)
    setActiveNameEffect(effect.id)
    toast.success(`${effect.icon} ${effect.name} satın alındı!`)
  }

  const handleBuyFrame = (frame) => {
    if (ownedFrames.includes(frame.id)) {
      setActiveFrame(frame.id)
      toast.success(`${frame.icon} ${frame.name} aktif edildi!`)
      return
    }
    if (!spendCoins(frame.price)) {
      toast.error(`Yetersiz Gold! ${frame.price} Gold gerekiyor.`)
      return
    }
    addFrame(frame.id)
    setActiveFrame(frame.id)
    toast.success(`${frame.icon} ${frame.name} satın alındı!`)
  }

  const handleBuyBoost = () => {
    if (isXpBoostActive()) {
      toast('XP Boost zaten aktif!', { icon: '⚡' })
      return
    }
    if (!spendCoins(300)) {
      toast.error('Yetersiz Gold! 300 Gold gerekiyor.')
      return
    }
    activateXpBoost()
    toast.success('⚡ XP x2 Boost (24 saat) aktif edildi!')
  }

  return (
    <div className="min-h-screen" style={{ background: '#060614' }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(6,6,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
        <motion.button onClick={() => navigate('/menu')}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm">
          ← Geri
        </motion.button>
        <div className="font-black text-white text-lg tracking-wider">🏪 MAĞAZA</div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
          <span className="text-lg">💰</span>
          <span className="font-black text-yellow-400">{coins.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {TABS.map(t => (
          <motion.button key={t.id}
            onClick={() => setTab(t.id)}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all"
            style={{
              background: tab === t.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t.id ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
              color: tab === t.id ? '#818cf8' : '#9ca3af',
            }}>
            {t.label}
          </motion.button>
        ))}
      </div>

      <div className="px-4 pb-8">
        <AnimatePresence mode="wait">

          {tab === 'boxes' && (
            <motion.div key="boxes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-gray-400 text-sm text-center py-2">
                Kutu aç, efsane ödüller kazan! 🎰
              </div>
              {Object.values(LUCKY_BOXES).map(box => (
                <motion.div key={box.id}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="rounded-2xl overflow-hidden cursor-pointer"
                  style={{ background: box.gradient, border: `2px solid ${box.color}40`, boxShadow: `0 4px 24px ${box.glowColor}20` }}
                  onClick={() => coins >= box.price ? setOpenBox(box.id) : toast.error(`Yetersiz Gold! ${box.price} Gold gerekiyor.`)}>
                  <div className="p-5 flex items-center gap-4">
                    <div className="text-6xl">{box.icon}</div>
                    <div className="flex-1">
                      <div className="font-black text-white text-xl">{box.name}</div>
                      <div className="text-sm mt-1" style={{ color: box.glowColor }}>
                        {box.rewards.map(r => r.icon).slice(0, 6).join(' ')}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-black"
                        style={{ background: 'rgba(0,0,0,0.4)', color: '#fbbf24', fontSize: 18 }}>
                        💰 {box.price}
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 rounded-xl font-black text-white text-sm"
                        style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${box.color}60` }}>
                        🎰 AÇ!
                      </motion.div>
                    </div>
                  </div>
                  <div className="px-5 pb-4 flex gap-2 flex-wrap">
                    {box.rewards.slice(0, 5).map((r, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${box.color}20`, color: box.glowColor, border: `1px solid ${box.color}30` }}>
                        {r.name}
                      </span>
                    ))}
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold text-gray-500">
                      +{box.rewards.length - 5} daha...
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === 'gold' && (
            <motion.div key="gold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-gray-400 text-sm text-center py-2">
                Gold satın al ve mağazada harca! 💰
              </div>
              {GOLD_PACKAGES.map(pkg => (
                <motion.div key={pkg.id}
                  whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                  className="relative rounded-2xl p-5 flex items-center gap-4 cursor-pointer"
                  style={{ background: `${pkg.color}12`, border: `2px solid ${pkg.color}35` }}
                  onClick={() => handleBuyGold(pkg)}>
                  {pkg.popular && (
                    <div className="absolute -top-2 right-4 px-3 py-0.5 rounded-full font-black text-xs text-white"
                      style={{ background: '#ec4899' }}>EN POPÜLER</div>
                  )}
                  <div className="text-5xl">{pkg.icon}</div>
                  <div className="flex-1">
                    <div className="font-black text-white text-xl">{pkg.name}</div>
                    {pkg.bonus && (
                      <div className="text-sm font-bold mt-0.5" style={{ color: '#22c55e' }}>
                        🎁 {pkg.bonus}
                      </div>
                    )}
                  </div>
                  <div className="font-black text-xl" style={{ color: pkg.color }}>{pkg.price}</div>
                </motion.div>
              ))}
              <div className="rounded-2xl p-4 text-center text-sm text-gray-500"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                💡 Oyun oynayarak da ücretsiz Gold kazanabilirsin!<br />
                Yem: +1 Gold • Düşman: +50 Gold • Günlük giriş bonusu
              </div>
            </motion.div>
          )}

          {tab === 'effects' && (
            <motion.div key="effects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="space-y-3">
              <div className="text-gray-400 text-sm text-center py-2">
                İsminin üstünde özel efektler göster! ✨
              </div>
              <div className="grid grid-cols-2 gap-3">
                {NAME_EFFECTS.map(effect => {
                  const owned = ownedNameEffects.includes(effect.id)
                  const active = activeNameEffect === effect.id
                  return (
                    <motion.div key={effect.id}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer"
                      style={{
                        background: active ? `${effect.color}20` : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${active ? effect.color : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: active ? `0 0 20px ${effect.color}30` : 'none',
                      }}
                      onClick={() => handleBuyEffect(effect)}>
                      <div className="text-4xl">{effect.icon}</div>
                      <div className="font-black text-white text-sm">{effect.name}</div>
                      {active ? (
                        <div className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${effect.color}30`, color: effect.color }}>✓ AKTİF</div>
                      ) : owned ? (
                        <div className="text-xs font-bold text-gray-400">Sahipsin → Aktif et</div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm font-black" style={{ color: '#fbbf24' }}>
                          💰 {effect.price}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {tab === 'frames' && (
            <motion.div key="frames" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="space-y-3">
              <div className="text-gray-400 text-sm text-center py-2">
                Profilinde özel çerçeve göster! 🖼️
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FRAMES.map(frame => {
                  const owned = ownedFrames.includes(frame.id)
                  const active = activeFrame === frame.id
                  return (
                    <motion.div key={frame.id}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer"
                      style={{
                        background: active ? `${frame.color}20` : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${active ? frame.color : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: active ? `0 0 20px ${frame.color}30` : 'none',
                      }}
                      onClick={() => handleBuyFrame(frame)}>
                      <div className="text-5xl">{frame.icon}</div>
                      <div className="font-black text-white text-sm">{frame.name}</div>
                      {active ? (
                        <div className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${frame.color}30`, color: frame.color }}>✓ AKTİF</div>
                      ) : owned ? (
                        <div className="text-xs font-bold text-gray-400">Sahipsin → Aktif et</div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm font-black" style={{ color: '#fbbf24' }}>
                          💰 {frame.price}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {tab === 'boosts' && (
            <motion.div key="boosts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="space-y-4">
              <motion.div
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="rounded-2xl p-6 flex items-center gap-5 cursor-pointer"
                style={{
                  background: isXpBoostActive() ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isXpBoostActive() ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isXpBoostActive() ? '0 0 30px rgba(251,191,36,0.2)' : 'none',
                }}
                onClick={handleBuyBoost}>
                <div className="text-6xl">⚡</div>
                <div className="flex-1">
                  <div className="font-black text-white text-xl">XP x2 Boost</div>
                  <div className="text-sm text-gray-400 mt-1">24 saat boyunca çift XP kazan!</div>
                  {isXpBoostActive() && (
                    <div className="mt-2 font-bold text-sm" style={{ color: '#fbbf24' }}>
                      ✓ AKTİF — {boostHours}s {boostMins}d kaldı
                    </div>
                  )}
                </div>
                {!isXpBoostActive() && (
                  <div className="flex items-center gap-1 font-black text-xl" style={{ color: '#fbbf24' }}>
                    💰 300
                  </div>
                )}
              </motion.div>

              <div className="rounded-2xl p-4 text-center text-sm text-gray-500"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                💡 XP Boost oyunu kapatsan bile 24 saat boyunca aktif kalır!
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openBox && (
          <LuckyBoxModal
            key={openBox}
            boxType={openBox}
            onClose={() => setOpenBox(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGoldSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="flex flex-col items-center gap-3 rounded-2xl p-8"
              style={{ background: 'rgba(8,8,20,0.98)', border: '2px solid rgba(251,191,36,0.5)' }}>
              <div className="text-6xl">💰</div>
              <div className="font-black text-2xl text-white">+{showGoldSuccess.amount} Gold!</div>
              <div className="text-yellow-400 font-bold">{showGoldSuccess.name} satın alındı</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
