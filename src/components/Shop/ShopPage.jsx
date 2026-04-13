import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useProgressStore from '../../store/useProgressStore'
import useAuthStore from '../../store/useAuthStore'
import { GOLD_PACKAGES, LUCKY_BOXES, NAME_EFFECTS, FRAMES } from '../../store/useShopStore'
import { PREMIUM_PACKAGES } from '../../store/usePremiumStore'
import LuckyBoxModal from './LuckyBoxModal'
import PaymentModal from '../Payment/PaymentModal'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'boxes', label: 'SANS KUTUSU' },
  { id: 'gold', label: 'GOLD AL' },
  { id: 'premium', label: 'PREMİUM' },
  { id: 'effects', label: 'AD EFEKTI' },
  { id: 'frames', label: 'CERCEVE' },
  { id: 'boosts', label: 'BOOST' },
]

const FRAME_COLORS = {
  silver: '#9ca3af', gold: '#f59e0b', diamond: '#38bdf8', legendary: '#ec4899',
  fire: '#ef4444', ice: '#60a5fa', neon: '#a78bfa', rainbow: '#ec4899',
  galaxy: '#818cf8', sakura: '#fda4af',
}
const EFFECT_COLORS = {
  glow: '#60a5fa', fire: '#ef4444', neon: '#22c55e',
  electric: '#fbbf24', rainbow: '#ec4899', galaxy: '#8b5cf6',
  shadow: '#6b7280', crystal: '#38bdf8',
}

function GoldBar({ amount, color = '#f59e0b' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(245,158,11,0.1)',
      border: '1px solid rgba(245,158,11,0.35)',
      borderRadius: 10, padding: '5px 12px',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
      <span style={{ fontWeight: 900, color: '#f59e0b', fontSize: 15 }}>{amount.toLocaleString()}</span>
    </div>
  )
}

function ConfirmModal({ item, coins, onConfirm, onCancel }) {
  const canAfford = item?.needsPayment || (coins >= (item?.price || 0))
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        style={{ background: 'linear-gradient(180deg,#0f0f28,#080818)', border: `2px solid ${item?.color || '#818cf8'}55`, borderRadius: 24, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: `0 0 60px ${item?.color || '#818cf8'}33`, fontFamily: '"Exo 2",sans-serif' }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>{item?.icon || '🛒'}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{item?.name}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          {item?.needsPayment ? `${item?.priceLabel} ödeme yapılacak` : `${item?.price?.toLocaleString()} Gold harcanacak`}
        </div>
        {!item?.needsPayment && !canAfford && (
          <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            Yetersiz Gold! {(item?.price - coins).toLocaleString()} Gold eksik.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onCancel}
            style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: '"Exo 2",sans-serif' }}>
            İptal
          </motion.button>
          <motion.button whileHover={{ scale: canAfford ? 1.04 : 1 }} whileTap={{ scale: canAfford ? 0.96 : 1 }} onClick={canAfford ? onConfirm : undefined}
            style={{ flex: 1, padding: '12px', borderRadius: 14, background: canAfford ? `linear-gradient(135deg,${item?.color || '#818cf8'},${item?.color || '#818cf8'}99)` : 'rgba(255,255,255,0.05)', border: 'none', color: canAfford ? '#fff' : '#4b5563', fontWeight: 900, fontSize: 14, cursor: canAfford ? 'pointer' : 'not-allowed', fontFamily: '"Exo 2",sans-serif' }}>
            {item?.needsPayment ? '💳 Öde' : '✓ Al'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ShopPage() {
  const navigate = useNavigate()
  const {
    coins, spendCoins, addCoins,
    isXpBoostActive, activateXpBoost, xpBoostRemaining,
    ownedNameEffects, ownedFrames, activeNameEffect, activeFrame,
    setActiveNameEffect, setActiveFrame, addNameEffect, addFrame,
  } = useProgressStore()
  const { user } = useAuthStore()

  const [tab, setTab] = useState('boxes')
  const [openBox, setOpenBox] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  const boostMs = xpBoostRemaining()
  const boostHours = Math.floor(boostMs / 3600000)
  const boostMins = Math.floor((boostMs % 3600000) / 60000)
  const boostActive = isXpBoostActive()

  const openPayment = (pkgId, pkgName, priceLabel) => {
    if (!user) { toast.error('Ödeme için giriş yapmalısın!'); return }
    setPaymentData({ packageId: pkgId, packageName: pkgName, priceLabel })
  }

  const handleBuyGold = (pkg) => {
    if (!user) { toast.error('Ödeme için giriş yapmalısın!'); return }
    setConfirmItem({ name: pkg.name, icon: '🪙', color: '#f59e0b', priceLabel: pkg.price, needsPayment: true, _pkgId: pkg.id })
  }

  const handleBuyPremium = (pkg) => {
    if (!user) { toast.error('Ödeme için giriş yapmalısın!'); return }
    setConfirmItem({ name: pkg.name, icon: pkg.icon || '💎', color: pkg.color, priceLabel: pkg.price, needsPayment: true, _pkgId: `premium_${pkg.id}` })
  }

  const handleBuyEffect = (effect) => {
    const owned = ownedNameEffects.includes(effect.id)
    if (owned) { setActiveNameEffect(effect.id); toast.success(`${effect.name} aktif edildi!`); return }
    const c = EFFECT_COLORS[effect.id] || '#60a5fa'
    setConfirmItem({ name: effect.name, icon: '✨', color: c, price: effect.price, _effect: effect })
  }

  const handleBuyFrame = (frame) => {
    const owned = ownedFrames.includes(frame.id)
    if (owned) { setActiveFrame(frame.id); toast.success(`${frame.name} aktif edildi!`); return }
    const c = FRAME_COLORS[frame.id] || '#9ca3af'
    setConfirmItem({ name: frame.name, icon: '🔮', color: c, price: frame.price, _frame: frame })
  }

  const handleBuyBoost = () => {
    if (boostActive) { toast('XP Boost zaten aktif!'); return }
    setConfirmItem({ name: 'XP x2 Boost (24 saat)', icon: '⚡', color: '#fbbf24', price: 300, _boost: true })
  }

  const handleConfirm = () => {
    const item = confirmItem
    setConfirmItem(null)
    if (item.needsPayment) {
      openPayment(item._pkgId, item.name, item.priceLabel)
    } else if (item._effect) {
      if (!spendCoins(item._effect.price)) { toast.error('Yetersiz Gold!'); return }
      addNameEffect(item._effect.id); setActiveNameEffect(item._effect.id)
      toast.success(`${item._effect.name} satın alındı!`)
    } else if (item._frame) {
      if (!spendCoins(item._frame.price)) { toast.error('Yetersiz Gold!'); return }
      addFrame(item._frame.id); setActiveFrame(item._frame.id)
      toast.success(`${item._frame.name} satın alındı!`)
    } else if (item._boost) {
      if (!spendCoins(300)) { toast.error('Yetersiz Gold!'); return }
      activateXpBoost(); toast.success('XP x2 Boost (24 saat) aktif!')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff' }}>

      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(7,7,26,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(14px)',
      }}>
        <motion.button
          onClick={() => navigate('/menu')}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 16px', color: '#9ca3af',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: 1,
          }}>
          GERI
        </motion.button>

        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 4, color: '#fff' }}>MAGAZA</div>

        <GoldBar amount={coins} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '14px 20px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <motion.button key={t.id}
            onClick={() => setTab(t.id)}
            whileTap={{ scale: 0.95 }}
            style={{
              flexShrink: 0, padding: '9px 18px', borderRadius: 10,
              fontWeight: 800, fontSize: 11, letterSpacing: 2, cursor: 'pointer',
              background: tab === t.id ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === t.id ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t.id ? '#818cf8' : '#6b7280',
            }}>
            {t.label}
          </motion.button>
        ))}
      </div>

      <div style={{ padding: '0 20px 60px' }}>
        <AnimatePresence mode="wait">

          {tab === 'boxes' && (
            <motion.div key="boxes"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ color: '#4b5563', fontSize: 12, fontWeight: 700, letterSpacing: 3, textAlign: 'center', paddingTop: 4 }}>
                KUTU AC — EFSANE ODULLER KAZAN
              </div>
              {Object.values(LUCKY_BOXES).map(box => (
                <motion.div key={box.id}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => coins >= box.price ? setOpenBox(box.id) : toast.error(`${box.price} Gold gerekiyor!`)}
                  style={{
                    borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
                    border: `1.5px solid ${box.color}33`,
                    boxShadow: `0 4px 32px ${box.glowColor}12`,
                  }}>
                  <div style={{
                    background: box.gradient, padding: '20px 22px',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${box.color}55`,
                      boxShadow: `0 0 20px ${box.glowColor}40`,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: 2 }}>{box.name.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: 600, letterSpacing: 1 }}>
                        {box.rewards.length} FARKLI ODUL
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(0,0,0,0.45)', borderRadius: 10,
                      padding: '8px 16px', fontWeight: 900, fontSize: 16, letterSpacing: 1,
                      color: '#fbbf24',
                    }}>
                      {box.price} G
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.6)', padding: '10px 22px',
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                  }}>
                    {box.rewards.slice(0, 5).map((r, i) => (
                      <span key={i} style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 1,
                        padding: '3px 8px', borderRadius: 6,
                        background: `${box.color}15`,
                        color: box.glowColor,
                        border: `1px solid ${box.color}25`,
                      }}>{r.name?.toUpperCase() || r.type.toUpperCase()}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === 'gold' && (
            <motion.div key="gold"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#4b5563', fontSize: 12, fontWeight: 700, letterSpacing: 3, textAlign: 'center', paddingTop: 4 }}>
                GOLD SATIN AL
              </div>
              {GOLD_PACKAGES.map(pkg => (
                <motion.div key={pkg.id}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleBuyGold(pkg)}
                  style={{
                    position: 'relative', borderRadius: 16, padding: '20px 22px',
                    display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                    background: `${pkg.color}0d`,
                    border: `1.5px solid ${pkg.color}28`,
                  }}>
                  {pkg.popular && (
                    <div style={{
                      position: 'absolute', top: -10, right: 16,
                      background: '#ec4899', borderRadius: 8,
                      padding: '3px 12px', fontWeight: 900, fontSize: 10, letterSpacing: 2,
                    }}>EN POPULER</div>
                  )}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: `linear-gradient(135deg, ${pkg.color}44, ${pkg.color}22)`,
                    border: `1.5px solid ${pkg.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: pkg.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: pkg.color }}>{pkg.amount.toLocaleString()} GOLD</div>
                    {pkg.bonus && (
                      <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginTop: 2, letterSpacing: 1 }}>
                        + {pkg.bonus}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>{pkg.price}</div>
                </motion.div>
              ))}
              <div style={{
                borderRadius: 14, padding: '14px 18px', marginTop: 4,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 12, color: '#4b5563', fontWeight: 600, lineHeight: 1.8, letterSpacing: 0.5,
              }}>
                UCRETSIZ GOLD KAZAN — Yem: +1 G &nbsp;|&nbsp; Dusman ye: +50 G &nbsp;|&nbsp; Gunluk giris bonusu
              </div>
            </motion.div>
          )}

          {tab === 'effects' && (
            <motion.div key="effects"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#4b5563', fontSize: 12, fontWeight: 700, letterSpacing: 3, textAlign: 'center', paddingTop: 4 }}>
                AD EFEKTLERI — OYUN ICINDE GORUNUR
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {NAME_EFFECTS.map(effect => {
                  const owned = ownedNameEffects.includes(effect.id)
                  const active = activeNameEffect === effect.id
                  const c = EFFECT_COLORS[effect.id] || '#60a5fa'
                  return (
                    <motion.div key={effect.id}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleBuyEffect(effect)}
                      style={{
                        borderRadius: 14, padding: '16px', cursor: 'pointer',
                        background: active ? `${c}18` : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${active ? c : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: active ? `0 0 20px ${c}25` : 'none',
                        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start',
                      }}>
                      <div style={{
                        width: '100%', height: 4, borderRadius: 4,
                        background: `linear-gradient(to right, ${c}, ${c}44)`,
                      }} />
                      <div style={{ fontWeight: 900, fontSize: 14, color: c, letterSpacing: 1 }}>
                        {effect.name.toUpperCase()}
                      </div>
                      {active ? (
                        <div style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: 2, color: c,
                          background: `${c}18`, padding: '3px 10px', borderRadius: 6,
                        }}>AKTIF</div>
                      ) : owned ? (
                        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>SAHIPSIN - AKTİF ET</div>
                      ) : (
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#f59e0b' }}>{effect.price} GOLD</div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {tab === 'frames' && (
            <motion.div key="frames"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#4b5563', fontSize: 11, fontWeight: 700, letterSpacing: 3, textAlign: 'center', paddingTop: 4 }}>
                BALONUN ETRAFINDA DONER — OYUN ICINDE GORUNUR
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {FRAMES.map(frame => {
                  const owned = ownedFrames.includes(frame.id)
                  const active = activeFrame === frame.id
                  const c = FRAME_COLORS[frame.id] || '#9ca3af'
                  const tierColors = ['','#9ca3af','#f59e0b','#38bdf8','#ec4899','#a855f7']
                  const tierC = tierColors[frame.tier] || c
                  return (
                    <motion.div key={frame.id}
                      whileHover={{ scale: 1.03, boxShadow: `0 0 28px ${c}33` }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleBuyFrame(frame)}
                      style={{
                        borderRadius: 16, padding: '16px 12px', cursor: 'pointer',
                        background: active ? `${c}12` : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${active ? c : owned ? c + '44' : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: active ? `0 0 24px ${c}30` : 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        position: 'relative', overflow: 'hidden',
                      }}>
                      {frame.tier >= 4 && (
                        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 6px', borderRadius: 4, background: tierC + '22', border: `1px solid ${tierC}55`, fontSize: 8, fontWeight: 900, color: tierC, letterSpacing: 1 }}>
                          T{frame.tier}
                        </div>
                      )}
                      <div style={{ position: 'relative', width: 60, height: 60 }}>
                        <motion.div
                          animate={active ? { rotate: 360 } : {}}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            border: `3px solid ${c}`,
                            boxShadow: active ? `0 0 20px ${c}70, inset 0 0 12px ${c}20` : `0 0 8px ${c}30`,
                          }} />
                        <motion.div
                          animate={active ? { rotate: -360 } : {}}
                          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                          style={{
                            position: 'absolute', inset: 4, borderRadius: '50%',
                            border: `1.5px dashed ${c}66`,
                          }} />
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `radial-gradient(circle, ${c}18, transparent)`,
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}` }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: active ? c : '#e2e8f0', letterSpacing: 1.5 }}>
                          {frame.name.toUpperCase()}
                        </div>
                        {frame.desc && (
                          <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2, fontWeight: 600 }}>{frame.desc}</div>
                        )}
                      </div>
                      {active ? (
                        <div style={{
                          fontSize: 9, fontWeight: 900, letterSpacing: 2, color: c,
                          background: `${c}20`, border: `1px solid ${c}55`,
                          padding: '3px 12px', borderRadius: 20,
                        }}>AKTIF</div>
                      ) : owned ? (
                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 1 }}>SAHIPSIN — AKTIF ET</div>
                      ) : (
                        <div style={{ fontWeight: 900, fontSize: 13, color: '#f59e0b' }}>{frame.price.toLocaleString()} GOLD</div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {tab === 'boosts' && (
            <motion.div key="boosts"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ color: '#4b5563', fontSize: 12, fontWeight: 700, letterSpacing: 3, textAlign: 'center', paddingTop: 4 }}>
                BOOST
              </div>
              <motion.div
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={handleBuyBoost}
                style={{
                  borderRadius: 18, padding: '24px 22px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 18,
                  background: boostActive ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${boostActive ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: boostActive ? '0 0 32px rgba(251,191,36,0.15)' : 'none',
                }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                  background: boostActive ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${boostActive ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 28, height: 28,
                    background: boostActive
                      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                      : 'rgba(255,255,255,0.15)',
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 2, color: boostActive ? '#fbbf24' : '#fff' }}>
                    XP x2 BOOST
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 600 }}>
                    24 SAAT — OYUNU KAPATSAN BİLE SAYAR
                  </div>
                  {boostActive && (
                    <div style={{ marginTop: 8, fontWeight: 800, fontSize: 13, color: '#fbbf24', letterSpacing: 1 }}>
                      AKTIF — {boostHours}s {boostMins}d KALDI
                    </div>
                  )}
                </div>
                {!boostActive && (
                  <div style={{ fontWeight: 900, fontSize: 20, color: '#f59e0b' }}>300 G</div>
                )}
              </motion.div>
            </motion.div>
          )}

          {tab === 'premium' && (
            <motion.div key="premium"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ color: '#4b5563', fontSize: 11, fontWeight: 800, letterSpacing: 3, textAlign: 'center', paddingTop: 4 }}>
                PREMİUM PAKETLER — GERÇEK PARA İLE SATIN AL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {PREMIUM_PACKAGES.map(pkg => (
                  <motion.div key={pkg.id}
                    whileHover={{ y: -4, boxShadow: `0 16px 40px ${pkg.color}33` }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBuyPremium(pkg)}
                    style={{
                      position: 'relative', borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                      background: `linear-gradient(160deg,${pkg.color}18 0%,rgba(5,5,15,0.97) 65%)`,
                      border: `1.5px solid ${pkg.color}40`,
                      transition: 'box-shadow 0.2s',
                    }}>
                    {pkg.popular && (
                      <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', borderRadius: 20, background: pkg.color, color: '#000', fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>🔥 POPÜLER</div>
                    )}
                    {pkg.bestValue && (
                      <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', borderRadius: 20, background: '#f59e0b', color: '#000', fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>⭐ EN İYİ</div>
                    )}
                    <div style={{ padding: '18px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 28 }}>{pkg.icon || '💎'}</span>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>{pkg.name}</div>
                          <div style={{ fontWeight: 900, fontSize: 20, color: pkg.color, lineHeight: 1 }}>{pkg.price}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                        {pkg.features.slice(0, 4).map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af' }}>
                            <span style={{ color: pkg.color, fontSize: 10 }}>✓</span> {f}
                          </div>
                        ))}
                        {pkg.features.length > 4 && (
                          <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700 }}>+{pkg.features.length - 4} özellik daha...</div>
                        )}
                      </div>
                      <div style={{ width: '100%', padding: '10px', borderRadius: 12, background: `linear-gradient(135deg,${pkg.color},${pkg.color}bb)`, color: '#fff', fontWeight: 900, fontSize: 13, textAlign: 'center', letterSpacing: 1 }}>
                        Satın Al
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div style={{ borderRadius: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#4b5563', fontWeight: 600 }}>
                🔒 Kredi kartı · Banka kartı · Mobil ödeme (Turkcell, Vodafone, Türk Telekom) · PayTR güvencesiyle
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openBox && (
          <LuckyBoxModal key={openBox} boxType={openBox} onClose={() => setOpenBox(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmItem && (
          <ConfirmModal
            key="confirm"
            item={confirmItem}
            coins={coins}
            onConfirm={handleConfirm}
            onCancel={() => setConfirmItem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentData && (
          <PaymentModal
            key="payment"
            packageId={paymentData.packageId}
            packageName={paymentData.packageName}
            priceLabel={paymentData.priceLabel}
            uid={user?.uid}
            email={user?.email}
            userName={user?.displayName || user?.email}
            onClose={() => setPaymentData(null)}
            onSuccess={() => { setPaymentData(null); toast.success('Satın alma başarılı!') }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
