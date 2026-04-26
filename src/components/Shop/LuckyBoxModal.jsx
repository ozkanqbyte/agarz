import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LUCKY_BOXES, getRandomReward } from '../../store/useShopStore'
import useProgressStore from '../../store/useProgressStore'
import usePremiumStore from '../../store/usePremiumStore'
import useAuthStore from '../../store/useAuthStore'
import { fbSaveInventory } from '../../firebase/syncService'
import toast from 'react-hot-toast'

const SKILL_NAMES = { speed: 'Hizlanma', slow: 'Yavaslatma', shield: 'Kalkan', magnet: 'Manyetik', ghost: 'Hayalet', teleport: 'Isinlanma' }

const RARITY_CFG = {
  common:    { label: 'YAYGIN',   color: '#94a3b8', bg: '#1a1f2e' },
  rare:      { label: 'NADİR',    color: '#22c55e', bg: '#0d2a1a' },
  epic:      { label: 'EPİK',     color: '#818cf8', bg: '#1a1a3a' },
  legendary: { label: 'EFSANE',  color: '#f59e0b', bg: '#2a1a00' },
  mythic:    { label: 'MİTİK',    color: '#ec4899', bg: '#2a0a1a' },
}

const TYPE_ICONS = {
  gold:       (r) => `+${r.amount} ALTIN`,
  xp:         (r) => `+${r.amount} XP`,
  xpBoost:    ()  => 'XP BOOST',
  godTemp:    (r) => `GOD ${r.games} OYUN`,
  frame:      (r) => r.name || `CERCEVE: ${(r.id||'').toUpperCase()}`,
  skin:       (r) => r.name || `SKIN: ${(r.id||'').toUpperCase()}`,
  nameEffect: (r) => r.name || `EFEKT: ${(r.id||'').toUpperCase()}`,
  trail:      (r) => r.name || `İZ: ${(r.id||'').toUpperCase()}`,
  deathEffect:(r) => r.name || `ÖLÜM EFEKTİ: ${(r.id||'').toUpperCase()}`,
  lootbox:    (r) => `EKSTRA KUTU x${r.amount||1}`,
  chest:      (r) => r.name || `SANDIK`,
  skill:      (r) => `YETENEK: ${SKILL_NAMES[r.id]||r.id} x${r.uses||2}`,
  title:      (r) => r.name || `UNVAN: ${(r.id||'').toUpperCase()}`,
}

function RewardCard({ reward, size = 'md', active = false }) {
  const rc = RARITY_CFG[reward?.rarity] || RARITY_CFG.common
  const label = reward ? (TYPE_ICONS[reward.type]?.(reward) || reward.name) : '???'
  const w = size === 'sm' ? 80 : size === 'lg' ? 140 : 100
  const h = size === 'sm' ? 64 : size === 'lg' ? 110 : 80

  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      background: active ? rc.color + '30' : rc.bg + 'cc',
      border: `2px solid ${rc.color}${active ? 'ff' : '66'}`,
      borderRadius: 10,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 4, padding: '4px 6px',
      boxShadow: active ? `0 0 24px ${rc.color}aa` : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 900, letterSpacing: 1,
        color: rc.color, opacity: 0.9, textAlign: 'center',
      }}>{rc.label}</div>
      <div style={{
        fontSize: size === 'sm' ? 8 : 10, fontWeight: 800,
        color: '#fff', textAlign: 'center', lineHeight: 1.2,
        wordBreak: 'break-word',
      }}>{label}</div>
    </div>
  )
}

export default function LuckyBoxModal({ boxType, onClose }) {
  const box = LUCKY_BOXES[boxType]
  const { spendCoins, coins, addCoins, addXP, addPendingGod, addFrame, addLootBox, activateXpBoost, addNameEffect, addSkillUnlock, addTrailEffect, addDeathEffect, ownedFrames, ownedNameEffects, ownedSkills, activeNameEffect, activeFrame } = useProgressStore()
  const { addSkin } = usePremiumStore()
  const { user } = useAuthStore()

  const [phase, setPhase] = useState('idle')
  const [reward, setReward] = useState(null)
  const [spinItems, setSpinItems] = useState([])
  const [spinning, setSpinning] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const [particles, setParticles] = useState([])
  const ITEM_W = 108

  const buildItems = (finalReward) => {
    const pool = box.rewards
    const arr = Array.from({ length: 50 }, () => pool[Math.floor(Math.random() * pool.length)])
    arr[arr.length - 6] = finalReward
    return arr
  }

  const handleOpen = () => {
    if (!spendCoins(box.price)) {
      toast.error(`Yetersiz Gold! ${box.price} Gold gerekiyor.`)
      return
    }
    const finalReward = getRandomReward(boxType)
    const items = buildItems(finalReward)
    setSpinItems(items)
    setPhase('spinning')
    setTranslateX(0)

    const targetIdx = items.length - 6
    const target = -(targetIdx * ITEM_W + Math.random() * (ITEM_W * 0.4) - ITEM_W * 0.2)

    requestAnimationFrame(() => {
      setTimeout(() => {
        setSpinning(true)
        setTranslateX(target)
      }, 60)
    })

    setTimeout(() => {
      setSpinning(false)
      setPhase('revealed')
      setReward(finalReward)
      const pts = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 400,
        color: RARITY_CFG[finalReward.rarity].color,
        size: 3 + Math.random() * 7,
        delay: Math.random() * 0.3,
      }))
      setParticles(pts)
      applyReward(finalReward)
    }, 5200)
  }

  const applyReward = (r) => {
    if (r.type === 'gold')       { addCoins(r.amount) }
    if (r.type === 'xp')         { addXP(r.amount) }
    if (r.type === 'xpBoost')    { activateXpBoost() }
    if (r.type === 'godTemp')    { addPendingGod(r.games || 1) }
    if (r.type === 'frame')      { addFrame(r.id); toast.success(`✨ Çerçeve kazandın: ${r.name || r.id}`) }
    if (r.type === 'skin')       { addSkin?.(r.id); toast.success(`🎨 Skin kazandın: ${r.name || r.id}`) }
    if (r.type === 'nameEffect') { addNameEffect(r.id); toast.success(`💫 İsim efekti kazandın: ${r.name || r.id}`) }
    if (r.type === 'trail')      { addTrailEffect?.(r.id); toast.success(`✨ İz efekti kazandın: ${r.name || r.id}`) }
    if (r.type === 'deathEffect'){ addDeathEffect?.(r.id); toast.success(`💥 Ölüm efekti kazandın: ${r.name || r.id}`) }
    if (r.type === 'lootbox')    { for (let i = 0; i < (r.amount || 1); i++) addLootBox() }
    if (r.type === 'chest')      { for (let i = 0; i < (r.amount || 1); i++) addLootBox() }
    if (r.type === 'skill')      { addSkillUnlock(r.id, r.uses || 2); toast.success(`⚡ Yetenek kazandın: ${SKILL_NAMES[r.id] || r.id} x${r.uses || 2}`) }
    if (r.type === 'title')      { toast.success(`🏆 Unvan kazandın: ${r.name || r.id}`) }

    const uid = user?.uid
    if (uid && !uid.startsWith('guest_')) {
      setTimeout(() => {
        const ps = useProgressStore.getState()
        const pms = usePremiumStore.getState()
        fbSaveInventory(uid, {
          ownedFrames: ps.ownedFrames,
          ownedNameEffects: ps.ownedNameEffects,
          ownedSkills: ps.ownedSkills,
          ownedSkins: pms.ownedSkins,
          activeNameEffect: ps.activeNameEffect,
          activeFrame: ps.activeFrame,
          ownedTrailEffects: ps.ownedTrailEffects,
          ownedDeathEffects: ps.ownedDeathEffects,
          activeTrailEffect: ps.activeTrailEffect,
          activeDeathEffect: ps.activeDeathEffect,
        }).catch(() => {})
      }, 300)
    }
  }

  const rc = reward ? RARITY_CFG[reward.rarity] : { color: box.color, label: '' }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={phase === 'revealed' ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 520, maxWidth: '96vw',
          background: 'linear-gradient(160deg, #0a0a1e 0%, #0d0d24 100%)',
          border: `1.5px solid ${box.color}44`,
          borderRadius: 24, overflow: 'hidden',
          boxShadow: `0 0 80px ${box.glowColor}20, 0 0 200px ${box.glowColor}08`,
          padding: '32px 0 28px',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% -10%, ${box.glowColor}18 0%, transparent 55%)`,
        }} />

        <div style={{ textAlign: 'center', marginBottom: 24, padding: '0 24px' }}>
          <div style={{
            display: 'inline-block',
            width: 72, height: 72, borderRadius: 16,
            background: box.gradient,
            boxShadow: `0 0 32px ${box.glowColor}50`,
            marginBottom: 12,
          }} />
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: 3, color: '#fff' }}>
            {box.name.toUpperCase()}
          </div>
          <div style={{ color: box.color, fontWeight: 700, fontSize: 14, marginTop: 4 }}>
            {box.price} GOLD
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 2, marginBottom: 8 }}>
                  OLASI ODULLER ({box.rewards.length} cesit)
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6,
                  maxHeight: 200, overflowY: 'auto',
                  paddingRight: 4,
                }}>
                  {box.rewards.map((r, i) => (
                    <RewardCard key={i} reward={r} size="sm" />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  onClick={handleOpen}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 14,
                    fontWeight: 900, fontSize: 16, letterSpacing: 2,
                    color: '#fff', cursor: 'pointer', border: 'none',
                    background: box.gradient,
                    boxShadow: `0 4px 28px ${box.glowColor}50`,
                  }}>
                  KUTU AC
                </motion.button>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '14px 20px', borderRadius: 14,
                    fontWeight: 700, fontSize: 14, color: '#666',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                  }}>
                  IPTAL
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === 'spinning' && (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <div style={{
                color: box.color, fontWeight: 900, fontSize: 12,
                letterSpacing: 4, opacity: 0.8,
              }}>DONIYOR...</div>

              <div style={{ position: 'relative', width: '100%', height: 100, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
                  background: `linear-gradient(to right, #0a0a1e 0%, transparent 22%, transparent 78%, #0a0a1e 100%)`,
                }} />
                <div style={{
                  position: 'absolute', left: '50%', top: 0, bottom: 0,
                  width: 3, zIndex: 20, transform: 'translateX(-50%)',
                  background: `linear-gradient(to bottom, transparent, ${box.glowColor}, transparent)`,
                  boxShadow: `0 0 12px ${box.glowColor}`,
                }} />

                <motion.div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    position: 'absolute', left: '50%', top: '50%',
                    transform: `translateY(-50%) translateX(${translateX}px)`,
                  }}
                  animate={{ x: spinning ? translateX : 0 }}
                  transition={spinning ? { duration: 5, ease: [0.12, 0.85, 0.25, 1.0] } : {}}
                >
                  {spinItems.map((item, i) => (
                    <RewardCard key={i} reward={item} size="md" />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {phase === 'revealed' && reward && (
            <motion.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, position: 'relative' }}>

              {particles.map(p => (
                <motion.div key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                  transition={{ duration: 1.0 + p.delay, ease: 'easeOut', delay: p.delay }}
                  style={{
                    position: 'absolute', pointerEvents: 'none',
                    width: p.size, height: p.size,
                    borderRadius: '50%', background: p.color,
                  }}
                />
              ))}

              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                style={{
                  width: 180, height: 140, borderRadius: 18,
                  background: rc.color + '18',
                  border: `2px solid ${rc.color}`,
                  boxShadow: `0 0 60px ${rc.color}50, 0 0 120px ${rc.color}20`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                <div style={{
                  fontWeight: 900, fontSize: 11, letterSpacing: 3,
                  color: rc.color,
                }}>{rc.label}</div>
                <div style={{
                  fontWeight: 900, fontSize: 18, color: '#fff',
                  textAlign: 'center', lineHeight: 1.3, padding: '0 12px',
                }}>
                  {TYPE_ICONS[reward.type]?.(reward) || reward.name}
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={onClose}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14,
                  fontWeight: 900, fontSize: 16, letterSpacing: 2,
                  color: '#fff', cursor: 'pointer', border: 'none',
                  background: `linear-gradient(135deg, ${rc.color}cc, ${rc.color})`,
                  boxShadow: `0 4px 28px ${rc.color}40`,
                }}>
                HARIKA! DEVAM ET
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
