import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import useGameStore from '../../store/useGameStore'
import useAuthStore from '../../store/useAuthStore'
import useProgressStore, { xpForLevel, BADGES } from '../../store/useProgressStore'
import useQuestStore from '../../store/useQuestStore'
import { getTheme } from '../../themes/themes'
import InGamePlayerList from './InGamePlayerList'
import { ref as dbRef, onValue, off } from 'firebase/database'
import { db } from '../../firebase/config'
import toast from 'react-hot-toast'

const MODE_LABELS = {
  ffa: '⚔️ Free For All',
  teams: '🛡️ Takım Modu',
  battle_royale: '💥 Battle Royale',
  rush: '⚡ Rush Mode',
  clan_war: '🏰 Klan Savaşı'
}

const KEYS = [
  { key: 'SPACE', action: 'Böl', color: '#6366f1' },
  { key: 'W', action: 'Fırlat (Küçük)' },
  { key: 'E', action: 'Fırlat (Sürekli)' },
  { key: 'R', action: 'Fırlat (Büyük)' },
  { key: 'A', action: '+Kütle 10g', color: '#fbbf24' },
  { key: 'S', action: '+Kütle 50g', color: '#f59e0b' },
  { key: 'Z', action: 'Macro x2', color: '#ec4899' },
  { key: 'X', action: 'Macro Max', color: '#ec4899' },
  { key: 'T', action: 'Oto Hareket' },
  { key: 'F', action: '⚡ Hızlan', color: '#fbbf24' },
  { key: 'G', action: '🌀 Yavaşlat', color: '#8b5cf6' },
  { key: 'H', action: '🛡️ Kalkan', color: '#06b6d4' },
  { key: 'I', action: '🧲 Manyetik', color: '#ec4899' },
  { key: 'J', action: '👻 Hayalet', color: '#a78bfa' },
  { key: 'K', action: '⚡ Işınlan', color: '#38bdf8' },
  { key: 'N', action: '🔊 Ses Aç/Kapat' },
]

function formatTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function GameUI({ engineRef, onSplit, onEject, onLeave, onSpectate, onRestart, roomId, mode, onPlayerProfileClick }) {
  const { score, playerMass, leaderboard, totalPlayers, currentTheme } = useGameStore()
  const { profile } = useAuthStore()
  const { xp, level, prestige, earnedBadges } = useProgressStore()
  const { quests } = useQuestStore()
  const [searchParams] = useSearchParams()
  const activeQuestCount = quests.filter(q => !q.completed && !q.claimed).length
  const completedQuestCount = quests.filter(q => q.completed && !q.claimed).length
  const playerTeam = searchParams.get('team') || 'none'
  const theme = getTheme(currentTheme)
  const [showKeys, setShowKeys] = useState(false)
  const [gold, setGold] = useState(0)
  const [status, setStatus] = useState({ autoMove: false, spectating: false })
  const [milestone, setMilestone] = useState(null)
  const [prevMass, setPrevMass] = useState(0)
  const [gameTimer, setGameTimer] = useState(3600)
  const [skills, setSkills] = useState({ speed: { active: false, timer: 0, cooldown: 0 }, slow: { active: false, timer: 0, cooldown: 0 }, shield: { active: false, timer: 0, cooldown: 0 } })
  const [deathScreen, setDeathScreen] = useState(null)
  const [respawnCountdown, setRespawnCountdown] = useState(5)
  const [newTeamCode, setNewTeamCode] = useState('')
  const [showPlayerList, setShowPlayerList] = useState(false)
  const [spectateName, setSpectateName] = useState('?')
  const [spectateStats, setSpectateStats] = useState({ mass: 0, color: '#6366f1' })

  const joystickRef = useRef(null)
  const joystickTouchRef = useRef(null)
  const joystickBaseRef = useRef(null)
  const JOYSTICK_R = 55

  const onJoystickStart = useCallback((e) => {
    e.preventDefault()
    const touch = e.changedTouches[0]
    joystickTouchRef.current = touch.identifier
    const base = joystickBaseRef.current?.getBoundingClientRect()
    if (!base) return
    const cx = base.left + base.width / 2, cy = base.top + base.height / 2
    const dx = touch.clientX - cx, dy = touch.clientY - cy
    const d = Math.sqrt(dx*dx + dy*dy)
    const nx = d > 1 ? dx/d : 0, ny = d > 1 ? dy/d : 0
    const clamped = Math.min(d, JOYSTICK_R)
    if (joystickRef.current) {
      joystickRef.current.style.transform = `translate(${nx*clamped}px, ${ny*clamped}px)`
    }
    engineRef.current?.setJoystickInput(nx, ny)
  }, [engineRef])

  const onJoystickMove = useCallback((e) => {
    e.preventDefault()
    let touch = null
    for (const t of e.changedTouches) { if (t.identifier === joystickTouchRef.current) { touch = t; break } }
    if (!touch) return
    const base = joystickBaseRef.current?.getBoundingClientRect()
    if (!base) return
    const cx = base.left + base.width / 2, cy = base.top + base.height / 2
    const dx = touch.clientX - cx, dy = touch.clientY - cy
    const d = Math.sqrt(dx*dx + dy*dy)
    const nx = d > 1 ? dx/d : 0, ny = d > 1 ? dy/d : 0
    const clamped = Math.min(d, JOYSTICK_R)
    if (joystickRef.current) {
      joystickRef.current.style.transform = `translate(${nx*clamped}px, ${ny*clamped}px)`
    }
    engineRef.current?.setJoystickInput(nx, ny)
  }, [engineRef])

  const onJoystickEnd = useCallback((e) => {
    e.preventDefault()
    joystickTouchRef.current = null
    if (joystickRef.current) joystickRef.current.style.transform = 'translate(0px, 0px)'
    engineRef.current?.setJoystickInput(0, 0)
  }, [engineRef])

  const myBadges = BADGES.filter(b => earnedBadges.includes(b.id)).slice(-3)

  const rank = leaderboard.findIndex(p => p.id === engineRef.current?.playerId) + 1

  useEffect(() => {
    if (!engineRef.current) return
    const orig = engineRef.current.onGoldChange
    engineRef.current.onGoldChange = (g) => { setGold(g); orig && orig(g) }
    const origStatus = engineRef.current.onStatusChange
    engineRef.current.onStatusChange = (s) => {
      setStatus(prev => ({ ...prev, ...s }))
      if (s.spectating) {
        const eng = engineRef.current
        if (eng) {
          const targets = Object.values(eng.otherPlayers || {})
          const idx = (eng.spectateIndex || 0) % Math.max(1, targets.length)
          const t = targets[idx]
          setSpectateName(t?.name || '?')
          setSpectateStats({ mass: Math.floor(t?.mass || 0), color: t?.color || '#6366f1' })
        }
      }
      origStatus && origStatus(s)
    }
    const origTimer = engineRef.current.onTimerChange
    engineRef.current.onTimerChange = (t) => { setGameTimer(t); origTimer && origTimer(t) }
    const origSkill = engineRef.current.onSkillChange
    engineRef.current.onSkillChange = (sk) => { setSkills({...sk}); origSkill && origSkill(sk) }
    const origDeath = engineRef.current.onDeath
    engineRef.current.onDeath = (stats) => { setDeathScreen(stats || {}); setRespawnCountdown(5); origDeath && origDeath(stats) }
  }, [engineRef.current])

  useEffect(() => {
    if (!deathScreen) return
    if (respawnCountdown <= 0) return
    const t = setTimeout(() => setRespawnCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [deathScreen, respawnCountdown])

  useEffect(() => {
    const uid = profile?.uid || engineRef.current?.playerId
    if (!uid || uid.startsWith('guest_')) return
    const reqRef = dbRef(db, `users/${uid}/friendRequests`)
    let knownKeys = null
    const unsub = onValue(reqRef, snap => {
      const data = snap.val() || {}
      const keys = Object.keys(data)
      if (knownKeys === null) { knownKeys = new Set(keys); return }
      for (const k of keys) {
        if (!knownKeys.has(k) && data[k]?.status === 'pending') {
          toast(`${data[k].name || 'Biri'} sana arkadaşlık isteği gönderdi!`, { icon: '👥', duration: 4000 })
        }
      }
      knownKeys = new Set(keys)
    })
    return () => off(reqRef)
  }, [profile?.uid])

  useEffect(() => {
    const milestones = [100, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000]
    for (const m of milestones) {
      if (prevMass < m && playerMass >= m) {
        setMilestone(m >= 1000 ? `${m/1000}K` : m)
        setTimeout(() => setMilestone(null), 3000)
        break
      }
    }
    setPrevMass(playerMass)
  }, [playerMass])

  const uiBg = 'rgba(6,6,18,0.88)'
  const uiBorder = `rgba(${theme.glowColor},0.22)`

  const panelStyle = {
    background: uiBg,
    border: `1px solid ${uiBorder}`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)'
  }

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col" style={{ zIndex: 20, pointerEvents: 'none' }}>
        <div className="flex items-center px-4 py-1 gap-3"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-black"
              style={{ color: prestige > 0 ? '#fbbf24' : theme.uiAccent }}>
              {prestige > 0 ? `✨${prestige} ` : ''}Lv.{level}
            </span>
            {myBadges.slice(-1).map(b => (
              <span key={b.id} title={b.name} className="text-sm leading-none">{b.icon}</span>
            ))}
          </div>
          <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div
              animate={{ width: `${(xp / Math.max(1, xpForLevel(level))) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-2 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${theme.gradientA}, ${theme.gradientB})`,
                boxShadow: `0 0 10px rgba(${theme.glowColor},0.7)`
              }}
            />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">{xp}/{xpForLevel(level)} XP</span>
          {myBadges.length > 1 && (
            <div className="flex gap-1 flex-shrink-0">
              {myBadges.slice(0,-1).map(b => (
                <span key={b.id} title={b.name} className="text-xs leading-none opacity-70">{b.icon}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none" style={{ zIndex: 10 }}>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ ...panelStyle, color: theme.uiAccent }}>
          {MODE_LABELS[mode] || mode}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl text-center" style={panelStyle}>
            <div className="text-xs text-gray-500">Sıra</div>
            <div className="text-xl font-black" style={{ color: rank === 1 ? '#fbbf24' : rank <= 3 ? '#06b6d4' : theme.uiAccent }}>
              #{rank || '–'}
            </div>
          </div>
          <div className="flex-1 px-3 py-2 rounded-xl text-center" style={panelStyle}>
            <div className="text-xs text-gray-500">Oyuncu</div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-lg font-black text-white">{totalPlayers}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 rounded-2xl min-w-36" style={panelStyle}>
          {mode === 'rush' ? (
            <>
              <div className="text-xs text-gray-500 mb-1">Kill</div>
              <div className="text-3xl font-black leading-none" style={{ color: '#f59e0b' }}>{engineRef.current?.kills || 0}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-1">Kütle</div>
              <div className="text-3xl font-black text-white leading-none">{(playerMass || 0).toLocaleString()}</div>
            </>
          )}
        </div>

        <div className="px-3 py-2 rounded-xl flex items-center gap-2" style={panelStyle}>
          <span className="text-yellow-400 text-sm">💰</span>
          <span className="text-yellow-400 font-black text-sm">{gold > 0 ? gold : 0}</span>
          <span className="text-gray-500 text-xs">gold</span>
        </div>

        {quests.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              ...panelStyle,
              color: completedQuestCount > 0 ? '#4ade80' : theme.uiAccent,
              border: completedQuestCount > 0 ? '1px solid rgba(74,222,128,0.4)' : undefined
            }}>
            📋 {5 - activeQuestCount - completedQuestCount}/{quests.length} Görev
            {completedQuestCount > 0 && <span className="text-green-400 animate-pulse"> ({completedQuestCount} hazır!)</span>}
          </div>
        )}

        {(status.autoMove || status.spectating) && (
          <div className="flex flex-col gap-1">
            {status.autoMove && (
              <div className="px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold"
                style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Oto Hareket
              </div>
            )}
            {status.spectating && (
              <div className="px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold"
                style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                İzleme Modu
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4" style={{ zIndex: 10, width: 220, maxHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
        <div className="rounded-2xl overflow-hidden" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
          <div style={{
            padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: `1px solid ${uiBorder}`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 2, flex: 1 }}>SIRALAMA</span>
            <span style={{ color: '#4b5563', fontSize: 10, fontWeight: 700 }}>{leaderboard.length}P</span>
          </div>
          <div style={{ padding: '6px 6px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1 }}>
            {leaderboard.slice(0, 10).map((p, i) => {
              const isMe = p.id === engineRef.current?.playerId
              const rankColors = ['#fbbf24','#9ca3af','#cd7c2f']
              const rc = rankColors[i] || '#374151'
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 8px', borderRadius: 10,
                    background: isMe ? `rgba(${theme.glowColor},0.18)` : i === 0 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isMe ? `rgba(${theme.glowColor},0.45)` : i < 3 ? `${rc}30` : 'transparent'}`,
                    boxShadow: isMe ? `0 0 10px rgba(${theme.glowColor},0.12)` : 'none',
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < 3 ? `${rc}22` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${i < 3 ? rc + '66' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: i < 3 ? rc : '#6b7280' }}>{i+1}</span>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 900, color: '#fff', position: 'relative',
                    background: `radial-gradient(circle at 35% 35%, ${p.color}cc, ${p.color}55)`,
                    boxShadow: `0 0 7px ${p.color}70`,
                    border: `1.5px solid ${p.color}99`,
                  }}>
                    {(p.name||'?')[0].toUpperCase()}
                    {p.isGod && (
                      <div style={{
                        position: 'absolute', top: -4, right: -5,
                        background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                        borderRadius: 3, padding: '1px 3px',
                        fontSize: 6, fontWeight: 900, color: '#000', letterSpacing: 0.5,
                        lineHeight: 1.2,
                      }}>APEX</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ color: isMe ? '#fff' : '#e2e8f0', fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                        {p.name}
                      </div>
                      {mode === 'teams' && p.team && p.team !== 'none' && (
                        <span style={{ fontSize: 9, fontWeight: 900, padding: '1px 4px', borderRadius: 4, flexShrink: 0,
                          background: p.team === 'red' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)',
                          color: p.team === 'red' ? '#f87171' : '#60a5fa',
                          border: `1px solid ${p.team === 'red' ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}` }}>
                          {p.team === 'red' ? '🔴' : '🔵'}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}>
                      {Math.floor(p.mass).toLocaleString()}
                    </div>
                  </div>
                  {isMe && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: theme.uiAccent, boxShadow: `0 0 6px ${theme.uiAccent}`, flexShrink: 0 }} />
                  )}
                </motion.div>
              )
            })}
            {leaderboard.length === 0 && (
              <div style={{ color: '#374151', fontSize: 11, textAlign: 'center', padding: '12px 0', fontWeight: 700, letterSpacing: 1 }}>YUKLENIYOR...</div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-end gap-2" style={{ zIndex: 10 }}>
        {[
          { key: 'speed',    icon: '⚡', label: 'HIZLAN',   hotkey: 'F', color: '#fbbf24', glowRgb: '251,191,36',  duration: 10, cooldownMax: 30 },
          { key: 'slow',     icon: '🌀', label: 'YAVAŞLAT', hotkey: 'G', color: '#8b5cf6', glowRgb: '139,92,246',  duration: 5,  cooldownMax: 15 },
          { key: 'shield',   icon: '🛡️', label: 'KALKAN',   hotkey: 'H', color: '#06b6d4', glowRgb: '6,182,212',   duration: 5,  cooldownMax: 20 },
          { key: 'magnet',   icon: '🧲', label: 'MANYETİK', hotkey: 'I', color: '#ec4899', glowRgb: '236,72,153',  duration: 8,  cooldownMax: 25 },
          { key: 'ghost',    icon: '👻', label: 'HAYALET',   hotkey: 'J', color: '#a78bfa', glowRgb: '167,139,250', duration: 4,  cooldownMax: 35 },
          { key: 'teleport', icon: '✨', label: 'IŞINLAN',   hotkey: 'K', color: '#38bdf8', glowRgb: '56,189,248',  duration: 0,  cooldownMax: 45 },
        ].map(sk => {
          const s = skills[sk.key] || {}
          const onCD = s.cooldown > 0.1
          const isActive = s.active
          const noUses = s.usesLeft === 0 && s.maxUses > 0
          const locked = s.maxUses === 0
          const cooldownPct = onCD ? (s.cooldown / sk.cooldownMax) * 100 : 0
          const timerPct = isActive && sk.duration > 0 ? (s.timer / sk.duration) * 100 : 0
          const usesInfinite = s.usesLeft === Infinity || s.maxUses === Infinity
          return (
            <motion.button
              key={sk.key}
              onClick={() => engineRef.current?.[`_activate${sk.key.charAt(0).toUpperCase()+sk.key.slice(1)}`]?.()}
              whileHover={{ scale: (onCD || noUses || locked) ? 1 : 1.08, y: (onCD || noUses || locked) ? 0 : -3 }}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl overflow-hidden"
              style={{
                background: isActive ? `rgba(${sk.glowRgb},0.3)` : locked ? 'rgba(0,0,0,0.6)' : onCD || noUses ? 'rgba(0,0,0,0.5)' : `rgba(${sk.glowRgb},0.15)`,
                border: `1px solid ${isActive ? sk.color : locked ? 'rgba(255,255,255,0.07)' : onCD || noUses ? 'rgba(255,255,255,0.1)' : `rgba(${sk.glowRgb},0.5)`}`,
                boxShadow: isActive ? `0 0 20px rgba(${sk.glowRgb},0.6)` : 'none',
                opacity: locked ? 0.4 : noUses ? 0.5 : onCD ? 0.65 : 1,
                minWidth: 56,
              }}>
              {(isActive || onCD) && (
                <div className="absolute bottom-0 left-0 h-1 rounded-b-xl transition-all"
                  style={{ width: `${isActive && sk.duration > 0 ? timerPct : 100-cooldownPct}%`, background: isActive ? sk.color : 'rgba(255,255,255,0.25)' }} />
              )}
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                </div>
              )}
              <motion.span className="text-lg leading-none"
                animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6, repeat: Infinity }}>
                {sk.icon}
              </motion.span>
              <span className="text-xs font-black leading-none" style={{ color: isActive ? sk.color : onCD || noUses ? '#4b5563' : '#e2e8f0', fontSize: 8 }}>
                {onCD ? `${Math.ceil(s.cooldown)}s` : noUses ? 'BİTTİ' : locked ? 'KİLİTLİ' : sk.label}
              </span>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 8, padding: '1px 4px', borderRadius: 3 }}>
                  [{sk.hotkey}]
                </kbd>
                {!locked && (
                  <span style={{ fontSize: 7, fontWeight: 900, color: usesInfinite ? '#fbbf24' : s.usesLeft > 0 ? sk.color : '#4b5563', letterSpacing: 0.5 }}>
                    {usesInfinite ? 'INF' : `${s.usesLeft || 0}x`}
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-3" style={{ zIndex: 10 }}>
        <motion.button onClick={onLeave}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}>
          ← Menü
        </motion.button>

        <div className="hidden sm:flex items-center gap-2">
          <motion.button onClick={onSplit}
            whileHover={{ scale: 1.08, boxShadow: `0 0 25px rgba(${theme.glowColor},0.6)` }}
            whileTap={{ scale: 0.92 }}
            className="px-5 py-3 rounded-xl font-black text-white text-sm flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 15px rgba(${theme.glowColor},0.3)` }}>
            <span>✂️</span>
            <div>
              <div>BÖLDÜR</div>
              <div className="text-xs opacity-70">SPACE</div>
            </div>
          </motion.button>
          <motion.button onClick={onEject}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            className="px-5 py-3 rounded-xl font-bold text-white text-sm flex items-center gap-2"
            style={panelStyle}>
            <span>💨</span>
            <div>
              <div>FIRLATIR</div>
              <div className="text-xs opacity-50">W/E/R</div>
            </div>
          </motion.button>
        </div>

        <motion.button
          onClick={() => setShowKeys(v => !v)}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-3 py-2.5 rounded-xl font-bold text-sm"
          style={panelStyle}>
          {showKeys ? '✕' : '⌨️'}
        </motion.button>

        <motion.button
          onClick={() => setShowPlayerList(v => !v)}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-3 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 relative"
          style={{
            ...panelStyle,
            background: showPlayerList ? 'rgba(99,102,241,0.2)' : panelStyle.background,
            border: showPlayerList ? '1px solid rgba(99,102,241,0.5)' : panelStyle.border
          }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <span className="text-xs" style={{ color: showPlayerList ? '#a5b4fc' : undefined }}>
            {totalPlayers}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showPlayerList && (
          <div className="absolute bottom-24 right-4" style={{ zIndex: 30 }}>
            <InGamePlayerList
              players={leaderboard.filter(p => p.id !== engineRef.current?.playerId)}
              myPlayerId={engineRef.current?.playerId}
              onClose={() => setShowPlayerList(false)}
              onPlayerClick={(p) => {
                onPlayerProfileClick?.(p)
                setShowPlayerList(false)
              }}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="sm:hidden absolute bottom-6 left-6 flex items-end gap-4" style={{ zIndex: 20 }}>
        <div
          ref={joystickBaseRef}
          onTouchStart={onJoystickStart}
          onTouchMove={onJoystickMove}
          onTouchEnd={onJoystickEnd}
          onTouchCancel={onJoystickEnd}
          style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(20,20,40,0.55)',
            border: `2px solid rgba(${theme.glowColor},0.4)`,
            boxShadow: `0 0 18px rgba(${theme.glowColor},0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'none', position: 'relative', flexShrink: 0
          }}>
          <div
            ref={joystickRef}
            style={{
              width: 46, height: 46, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, rgba(${theme.glowColor},0.95), rgba(${theme.glowColor},0.4))`,
              boxShadow: `0 0 14px rgba(${theme.glowColor},0.6)`,
              transition: 'transform 0.05s',
              touchAction: 'none', pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      <div className="sm:hidden absolute bottom-6 right-6 flex flex-col gap-3" style={{ zIndex: 20 }}>
        <motion.button
          onTouchStart={(e) => { e.preventDefault(); onSplit() }}
          whileTap={{ scale: 0.88 }}
          className="w-18 h-18 rounded-full font-black text-white flex items-center justify-center flex-col"
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`,
            boxShadow: `0 0 22px rgba(${theme.glowColor},0.55)`,
            fontSize: 22, touchAction: 'none'
          }}>
          ✂️
          <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>BÖLDÜR</span>
        </motion.button>
        <motion.button
          onTouchStart={(e) => { e.preventDefault(); onEject() }}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 66, height: 66, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'white', touchAction: 'none'
          }}>
          💨
          <span style={{ fontSize: 8, fontWeight: 700, opacity: 0.7 }}>FIRLATIR</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showKeys && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-2xl p-4"
            style={{ ...panelStyle, zIndex: 20, minWidth: 360 }}>
            <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
              ⌨️ Klavye Kontrolleri
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {KEYS.map(({ key, action, color }) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded-lg text-xs font-black min-w-14 text-center flex-shrink-0"
                    style={{
                      background: color ? `${color}25` : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${color || 'rgba(255,255,255,0.15)'}`,
                      color: color || '#e2e8f0'
                    }}>
                    {key}
                  </kbd>
                  <span className="text-xs text-gray-400">{action}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {milestone !== null && (
          <motion.div
            key={milestone}
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
            style={{ zIndex: 30 }}>
            <motion.div
              animate={{ textShadow: [`0 0 30px rgba(${theme.glowColor},0.8)`, `0 0 60px rgba(${theme.glowColor},1)`, `0 0 30px rgba(${theme.glowColor},0.8)`] }}
              transition={{ duration: 0.5, repeat: 4 }}
              className="text-5xl font-black text-white">
              🎉 {milestone} Kütle!
            </motion.div>
            <div className="text-lg font-bold mt-2" style={{ color: theme.uiAccent }}>Harika iş!</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deathScreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 50, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)' }}>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
              className="rounded-3xl p-8 text-center max-w-sm w-full mx-4"
              style={{ background: 'rgba(15,10,30,0.95)', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 0 60px rgba(239,68,68,0.2)' }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="text-6xl mb-4">💀</motion.div>
              <h2 className="text-3xl font-black text-white mb-1">YENİLDİN!</h2>
              <p className="text-gray-400 text-sm mb-5">Daha iyi şanslar...</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Skor', value: deathScreen.score?.toLocaleString?.() || '0', icon: '⭐' },
                  { label: 'Öldürme', value: deathScreen.kills || '0', icon: '💀' },
                  { label: 'Süre', value: deathScreen.time ? `${Math.floor(deathScreen.time/60)}:${String(deathScreen.time%60).padStart(2,'0')}` : '0:00', icon: '⏱' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="text-xl">{stat.icon}</div>
                    <div className="text-lg font-black text-white">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="text-xs font-bold mb-1.5 text-left" style={{ color: theme.uiAccent }}>🛡️ Takım Kodu <span style={{ color: '#4b5563', fontWeight: 400 }}>(isteğe bağlı)</span></div>
                <input
                  type="text" maxLength={6} placeholder={playerTeam !== 'none' ? playerTeam : 'ALPHA'}
                  value={newTeamCode}
                  onChange={e => setNewTeamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
                  className="w-full px-3 py-2 rounded-xl text-white font-black tracking-widest text-center text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(${theme.glowColor},0.35)` }}
                />
              </div>
              <motion.button
                onClick={() => { setDeathScreen(null); onRestart?.(newTeamCode || playerTeam) }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="w-full py-4 rounded-2xl font-black text-lg mb-3"
                style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 25px rgba(${theme.glowColor},0.4)` }}>
                🔄 Tekrar Başla
              </motion.button>
              <motion.button
                onClick={() => { setDeathScreen(null); onSpectate?.() }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-2xl font-bold text-base mb-2"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}>
                👁️ Oyunu İzle
              </motion.button>
              <motion.button
                onClick={() => { setDeathScreen(null); onLeave() }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-2xl font-bold text-base"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#9ca3af' }}>
                {respawnCountdown > 0 ? `⏳ ${respawnCountdown}s — Menüye Dön` : '🏠 Menüye Dön'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{ zIndex: 10 }}>
        <motion.div
          animate={gameTimer <= 300 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg"
          style={{
            background: gameTimer <= 60 ? 'rgba(239,68,68,0.35)' : gameTimer <= 300 ? 'rgba(239,68,68,0.25)' : 'rgba(0,0,0,0.6)',
            border: `1px solid ${gameTimer <= 300 ? 'rgba(239,68,68,0.6)' : `rgba(${theme.glowColor},0.3)`}`,
            color: gameTimer <= 300 ? '#f87171' : theme.uiAccent,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
          {mode === 'rush' ? '⚡' : '⏱'} {formatTime(gameTimer)}
        </motion.div>
        {(mode === 'teams' || mode === 'clan_war') && playerTeam !== 'none' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full font-black text-sm"
            style={{
              background: playerTeam === 'red' ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)',
              border: `1px solid ${playerTeam === 'red' ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.6)'}`,
              color: playerTeam === 'red' ? '#f87171' : '#93c5fd'
            }}>
            {playerTeam === 'red' ? '🔴 Kırmızı Takım' : '🔵 Mavi Takım'}
          </div>
        )}
        {mode === 'battle_royale' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs"
            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
            💥 Battle Royale — Zon Daralıyor!
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: '#4b5563' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {roomId}
        </div>
      </div>

      <AnimatePresence>
        {status.spectating && !deathScreen && (
          <motion.div
            key="spectator-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14
            }}>
              <motion.div
                initial={{ y: -30 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 280 }}
                style={{
                  background: 'rgba(6,4,22,0.92)', border: '1px solid rgba(168,85,247,0.55)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 20, padding: '10px 28px 12px',
                  boxShadow: '0 0 40px rgba(168,85,247,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
                  <span style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 900, letterSpacing: 3 }}>İZLEME MODU</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${spectateStats.color}cc, ${spectateStats.color}44)`, border: `2px solid ${spectateStats.color}bb`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', boxShadow: `0 0 14px ${spectateStats.color}55` }}>
                    {(spectateName||'?')[0].toUpperCase()}
                  </div>
                  <span style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>{spectateName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Kütle</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24' }}>{spectateStats.mass.toLocaleString()}</span>
                </div>
              </motion.div>
            </div>

            <div style={{
              position: 'absolute', bottom: 90, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 10, pointerEvents: 'auto'
            }}>
              {[{ label: '◀ Önceki', dir: -1 }, { label: 'Sonraki ▶', dir: 1 }].map(({ label, dir }) => (
                <motion.button key={label} whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    engineRef.current?._spectateChange(dir)
                    const eng = engineRef.current
                    if (eng) {
                      const ts = Object.values(eng.otherPlayers || {})
                      const t = ts[(eng.spectateIndex||0) % Math.max(1,ts.length)]
                      setSpectateName(t?.name || '?')
                      setSpectateStats({ mass: Math.floor(t?.mass || 0), color: t?.color || '#6366f1' })
                    }
                  }}
                  style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.6)', color: '#c4b5fd', borderRadius: 14, padding: '11px 24px', fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 18px rgba(168,85,247,0.2)' }}>
                  {label}
                </motion.button>
              ))}
              <motion.button whileTap={{ scale: 0.92 }}
                onClick={() => { onRestart?.(playerTeam) }}
                style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, border: 'none', color: '#fff', borderRadius: 14, padding: '11px 24px', fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: `0 0 22px rgba(${theme.glowColor},0.45)` }}>
                🔄 Tekrar Başla
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
