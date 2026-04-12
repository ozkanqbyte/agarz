import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ref as dbRef, set as dbSet } from 'firebase/database'
import { storage, db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useProgressStore, { BADGES } from '../../store/useProgressStore'
import usePremiumStore from '../../store/usePremiumStore'
import { FRAMES, NAME_EFFECTS } from '../../store/useShopStore'
import toast from 'react-hot-toast'

const PRESET_AVATARS = [
  { id: 'a1', emoji: '👾', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 'a2', emoji: '🐉', bg: 'linear-gradient(135deg,#ef4444,#f97316)' },
  { id: 'a3', emoji: '⚡', bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
  { id: 'a4', emoji: '🌌', bg: 'linear-gradient(135deg,#1e1b4b,#4338ca)' },
  { id: 'a5', emoji: '🔥', bg: 'linear-gradient(135deg,#dc2626,#b45309)' },
  { id: 'a6', emoji: '💎', bg: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  { id: 'a7', emoji: '🌸', bg: 'linear-gradient(135deg,#f472b6,#ec4899)' },
  { id: 'a8', emoji: '🏆', bg: 'linear-gradient(135deg,#d97706,#fbbf24)' },
  { id: 'a9', emoji: '🦊', bg: 'linear-gradient(135deg,#ea580c,#dc2626)' },
  { id: 'a10', emoji: '🐺', bg: 'linear-gradient(135deg,#4b5563,#1f2937)' },
  { id: 'a11', emoji: '🦋', bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)' },
  { id: 'a12', emoji: '🎭', bg: 'linear-gradient(135deg,#0f766e,#0891b2)' },
  { id: 'a13', emoji: '👑', bg: 'linear-gradient(135deg,#854d0e,#a16207)' },
  { id: 'a14', emoji: '🌊', bg: 'linear-gradient(135deg,#0369a1,#0ea5e9)' },
  { id: 'a15', emoji: '🎯', bg: 'linear-gradient(135deg,#b91c1c,#7f1d1d)' },
  { id: 'a16', emoji: '🌙', bg: 'linear-gradient(135deg,#1e3a5f,#2d4a7a)' },
]

const BANNER_PRESETS = [
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(135deg,#1a0533,#4a0080,#1a0533)',
  'linear-gradient(135deg,#0d1b2a,#1b263b,#415a77)',
  'linear-gradient(135deg,#2d0036,#5c0057,#8b0066)',
  'linear-gradient(135deg,#0a0a0a,#1a1a2e,#16213e)',
  'linear-gradient(135deg,#200122,#6f0000)',
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  'linear-gradient(135deg,#1f1c2c,#928dab)',
]

const RARITY_CONFIG = {
  common:    { label: 'Yaygın',   color: '#9ca3af', glow: 'rgba(156,163,175,0.4)' },
  uncommon:  { label: 'Sıradan',  color: '#60a5fa', glow: 'rgba(96,165,250,0.4)' },
  rare:      { label: 'Nadir',    color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
  epic:      { label: 'Epik',     color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
  legendary: { label: 'Efsane',   color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },
}

function AnimatedFrame({ frameId, size = 100 }) {
  if (!frameId) return null
  const frame = FRAMES.find(f => f.id === frameId)
  if (!frame) return null

  const frameStyles = {
    silver:    { border: '3px solid #9ca3af', animation: 'frameSpin 8s linear infinite', boxShadow: '0 0 12px rgba(156,163,175,0.5)' },
    gold:      { border: '3px solid #f59e0b', animation: 'framePulse 2s ease-in-out infinite', boxShadow: '0 0 20px rgba(245,158,11,0.6)' },
    diamond:   { border: '3px solid #38bdf8', animation: 'frameSpin 4s linear infinite', boxShadow: '0 0 25px rgba(56,189,248,0.7)' },
    legendary: { border: '3px solid #ec4899', animation: 'frameGlow 1.5s ease-in-out infinite', boxShadow: '0 0 30px rgba(236,72,153,0.8)' },
    fire:      { border: '3px solid #ef4444', animation: 'frameGlow 0.8s ease-in-out infinite alternate', boxShadow: '0 0 25px rgba(239,68,68,0.8), 0 0 50px rgba(249,115,22,0.4)' },
    ice:       { border: '3px solid #60a5fa', animation: 'frameSpin 6s linear infinite reverse', boxShadow: '0 0 20px rgba(96,165,250,0.7)' },
    neon:      { border: '3px solid #a78bfa', animation: 'frameNeon 0.5s ease-in-out infinite alternate', boxShadow: '0 0 15px #a78bfa, 0 0 30px #06b6d4' },
    rainbow:   { border: '3px solid transparent', animation: 'frameRainbow 3s linear infinite', boxShadow: '0 0 25px rgba(236,72,153,0.6)' },
    galaxy:    { border: '3px solid #818cf8', animation: 'frameSpin 3s linear infinite', boxShadow: '0 0 35px rgba(129,140,248,0.8), 0 0 70px rgba(139,92,246,0.4)' },
    sakura:    { border: '3px solid #fda4af', animation: 'framePulse 3s ease-in-out infinite', boxShadow: '0 0 20px rgba(253,164,175,0.7)' },
  }

  const style = frameStyles[frameId] || frameStyles.silver

  return (
    <div style={{
      position: 'absolute', inset: -6, borderRadius: '50%',
      ...style, zIndex: 2, pointerEvents: 'none',
    }} />
  )
}

function LiveCellPreview({ color, size = 60 }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      const cx = size / 2, cy = size / 2, r = size / 2 - 4
      const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r)
      gradient.addColorStop(0, color + 'ff')
      gradient.addColorStop(0.7, color + 'cc')
      gradient.addColorStop(1, color + '44')
      ctx.beginPath()
      const wobble = 2
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2
        const dist = r + Math.sin(angle * 3 + t) * wobble
        const x = cx + Math.cos(angle) * dist
        const y = cy + Math.sin(angle) * dist
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = color + '88'
      ctx.lineWidth = 1.5
      ctx.stroke()
      t += 0.05
    }
    const id = setInterval(draw, 1000 / 30)
    return () => clearInterval(id)
  }, [color, size])
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '50%' }} />
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuthStore()
  const {
    level, prestige, totalKills, highScore, gamesPlayed, totalPlayTime,
    earnedBadges, coins, ownedFrames, ownedNameEffects, activeFrame, activeNameEffect,
    setActiveFrame, setActiveNameEffect, ownedDeathEffects, ownedTrailEffects,
    activeDeathEffect, activeTrailEffect, setActiveDeathEffect, setActiveTrailEffect,
  } = useProgressStore()
  const { ownedSkins, ownedPackage } = usePremiumStore()

  const [tab, setTab] = useState('profile')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerPreset, setBannerPreset] = useState(profile?.bannerPreset ?? 0)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(profile?.name || '')
  const [savingName, setSavingName] = useState(false)

  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const avatar = profile?.avatarUrl || profile?.avatarPreset || null
  const bannerUrl = profile?.bannerUrl || null
  const bannerBg = bannerUrl ? `url(${bannerUrl})` : BANNER_PRESETS[bannerPreset]

  const earnedBadgeIds = earnedBadges || []
  const badgeList = BADGES.filter(b => earnedBadgeIds.includes(b.id))
  const lockedBadges = BADGES.filter(b => !earnedBadgeIds.includes(b.id)).slice(0, 6)

  const playHours = Math.floor(totalPlayTime / 3600)
  const playMins = Math.floor((totalPlayTime % 3600) / 60)

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Maksimum 2MB!'); return }
    setUploadingAvatar(true)
    try {
      const ref = storageRef(storage, `avatars/${user.uid}`)
      await uploadBytes(ref, file)
      const url = await getDownloadURL(ref)
      await updateProfile({ avatarUrl: url, avatarPreset: null })
      toast.success('Avatar güncellendi!')
    } catch { toast.error('Yükleme başarısız') }
    setUploadingAvatar(false)
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Maksimum 5MB!'); return }
    setUploadingBanner(true)
    try {
      const ref = storageRef(storage, `banners/${user.uid}`)
      await uploadBytes(ref, file)
      const url = await getDownloadURL(ref)
      await updateProfile({ bannerUrl: url })
      toast.success('Banner güncellendi!')
    } catch { toast.error('Yükleme başarısız') }
    setUploadingBanner(false)
  }

  async function handlePresetAvatar(preset) {
    await updateProfile({ avatarPreset: preset.id, avatarEmoji: preset.emoji, avatarBg: preset.bg, avatarUrl: null })
    setShowAvatarPicker(false)
    toast.success('Avatar seçildi!')
  }

  async function handleBannerPreset(idx) {
    setBannerPreset(idx)
    await updateProfile({ bannerPreset: idx, bannerUrl: null })
  }

  async function handleSaveName() {
    if (!newName.trim() || newName.length < 2) { toast.error('En az 2 karakter!'); return }
    setSavingName(true)
    await updateProfile({ name: newName.trim() })
    setEditingName(false)
    setSavingName(false)
    toast.success('İsim güncellendi!')
  }

  const tabStyle = (t) => ({
    padding: '8px 16px', borderRadius: 10, fontWeight: 800, fontSize: 12,
    letterSpacing: 1.5, cursor: 'pointer', border: 'none',
    background: tab === t ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
    color: tab === t ? '#818cf8' : '#6b7280',
    borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
    transition: 'all 0.2s',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', paddingBottom: 60 }}>
      <style>{`
        @keyframes frameSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes framePulse { 0%,100% { opacity: 1; box-shadow: 0 0 20px currentColor; } 50% { opacity: 0.6; box-shadow: 0 0 8px currentColor; } }
        @keyframes frameGlow { 0% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes frameNeon { 0% { box-shadow: 0 0 10px #a78bfa; } 100% { box-shadow: 0 0 25px #a78bfa, 0 0 50px #06b6d4; } }
        @keyframes frameRainbow { 0%{border-color:#ef4444} 16%{border-color:#f97316} 33%{border-color:#eab308} 50%{border-color:#22c55e} 66%{border-color:#3b82f6} 83%{border-color:#8b5cf6} 100%{border-color:#ef4444} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>

      {/* BANNER */}
      <div style={{
        position: 'relative', height: 200, overflow: 'hidden',
        background: bannerBg, backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(7,7,26,0.95) 100%)',
        }} />
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <motion.button onClick={() => navigate('/menu')} whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '7px 14px', color: '#9ca3af',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}>← GERİ</motion.button>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => bannerInputRef.current?.click()}
            style={{
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '7px 14px', color: '#9ca3af',
              fontWeight: 700, fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}>
            {uploadingBanner ? '⏳' : '📷 Banner Değiştir'}
          </motion.button>
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
      </div>

      {/* AVATAR */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: -60 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <motion.div whileHover={{ scale: 1.05 }} onClick={() => setShowAvatarPicker(true)}
            style={{ cursor: 'pointer', position: 'relative', width: 110, height: 110 }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid #0d0d24',
              background: profile?.avatarBg || 'linear-gradient(135deg,#312e81,#4338ca)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, position: 'relative', zIndex: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ animation: 'float 3s ease-in-out infinite' }}>{profile?.avatarEmoji || '👾'}</span>
              }
            </div>
            <AnimatedFrame frameId={activeFrame} size={110} />
            {uploadingAvatar && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', zIndex: 10,
                background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'frameSpin 0.8s linear infinite' }} />
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 4, right: 4, zIndex: 5,
              background: '#6366f1', borderRadius: '50%', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              border: '2px solid #07071a', cursor: 'pointer',
            }}>✏️</div>
          </motion.div>
        </div>
      </div>

      {/* NAME + INFO */}
      <div style={{ textAlign: 'center', marginTop: 12, padding: '0 20px' }}>
        {editingName ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              autoFocus maxLength={20}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(99,102,241,0.5)',
                borderRadius: 10, padding: '6px 14px', color: '#fff', fontWeight: 800,
                fontSize: 20, textAlign: 'center', width: 200,
              }} />
            <button onClick={handleSaveName} disabled={savingName}
              style={{ background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 800, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>
              {savingName ? '...' : '✓'}
            </button>
            <button onClick={() => setEditingName(false)}
              style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, color: '#9ca3af', padding: '7px 12px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <h1 style={{ fontWeight: 900, fontSize: 24, letterSpacing: 1 }}>{profile?.name || 'Oyuncu'}</h1>
            <button onClick={() => { setEditingName(true); setNewName(profile?.name || '') }}
              style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 14 }}>✏️</button>
          </div>
        )}
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
          {profile?.profileId} · Seviye <span style={{ color: '#818cf8', fontWeight: 800 }}>{level}</span>
          {prestige > 0 && <span style={{ color: '#fbbf24', fontWeight: 800 }}> · ✦ Prestige {prestige}</span>}
        </div>
        {ownedPackage !== 'free' && (
          <div style={{
            display: 'inline-block', marginTop: 6,
            background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            borderRadius: 8, padding: '3px 12px',
            color: '#000', fontWeight: 900, fontSize: 11, letterSpacing: 2,
          }}>💎 {ownedPackage?.toUpperCase()}</div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 20px 0', overflowX: 'auto' }}>
        {[['profile','PROFIL'],['customize','KOZMETİK'],['badges','ROZETLER']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <AnimatePresence mode="wait">

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* STATS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'ÖLDÜRME', value: totalKills, icon: '⚔️', color: '#ef4444' },
                  { label: 'EN YÜKSEK SKOR', value: highScore.toLocaleString(), icon: '🏆', color: '#fbbf24' },
                  { label: 'OYUN SAYISI', value: gamesPlayed, icon: '🎮', color: '#6366f1' },
                  { label: 'GOLD', value: coins.toLocaleString(), icon: '💰', color: '#f59e0b' },
                  { label: 'OYNAMA SÜRESİ', value: `${playHours}s ${playMins}d`, icon: '⏱️', color: '#22c55e' },
                  { label: 'SEVİYE', value: level, icon: '⭐', color: '#a78bfa' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${stat.color}22`,
                    borderRadius: 14, padding: '14px 12px', textAlign: 'center',
                    boxShadow: `0 2px 12px ${stat.color}10`,
                  }}>
                    <div style={{ fontSize: 22 }}>{stat.icon}</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: stat.color, marginTop: 4 }}>{stat.value}</div>
                    <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* BANNER PRESETS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 10 }}>BANNER RENGİ</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {BANNER_PRESETS.map((bg, idx) => (
                    <motion.button key={idx} whileTap={{ scale: 0.9 }} onClick={() => handleBannerPreset(idx)}
                      style={{
                        width: 40, height: 40, borderRadius: 10, background: bg, cursor: 'pointer',
                        border: bannerPreset === idx && !profile?.bannerUrl ? '2px solid #6366f1' : '2px solid transparent',
                        outline: 'none',
                      }} />
                  ))}
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => bannerInputRef.current?.click()}
                    style={{
                      width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                      border: profile?.bannerUrl ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', color: '#9ca3af', fontSize: 18,
                    }}>📷</motion.button>
                </div>
              </div>

              {/* OWNED ITEMS SHOWCASE */}
              {(ownedFrames.length > 0 || ownedSkins.length > 1) && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 10 }}>SAHIP OLUNANLAR</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ownedFrames.slice(0, 6).map(fId => {
                      const f = FRAMES.find(x => x.id === fId)
                      if (!f) return null
                      return (
                        <div key={fId} style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: f.color + '18', border: `1px solid ${f.color}44`, color: f.color,
                        }}>{f.name} Çerçeve</div>
                      )
                    })}
                    {ownedSkins.filter(s => s !== 'default').slice(0, 4).map(sId => (
                      <div key={sId} style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
                      }}>{sId} Skin</div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* CUSTOMIZE TAB */}
          {tab === 'customize' && (
            <motion.div key="customize" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* AVATAR */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 12 }}>AVATAR</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                    background: profile?.avatarBg || 'linear-gradient(135deg,#312e81,#4338ca)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    border: '2px solid rgba(99,102,241,0.4)',
                  }}>
                    {profile?.avatarUrl
                      ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : profile?.avatarEmoji || '👾'
                    }
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => avatarInputRef.current?.click()}
                    style={{
                      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                      borderRadius: 10, padding: '8px 16px', color: '#818cf8',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}>📷 Fotoğraf Yükle</motion.button>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                  {PRESET_AVATARS.map(p => (
                    <motion.button key={p.id} whileTap={{ scale: 0.9 }}
                      onClick={() => handlePresetAvatar(p)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: p.bg, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        outline: profile?.avatarPreset === p.id ? '2px solid #6366f1' : 'none',
                        outlineOffset: 2,
                      }}>{p.emoji}</motion.button>
                  ))}
                </div>
              </div>

              {/* FRAMES */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 12 }}>ÇERÇEVE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setActiveFrame(null); toast.success('Çerçeve kaldırıldı') }}
                    style={{
                      background: activeFrame === null ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${activeFrame === null ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '10px 14px', color: activeFrame === null ? '#818cf8' : '#6b7280',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                    }}>Yok</motion.button>
                  {FRAMES.filter(f => ownedFrames.includes(f.id)).map(f => (
                    <motion.button key={f.id} whileTap={{ scale: 0.96 }}
                      onClick={() => { setActiveFrame(f.id); toast.success(`${f.name} çerçeve aktif!`) }}
                      style={{
                        background: activeFrame === f.id ? f.color + '18' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${activeFrame === f.id ? f.color + '55' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12, padding: '10px 14px',
                        color: activeFrame === f.id ? f.color : '#6b7280',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                      {f.name}
                      {activeFrame === f.id && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓ AKTİF</span>}
                    </motion.button>
                  ))}
                  {FRAMES.filter(f => !ownedFrames.includes(f.id)).slice(0, 2).map(f => (
                    <div key={f.id} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 12, padding: '10px 14px', color: '#374151',
                      fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
                      opacity: 0.5,
                    }}>
                      🔒 {f.name} <span style={{ marginLeft: 'auto', fontSize: 10 }}>{f.price}G</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NAME EFFECTS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 12 }}>İSİM EFEKTİ</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setActiveNameEffect(null); toast.success('Efekt kaldırıldı') }}
                    style={{
                      background: activeNameEffect === null ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${activeNameEffect === null ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '10px 14px', color: activeNameEffect === null ? '#818cf8' : '#6b7280',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                    }}>Yok</motion.button>
                  {NAME_EFFECTS.filter(e => ownedNameEffects.includes(e.id)).map(e => (
                    <motion.button key={e.id} whileTap={{ scale: 0.96 }}
                      onClick={() => { setActiveNameEffect(e.id); toast.success(`${e.name} efekti aktif!`) }}
                      style={{
                        background: activeNameEffect === e.id ? e.color + '18' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${activeNameEffect === e.id ? e.color + '55' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12, padding: '10px 14px',
                        color: activeNameEffect === e.id ? e.color : '#6b7280',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                      {e.icon} {e.name}
                      {activeNameEffect === e.id && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* CELL SKIN PREVIEW */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 12 }}>HÜCRE ÖNİZLEME</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <LiveCellPreview color={profile?.color || '#6366f1'} size={80} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 4 }}>{profile?.name || 'Oyuncu'}</div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>Oyun içi görünüm</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {['#6366f1','#ef4444','#22c55e','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#f97316'].map(c => (
                        <motion.button key={c} whileTap={{ scale: 0.8 }}
                          onClick={() => updateProfile({ color: c })}
                          style={{
                            width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                            outline: profile?.color === c ? '2px solid #fff' : 'none', outlineOffset: 2,
                          }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* BADGES TAB */}
          {tab === 'badges' && (
            <motion.div key="badges" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {badgeList.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#22c55e', letterSpacing: 2, marginBottom: 10 }}>KAZANILDI ({badgeList.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {badgeList.map(b => {
                      const rc = RARITY_CONFIG[b.rarity] || RARITY_CONFIG.common
                      return (
                        <motion.div key={b.id} whileHover={{ scale: 1.02 }}
                          style={{
                            background: rc.color + '12', border: `1px solid ${rc.color}35`,
                            borderRadius: 14, padding: '12px 14px',
                            display: 'flex', alignItems: 'center', gap: 12,
                            boxShadow: `0 2px 12px ${rc.glow}`,
                          }}>
                          <div style={{ fontSize: 28 }}>{b.icon}</div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: rc.color }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{b.desc}</div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#4b5563', letterSpacing: 2, marginBottom: 10 }}>KİLİTLİ</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {lockedBadges.map(b => (
                    <div key={b.id} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 14, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12, opacity: 0.45,
                    }}>
                      <div style={{ fontSize: 28, filter: 'grayscale(1)' }}>{b.icon}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#6b7280' }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* AVATAR PICKER MODAL */}
      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
            onClick={e => { if (e.target === e.currentTarget) setShowAvatarPicker(false) }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              style={{
                background: '#0d0d24', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 20, padding: 24, maxWidth: 400, width: '100%',
              }}>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: '#fff' }}>Avatar Seç</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {PRESET_AVATARS.map(p => (
                  <motion.button key={p.id} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={() => handlePresetAvatar(p)}
                    style={{
                      aspect: '1', borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: p.bg, fontSize: 28, padding: 12,
                      outline: profile?.avatarPreset === p.id ? '2px solid #6366f1' : 'none', outlineOffset: 2,
                    }}>{p.emoji}</motion.button>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => { avatarInputRef.current?.click(); setShowAvatarPicker(false) }}
                style={{
                  width: '100%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 12, padding: '10px', color: '#818cf8',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>📷 Kendi Fotoğrafını Yükle</motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
