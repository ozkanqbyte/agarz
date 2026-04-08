import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useBattlePassStore, { BP_TIERS } from '../../store/useBattlePassStore'
import useProgressStore from '../../store/useProgressStore'
import useGameStore from '../../store/useGameStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'

function formatCountdown(ms) {
  if (ms <= 0) return 'Sezon Bitti'
  const d = Math.floor(ms / (1000 * 60 * 60 * 24))
  const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${d}g ${h}s ${m}d`
}

export default function BattlePassPage() {
  const navigate = useNavigate()
  const { currentTier, bpXP, isPremium, seasonEnd, claimedFree, claimedPremium, buyPremium, claimTierReward } = useBattlePassStore()
  const { level, xp, xpForLevel } = useProgressStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  const timeLeft = seasonEnd ? Math.max(0, seasonEnd - now) : 0
  const bpProgress = (bpXP / 500) * 100

  const panelStyle = {
    background: 'rgba(6,6,18,0.95)',
    border: `1px solid rgba(${theme.glowColor},0.25)`,
    backdropFilter: 'blur(16px)',
  }

  const handleClaim = (tier, type) => {
    const success = claimTierReward(tier, type)
    if (success) {
      toast.success(`Tier ${tier} ödülü alındı! 🎉`)
    } else if (type === 'premium' && !isPremium) {
      toast.error('Premium gerekli! 💎')
    }
  }

  const handleBuyPremium = () => {
    buyPremium()
    toast.success('Premium Battle Pass aktif! 💎')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #050510 0%, #0d0d20 40%, #050514 100%)' }}>
      <div className="flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: `rgba(${theme.glowColor},0.2)`, background: 'rgba(5,5,15,0.95)' }}>
        <motion.button onClick={() => navigate('/menu')}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-4 py-2 rounded-xl font-bold text-sm text-white"
          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(${theme.glowColor},0.3)` }}>
          ← Menü
        </motion.button>
        <div>
          <h1 className="text-white font-black text-xl">🎖️ Battle Pass</h1>
          <p className="text-xs" style={{ color: `rgba(${theme.glowColor},0.7)` }}>Sezon 1 — {seasonEnd ? formatCountdown(timeLeft) : '30 Gün'} kaldı</p>
        </div>
        <div className="flex-1" />
        {!isPremium && (
          <motion.button onClick={handleBuyPremium}
            whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(251,191,36,0.5)' }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 rounded-xl font-black text-sm text-black"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)' }}>
            💎 Premium Al ₺79.99
          </motion.button>
        )}
        {isPremium && (
          <div className="px-4 py-2 rounded-xl font-black text-sm"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)', color: '#000' }}>
            💎 Premium Aktif
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        <div className="rounded-2xl p-4 mb-6" style={panelStyle}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.uiAccent }}>
              BP İlerlemesi
            </span>
            <span className="text-xs text-gray-400">{bpXP} / 500 XP — Tier {currentTier}/30</span>
          </div>
          <div className="w-full h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              animate={{ width: `${bpProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-3 rounded-full"
              style={{ background: `linear-gradient(90deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 10px rgba(${theme.glowColor},0.5)` }}
            />
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: BP_TIERS.length * 140 }}>
            {BP_TIERS.map((tier) => {
              const unlocked = tier.tier <= currentTier
              const freeClaimable = unlocked && !claimedFree.includes(tier.tier)
              const premClaimable = unlocked && isPremium && !claimedPremium.includes(tier.tier)
              const isCurrentTier = tier.tier === currentTier + 1

              return (
                <motion.div
                  key={tier.tier}
                  whileHover={{ y: -4 }}
                  className="flex-shrink-0 rounded-2xl overflow-hidden"
                  style={{
                    width: 128,
                    border: isCurrentTier
                      ? `2px solid ${theme.uiAccent}`
                      : `1px solid rgba(${theme.glowColor},${unlocked ? '0.35' : '0.12'})`,
                    background: unlocked
                      ? `rgba(${theme.glowColor},0.08)`
                      : 'rgba(255,255,255,0.02)',
                    boxShadow: isCurrentTier ? `0 0 20px rgba(${theme.glowColor},0.4)` : 'none',
                  }}>
                  <div className="px-3 py-2 flex items-center justify-between border-b"
                    style={{ borderColor: `rgba(${theme.glowColor},0.15)` }}>
                    <span className="text-xs font-black" style={{ color: unlocked ? theme.uiAccent : '#4b5563' }}>
                      T{tier.tier}
                    </span>
                    {unlocked && <span className="text-green-400 text-xs">✓</span>}
                    {!unlocked && isCurrentTier && <span className="text-xs animate-pulse" style={{ color: theme.uiAccent }}>▶</span>}
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="rounded-xl p-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-xl mb-1">{tier.freeReward.icon}</div>
                      <div className="text-xs text-white font-bold leading-tight">{tier.freeReward.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">무료</div>
                      {freeClaimable && (
                        <motion.button
                          onClick={() => handleClaim(tier.tier, 'free')}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          className="mt-1.5 w-full py-1 rounded-lg text-xs font-black text-white"
                          style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                          Al!
                        </motion.button>
                      )}
                      {claimedFree.includes(tier.tier) && (
                        <div className="mt-1.5 text-xs text-green-400 font-bold">✓ Alındı</div>
                      )}
                    </div>

                    <div className="rounded-xl p-2 text-center"
                      style={{
                        background: isPremium ? 'rgba(251,191,36,0.08)' : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${isPremium ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        opacity: isPremium ? 1 : 0.5,
                      }}>
                      <div className="text-xl mb-1">{isPremium ? tier.premiumReward.icon : '🔒'}</div>
                      <div className="text-xs font-bold leading-tight"
                        style={{ color: isPremium ? '#fbbf24' : '#6b7280' }}>
                        {isPremium ? tier.premiumReward.label : 'Premium'}
                      </div>
                      {premClaimable && (
                        <motion.button
                          onClick={() => handleClaim(tier.tier, 'premium')}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          className="mt-1.5 w-full py-1 rounded-lg text-xs font-black text-black"
                          style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)' }}>
                          Al!
                        </motion.button>
                      )}
                      {claimedPremium.includes(tier.tier) && (
                        <div className="mt-1.5 text-xs text-yellow-400 font-bold">✓ Alındı</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
