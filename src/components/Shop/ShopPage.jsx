import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useProgressStore from '../../store/useProgressStore'
import { GOLD_PACKAGES, LUCKY_BOXES, NAME_EFFECTS, FRAMES } from '../../store/useShopStore'
import LuckyBoxModal from './LuckyBoxModal'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'boxes', label: 'SANS KUTUSU' },
  { id: 'gold', label: 'GOLD AL' },
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

export default function ShopPage() {
  const navigate = useNavigate()
  const {
    coins, spendCoins, addCoins,
    isXpBoostActive, activateXpBoost, xpBoostRemaining,
    ownedNameEffects, ownedFrames, activeNameEffect, activeFrame,
    setActiveNameEffect, setActiveFrame, addNameEffect, addFrame,
  } = useProgressStore()

  const [tab, setTab] = useState('boxes')
  const [openBox, setOpenBox] = useState(null)

  const boostMs = xpBoostRemaining()
  const boostHours = Math.floor(boostMs / 3600000)
  const boostMins = Math.floor((boostMs % 3600000) / 60000)
  const boostActive = isXpBoostActive()

  const handleBuyGold = (pkg) => {
    toast('Odeme sistemi yakin zamanda aktif!', { duration: 2000 })
    addCoins(pkg.amount)
  }

  const handleBuyEffect = (effect) => {
    const owned = ownedNameEffects.includes(effect.id)
    if (owned) { setActiveNameEffect(effect.id); toast.success(`${effect.name} aktif edildi!`); return }
    if (!spendCoins(effect.price)) { toast.error(`Yetersiz Gold! ${effect.price} Gold gerekiyor.`); return }
    addNameEffect(effect.id); setActiveNameEffect(effect.id)
    toast.success(`${effect.name} satin alindi!`)
  }

  const handleBuyFrame = (frame) => {
    const owned = ownedFrames.includes(frame.id)
    if (owned) { setActiveFrame(frame.id); toast.success(`${frame.name} aktif edildi!`); return }
    if (!spendCoins(frame.price)) { toast.error(`Yetersiz Gold! ${frame.price} Gold gerekiyor.`); return }
    addFrame(frame.id); setActiveFrame(frame.id)
    toast.success(`${frame.name} satin alindi!`)
  }

  const handleBuyBoost = () => {
    if (boostActive) { toast('XP Boost zaten aktif!'); return }
    if (!spendCoins(300)) { toast.error('Yetersiz Gold! 300 Gold gerekiyor.'); return }
    activateXpBoost(); toast.success('XP x2 Boost (24 saat) aktif!')
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

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openBox && (
          <LuckyBoxModal key={openBox} boxType={openBox} onClose={() => setOpenBox(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
