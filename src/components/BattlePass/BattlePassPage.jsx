import { useState, useEffect, useRef } from 'react'
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

const RARITY_CONFIG = {
  common:    { label: 'YAYIN',   bg: 'rgba(100,116,139,0.3)',  border: '#475569', text: '#94a3b8' },
  rare:      { label: 'NADIR',   bg: 'rgba(59,130,246,0.2)',   border: '#3b82f6', text: '#60a5fa' },
  epic:      { label: 'EPIK',    bg: 'rgba(139,92,246,0.2)',   border: '#8b5cf6', text: '#a78bfa' },
  legendary: { label: 'EFSANE', bg: 'rgba(251,191,36,0.15)',  border: '#f59e0b', text: '#fbbf24' },
}

function RewardIcon({ reward }) {
  const iconMap = {
    coins:      { shape: 'circle', label: 'COIN',   bg: '#f59e0b', size: 28 },
    xp:         { shape: 'star',   label: 'XP',     bg: '#6366f1', size: 26 },
    lootbox:    { shape: 'box',    label: 'KUTU',   bg: '#818cf8', size: 26 },
    skin:       { shape: 'diamond',label: 'SKIN',   bg: '#ec4899', size: 26 },
    frame:      { shape: 'ring',   label: 'CERCEVE',bg: '#f59e0b', size: 26 },
    nameEffect: { shape: 'wave',   label: 'EFEKT',  bg: '#22c55e', size: 26 },
    skill:      { shape: 'bolt',   label: 'YETENEK',bg: '#fbbf24', size: 26 },
    xpBoost:    { shape: 'arrow',  label: 'BOOST',  bg: '#10b981', size: 26 },
    godTemp:    { shape: 'crown',  label: 'GOD',    bg: '#dc2626', size: 26 },
  }
  const cfg = iconMap[reward.type] || { shape: 'circle', label: '?', bg: '#6b7280', size: 26 }
  const color = reward.color || cfg.bg

  if (cfg.shape === 'star') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill={color}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    )
  }
  if (cfg.shape === 'diamond') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2L2 9l10 13L22 9z"/>
      </svg>
    )
  }
  if (cfg.shape === 'bolt') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill={color}>
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
      </svg>
    )
  }
  if (cfg.shape === 'box') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    )
  }
  if (cfg.shape === 'ring') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>
    )
  }
  if (cfg.shape === 'wave') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
        <path d="M2 12 C5 6 8 6 11 12 S17 18 20 12"/>
        <path d="M4 16 C7 10 10 10 13 16 S19 22 22 16" opacity="0.5"/>
      </svg>
    )
  }
  if (cfg.shape === 'arrow') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l-1.5 6h-5l4 3-1.5 6L12 14l4 3-1.5-6 4-3h-5z"/>
      </svg>
    )
  }
  if (cfg.shape === 'crown') {
    return (
      <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill={color}>
        <path d="M3 17h18l-2-9-4 5-3-7-3 7-4-5z"/>
      </svg>
    )
  }
  return (
    <svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="9"/>
      <text x="12" y="16" textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold">{cfg.label.slice(0,2)}</text>
    </svg>
  )
}

function TierCard({ tier, unlocked, currentTier, claimedFree, claimedPremium, isPremium, onClaim, theme }) {
  const isCurrentTier = tier.tier === currentTier + 1
  const rarity = RARITY_CONFIG[tier.freeReward.rarity] || RARITY_CONFIG.common
  const premRarity = RARITY_CONFIG[tier.premiumReward?.rarity] || RARITY_CONFIG.common
  const isMilestone = tier.tier % 10 === 0

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      style={{
        width: 130,
        flexShrink: 0,
        borderRadius: 16,
        overflow: 'hidden',
        border: isCurrentTier
          ? `2px solid ${theme.uiAccent}`
          : isMilestone
            ? `2px solid #f59e0b`
            : `1px solid rgba(${theme.glowColor},${unlocked ? '0.3' : '0.1'})`,
        background: isCurrentTier
          ? `rgba(${theme.glowColor},0.1)`
          : isMilestone
            ? 'rgba(245,158,11,0.06)'
            : unlocked
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.3)',
        boxShadow: isCurrentTier
          ? `0 0 24px rgba(${theme.glowColor},0.4), 0 0 48px rgba(${theme.glowColor},0.15)`
          : isMilestone
            ? '0 0 20px rgba(245,158,11,0.25)'
            : 'none',
        transition: 'all 0.2s',
      }}>

      <div style={{
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid rgba(${theme.glowColor},0.12)`,
        background: isMilestone ? 'rgba(245,158,11,0.1)' : isCurrentTier ? `rgba(${theme.glowColor},0.15)` : 'transparent',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 900, letterSpacing: 1,
          color: unlocked ? (isMilestone ? '#fbbf24' : theme.uiAccent) : '#4b5563',
        }}>
          {isMilestone ? `TİER ${tier.tier}` : `T${tier.tier}`}
        </span>
        {unlocked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#4ade80">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
        {!unlocked && isCurrentTier && (
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: theme.uiAccent }} />
        )}
      </div>

      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          borderRadius: 10, padding: '8px 6px',
          textAlign: 'center',
          background: rarity.bg,
          border: `1px solid ${rarity.border}40`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <RewardIcon reward={tier.freeReward} />
          </div>
          <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 10, lineHeight: 1.2 }}>
            {tier.freeReward.label}
          </div>
          <div style={{ color: rarity.text, fontSize: 8, fontWeight: 700, letterSpacing: 0.5, marginTop: 2 }}>
            {rarity.label}
          </div>
          {unlocked && !claimedFree.includes(tier.tier) && (
            <motion.button
              onClick={() => onClaim(tier.tier, 'free')}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
              style={{
                marginTop: 5, width: '100%', padding: '4px 0', borderRadius: 7,
                background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`,
                color: '#fff', fontWeight: 900, fontSize: 10, border: 'none', cursor: 'pointer',
              }}>
              AL
            </motion.button>
          )}
          {claimedFree.includes(tier.tier) && (
            <div style={{ marginTop: 5, color: '#4ade80', fontSize: 10, fontWeight: 800 }}>ALINDI</div>
          )}
        </div>

        <div style={{
          borderRadius: 10, padding: '8px 6px',
          textAlign: 'center',
          background: isPremium ? premRarity.bg : 'rgba(0,0,0,0.4)',
          border: isPremium ? `1px solid ${premRarity.border}40` : '1px solid rgba(255,255,255,0.04)',
          opacity: isPremium ? 1 : 0.6,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {!isPremium && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.5)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <RewardIcon reward={tier.premiumReward} />
          </div>
          <div style={{ color: isPremium ? '#fde68a' : '#6b7280', fontWeight: 800, fontSize: 10, lineHeight: 1.2 }}>
            {tier.premiumReward.label}
          </div>
          <div style={{ color: isPremium ? premRarity.text : '#4b5563', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, marginTop: 2 }}>
            {premRarity.label}
          </div>
          {isPremium && unlocked && !claimedPremium.includes(tier.tier) && (
            <motion.button
              onClick={() => onClaim(tier.tier, 'premium')}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
              style={{
                marginTop: 5, width: '100%', padding: '4px 0', borderRadius: 7,
                background: 'linear-gradient(135deg,#fbbf24,#d97706)',
                color: '#000', fontWeight: 900, fontSize: 10, border: 'none', cursor: 'pointer',
              }}>
              AL
            </motion.button>
          )}
          {isPremium && claimedPremium.includes(tier.tier) && (
            <div style={{ marginTop: 5, color: '#fbbf24', fontSize: 10, fontWeight: 800 }}>ALINDI</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function BattlePassPage() {
  const navigate = useNavigate()
  const { currentTier, bpXP, isPremium, seasonEnd, claimedFree, claimedPremium, buyPremium, claimTierReward } = useBattlePassStore()
  const { level, pendingLootBoxes } = useProgressStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)
  const [now, setNow] = useState(Date.now())
  const scrollRef = useRef(null)
  const [viewFilter, setViewFilter] = useState('all')

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current && currentTier > 0) {
      const cardW = 146
      const target = Math.max(0, currentTier - 3) * cardW
      scrollRef.current.scrollTo({ left: target, behavior: 'smooth' })
    }
  }, [currentTier])

  const timeLeft = seasonEnd ? Math.max(0, seasonEnd - now) : 0
  const bpProgress = (bpXP / 1000) * 100

  const handleClaim = (tier, type) => {
    const success = claimTierReward(tier, type)
    if (success) {
      toast.success(`Tier ${tier} odulu alindi!`, { icon: null })
    } else if (type === 'premium' && !isPremium) {
      toast.error('Premium gerekli!')
    }
  }

  const handleBuyPremium = () => {
    buyPremium()
    toast.success('Premium Battle Pass aktif!')
  }

  const unclaimedFree = BP_TIERS.filter(t => t.tier <= currentTier && !claimedFree.includes(t.tier)).length
  const unclaimedPremium = isPremium ? BP_TIERS.filter(t => t.tier <= currentTier && !claimedPremium.includes(t.tier)).length : 0

  const displayTiers = viewFilter === 'unclaimed'
    ? BP_TIERS.filter(t => (t.tier <= currentTier && !claimedFree.includes(t.tier)) || (isPremium && t.tier <= currentTier && !claimedPremium.includes(t.tier)))
    : BP_TIERS

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #050510 0%, #0a0a1f 50%, #05050f 100%)' }}>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px',
        borderBottom: `1px solid rgba(${theme.glowColor},0.2)`,
        background: 'rgba(5,5,15,0.95)',
        backdropFilter: 'blur(20px)',
      }}>
        <motion.button onClick={() => navigate('/menu')}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{
            padding: '8px 16px', borderRadius: 12, fontWeight: 800, fontSize: 13, color: '#fff', cursor: 'pointer',
            background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(${theme.glowColor},0.25)`,
          }}>
          Geri
        </motion.button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={theme.uiAccent}>
              <path d="M12 2L8 8H2l5 4-2 7 7-4 7 4-2-7 5-4h-6z"/>
            </svg>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>BATTLE PASS</span>
            <span style={{ padding: '2px 10px', borderRadius: 20, background: `rgba(${theme.glowColor},0.2)`, color: theme.uiAccent, fontSize: 11, fontWeight: 800 }}>
              SEZON {useBattlePassStore.getState().seasonNumber}
            </span>
          </div>
          <div style={{ color: '#4b5563', fontSize: 11, marginTop: 2, fontWeight: 600 }}>
            {seasonEnd ? formatCountdown(timeLeft) + ' kaldi' : '30 Gun kaldi'} • 50 Tier • Tier {currentTier}/50
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(unclaimedFree > 0 || unclaimedPremium > 0) && (
            <div style={{
              padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5',
            }}>
              {unclaimedFree + unclaimedPremium} odul bekliyor
            </div>
          )}

          {!isPremium ? (
            <motion.button onClick={handleBuyPremium}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(251,191,36,0.5)' }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '10px 22px', borderRadius: 12, fontWeight: 900, fontSize: 13,
                background: 'linear-gradient(135deg,#fbbf24,#d97706)', color: '#000', border: 'none', cursor: 'pointer',
              }}>
              Premium Al — 79.99
            </motion.button>
          ) : (
            <div style={{
              padding: '8px 18px', borderRadius: 12, fontWeight: 900, fontSize: 13,
              background: 'linear-gradient(135deg,#fbbf24,#d97706)', color: '#000',
            }}>
              PREMIUM AKTIF
            </div>
          )}
        </div>
      </div>

      {pendingLootBoxes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            margin: '12px 24px 0', borderRadius: 14, padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
            border: '1px solid rgba(139,92,246,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎁</span>
            <div>
              <div style={{ color: '#a78bfa', fontWeight: 900, fontSize: 14 }}>
                {pendingLootBoxes} Açılmamış Kutu!
              </div>
              <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>Battle Pass'ten kazandığın kutular mağazada seni bekliyor</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/shop')}
            style={{
              padding: '8px 20px', borderRadius: 10, fontWeight: 900, fontSize: 13, cursor: 'pointer',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', border: 'none',
            }}>
            Kutularını Aç →
          </motion.button>
        </motion.div>
      )}

      <div style={{ padding: '16px 24px' }}>
        <div style={{
          borderRadius: 18, padding: '14px 18px',
          background: 'rgba(10,10,25,0.85)',
          border: `1px solid rgba(${theme.glowColor},0.2)`,
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>SEZON XP</div>
              <div style={{ color: theme.uiAccent, fontWeight: 900, fontSize: 13 }}>{bpXP} / 1000</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#4b5563', fontSize: 11, fontWeight: 700 }}>Oyun oyna, gozrev yap → XP kazan</span>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>TİER {currentTier} / 50</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${bpProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 5,
                background: `linear-gradient(90deg, ${theme.gradientA}, ${theme.gradientB})`,
                boxShadow: `0 0 12px rgba(${theme.glowColor},0.6)`,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[
              { label: 'Tum Tierlar', value: 'all' },
              { label: 'Bekleyen Oduller', value: 'unclaimed' },
            ].map(f => (
              <button key={f.value} onClick={() => setViewFilter(f.value)}
                style={{
                  padding: '4px 14px', borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                  background: viewFilter === f.value ? `rgba(${theme.glowColor},0.25)` : 'transparent',
                  border: viewFilter === f.value ? `1px solid rgba(${theme.glowColor},0.5)` : '1px solid rgba(255,255,255,0.08)',
                  color: viewFilter === f.value ? theme.uiAccent : '#6b7280',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', padding: '0 24px 24px', scrollbarWidth: 'thin' }} ref={scrollRef}>
        <div style={{ display: 'flex', gap: 8, minWidth: displayTiers.length * 146 }}>
          {displayTiers.map((tier) => {
            const unlocked = tier.tier <= currentTier
            return (
              <TierCard
                key={tier.tier}
                tier={tier}
                unlocked={unlocked}
                currentTier={currentTier}
                claimedFree={claimedFree}
                claimedPremium={claimedPremium}
                isPremium={isPremium}
                onClaim={handleClaim}
                theme={theme}
              />
            )
          })}
        </div>
      </div>

      <div style={{
        padding: '12px 24px',
        borderTop: `1px solid rgba(${theme.glowColor},0.15)`,
        background: 'rgba(5,5,15,0.9)',
        display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center',
      }}>
        {[
          { color: RARITY_CONFIG.common.text, label: 'YAYIN' },
          { color: RARITY_CONFIG.rare.text, label: 'NADIR' },
          { color: RARITY_CONFIG.epic.text, label: 'EPIK' },
          { color: RARITY_CONFIG.legendary.text, label: 'EFSANE' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
            <span style={{ color: r.color, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>{r.label}</span>
          </div>
        ))}
        <div style={{ color: '#4b5563', fontSize: 10 }}>|</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
          <span style={{ color: '#6b7280', fontSize: 10 }}>Milestone Tier (x10)</span>
        </div>
      </div>
    </div>
  )
}
