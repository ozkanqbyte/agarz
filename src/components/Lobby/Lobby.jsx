import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { ref, set, onValue, remove, update, get } from 'firebase/database'
import { signInAnonymously, updateProfile } from 'firebase/auth'
import { db, auth } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import useProgressStore from '../../store/useProgressStore'
import { getTheme } from '../../themes/themes'
import FriendSystem from '../Friends/FriendSystem'
import toast from 'react-hot-toast'

const GAME_MODES = [
  { id: 'ffa', name: 'Free For All', icon: '⚔️' },
  { id: 'teams', name: 'Takım Modu', icon: '🛡️' },
  { id: 'battle_royale', name: 'Battle Royale', icon: '💥' },
  { id: 'rush', name: 'Rush Mode', icon: '⚡' },
  { id: 'clan_war', name: 'Klan Savaşı', icon: '🏰' },
]

function getOrCreateGuestId() {
  try {
    let id = sessionStorage.getItem('lobbyGuestId')
    if (!id) {
      id = 'guest_' + Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem('lobbyGuestId', id)
    }
    return id
  } catch {
    return 'guest_' + Math.random().toString(36).slice(2, 10)
  }
}

export default function Lobby() {
  const [searchParams] = useSearchParams()
  const { mode: modeParam } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { currentTheme, gameMode } = useGameStore()
  const { level, prestige, activeFrame } = useProgressStore()
  const theme = getTheme(currentTheme)

  const playerId = user?.uid || getOrCreateGuestId()
  const playerName = profile?.name || user?.displayName || 'Player'
  const playerColor = profile?.color || '#6366f1'

  const rawRoom = searchParams.get('room') || (modeParam ? `lobby_${modeParam}_main` : 'lobby_main')
  const roomId = rawRoom.replace(/[.#$[\]/\s:?&=]/g, '_').slice(0, 80)
  const [lobby, setLobby] = useState(null)
  const [players, setPlayers] = useState([])
  const [isHost, setIsHost] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([])
  const [selectedMode, setSelectedMode] = useState(modeParam || gameMode || 'ffa')
  const [countdown, setCountdown] = useState(null)
  const [ready, setReady] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const chatBottomRef = useRef(null)

  const inviteLink = `${window.location.origin}/lobby?room=${roomId}`
  const shortCode = roomId.replace('priv_', '').toUpperCase()

  const uiBg = 'rgba(6,6,20,0.92)'
  const uiBorder = `rgba(${theme.glowColor},0.22)`
  const panelStyle = {
    background: uiBg,
    border: `1px solid ${uiBorder}`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)'
  }

  useEffect(() => {
    let unsub
    let didCreate = false
    let _playerId = playerId
    let _playerName = playerName

    const ensureAuth = async () => {
      if (user?.uid) return user.uid
      try {
        const cred = await signInAnonymously(auth)
        const name = sessionStorage.getItem('lobbyGuestName') || 'Misafir'
        try { await updateProfile(cred.user, { displayName: name }) } catch {}
        useAuthStore.setState(s => ({ user: cred.user, isGuest: true }))
        _playerId = cred.user.uid
        _playerName = name
        return cred.user.uid
      } catch {
        return _playerId
      }
    }

    const doJoin = async () => {
      try {
        await set(ref(db, `lobbies/${roomId}/players/${_playerId}`), {
          uid: _playerId,
          name: _playerName,
          color: playerColor,
          isGod: profile?.isGod || false,
          clan: profile?.clan || null,
          level: level || 1,
          prestige: prestige || 0,
          frame: activeFrame || null,
          ready: false,
          joinedAt: Date.now()
        })
      } catch (e) {
        console.warn('Lobby join failed:', e?.message)
        toast.error('Lobi bağlantısı kurulamadı: ' + (e?.code || 'Hata'))
      }
    }

    const doLeave = async () => {
      try {
        await remove(ref(db, `lobbies/${roomId}/players/${_playerId}`))
      } catch (e) {}
    }

    const init = async () => {
      await ensureAuth()

      try {
        const lobbyRef = ref(db, `lobbies/${roomId}`)
        unsub = onValue(lobbyRef, async (snap) => {
          if (!snap.exists()) {
            if (!didCreate) {
              didCreate = true
              try {
                await set(ref(db, `lobbies/${roomId}`), {
                  host: _playerId,
                  hostName: _playerName,
                  mode: selectedMode,
                  maxPlayers: 8,
                  createdAt: Date.now(),
                  players: {},
                  chat: {}
                })
                await doJoin()
              } catch (e) {
                const me = { uid: _playerId, name: _playerName, color: playerColor, ready: false, isHost: true }
                setPlayers([me])
                setIsHost(true)
                setLobby({ host: _playerId, mode: selectedMode })
              }
            }
            return
          }
          const data = snap.val()
          setLobby(data)
          setPlayers(Object.values(data.players || {}))
          setIsHost(data.host === _playerId)
          const msgs = Object.values(data.chat || {}).sort((a, b) => (a.time || 0) - (b.time || 0))
          setMessages(msgs.slice(-50))
          if (data.starting) setCountdown(data.countdown || 5)
        })
      } catch (e) {
        const me = { uid: _playerId, name: _playerName, color: playerColor, ready: false, isHost: true }
        setPlayers([me])
        setIsHost(true)
        setLobby({ host: _playerId, mode: selectedMode })
      }

      await doJoin()
    }

    init()
    return () => {
      if (typeof unsub === 'function') unsub()
      try { remove(ref(db, `lobbies/${roomId}/players/${_playerId}`)) } catch {}
    }
  }, [roomId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      navigate(`/game?room=${roomId}&name=${encodeURIComponent(playerName)}&mode=${selectedMode}`)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const toggleReady = async () => {
    const newReady = !ready
    setReady(newReady)
    try {
      await update(ref(db, `lobbies/${roomId}/players/${playerId}`), { ready: newReady })
    } catch (e) {}
  }

  const startGame = async () => {
    if (!isHost) { toast.error('Sadece host oyunu başlatabilir!'); return }
    if (players.length > 1) {
      const notReady = players.filter(p => !p.ready)
      if (notReady.length > 0) {
        toast.error(`${notReady.length} oyuncu henüz hazır değil!`)
        return
      }
    }
    try {
      await update(ref(db, `lobbies/${roomId}`), { starting: true, countdown: 5, mode: selectedMode })
    } catch (e) {
      navigate(`/game?room=${roomId}&name=${encodeURIComponent(playerName)}&mode=${selectedMode}`)
    }
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    const msg = { text: chatInput.trim().slice(0, 200), name: playerName, color: playerColor, time: Date.now() }
    setChatInput('')
    try {
      const msgRef = ref(db, `lobbies/${roomId}/chat/${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
      await set(msgRef, msg)
    } catch (e) {
      setMessages(prev => [...prev, msg])
    }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      toast.success('Davet linki kopyalandı! 🔗')
      setTimeout(() => setCopied(false), 3000)
    }).catch(() => {
      toast.success(`Kod: ${shortCode}`)
    })
  }

  const readyCount = players.filter(p => p.ready).length

  const sendFriendRequestFromLobby = async (targetPlayer) => {
    if (!playerId || playerId.startsWith('guest_') || !targetPlayer?.uid) return
    try {
      const reqRef = ref(db, `users/${targetPlayer.uid}/friendRequests/${playerId}`)
      const snap = await get(reqRef)
      if (snap.exists()) { toast.error('İstek zaten gönderildi'); return }
      await set(reqRef, {
        uid: playerId,
        name: playerName,
        color: playerColor,
        status: 'pending',
        sentAt: Date.now()
      })
      toast.success(`${targetPlayer.name} adlı kişiye arkadaşlık isteği gönderildi`)
      setSelectedPlayer(null)
    } catch { toast.error('İstek gönderilemedi') }
  }

  const blockPlayerFromLobby = async (targetPlayer) => {
    if (!playerId || playerId.startsWith('guest_') || !targetPlayer?.uid) return
    try {
      await set(ref(db, `users/${playerId}/blocked/${targetPlayer.uid}`), {
        uid: targetPlayer.uid,
        name: targetPlayer.name,
        blockedAt: Date.now()
      })
      toast.success(`${targetPlayer.name} engellendi`)
      setSelectedPlayer(null)
    } catch { toast.error('Engellenemedi') }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #05050f 0%, #0d0d1e 50%, #050510 100%)' }}>

      <div className="absolute inset-0 pointer-events-none">
        <div style={{ background: `radial-gradient(ellipse at 30% 40%, rgba(${theme.glowColor},0.07) 0%, transparent 60%)`, position: 'absolute', inset: 0 }} />
        {[...Array(8)].map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{
              width: 60 + i * 30, height: 60 + i * 30,
              left: `${(i * 25 + 10) % 90}%`,
              top: `${(i * 17 + 15) % 80}%`,
              background: theme.uiAccent,
              opacity: 0.04,
              filter: 'blur(40px)'
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.07, 0.04] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.7 }}
          />
        ))}
      </div>

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
            <div className="text-center">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="font-black text-white"
                style={{ fontSize: 120, lineHeight: 1, textShadow: `0 0 60px rgba(${theme.glowColor},1)`, color: theme.uiAccent }}>
                {countdown}
              </motion.div>
              <div className="text-2xl font-bold text-white mt-4">Oyun başlıyor...</div>
              <div className="text-gray-400 mt-2">{selectedMode.toUpperCase()} · {players.length} oyuncu</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedPlayer(null)}
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl p-6 w-80 mx-4"
              style={{ background: 'rgba(10,10,25,0.97)', border: `1px solid rgba(${theme.glowColor},0.4)`, boxShadow: `0 0 40px rgba(${theme.glowColor},0.2)` }}>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl flex-shrink-0"
                  style={{ background: selectedPlayer.color || '#6366f1', boxShadow: `0 0 20px ${selectedPlayer.color || '#6366f1'}88` }}>
                  {selectedPlayer.isGod ? '👑' : selectedPlayer.name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-black text-white text-lg">{selectedPlayer.name}</div>
                  {selectedPlayer.clan && <div className="text-sm text-gray-400">[{selectedPlayer.clan}]</div>}
                  {selectedPlayer.uid === lobby?.host && (
                    <div className="text-xs font-bold mt-0.5" style={{ color: '#fbbf24' }}>Host</div>
                  )}
                </div>
                <button onClick={() => setSelectedPlayer(null)}
                  className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {!playerId?.startsWith('guest_') && selectedPlayer.uid !== playerId && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => sendFriendRequestFromLobby(selectedPlayer)}
                      className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                      style={{ background: `rgba(${theme.glowColor},0.2)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                      </svg>
                      Arkadaş Ekle
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => blockPlayerFromLobby(selectedPlayer)}
                      className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                      Engelle
                    </motion.button>
                  </>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlayer(null)}
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-gray-500"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Kapat
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-30 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: uiBorder, background: 'rgba(5,5,15,0.9)' }}>
        <div className="flex items-center gap-4">
          <motion.button onClick={() => navigate('/menu')}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`, color: '#9ca3af' }}>
            ← Geri
          </motion.button>
          <div>
            <h1 className="text-xl font-black text-white">🏠 Özel Lobi</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">{players.length} oyuncu</span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-400">{roomId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)` }}>
            <span className="text-gray-400 text-sm">Kod:</span>
            <span className="font-black text-white tracking-widest">{shortCode}</span>
          </div>
          <motion.button onClick={copyInvite}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
            style={{
              background: copied ? 'rgba(34,197,94,0.2)' : `rgba(${theme.glowColor},0.15)`,
              border: `1px solid rgba(${theme.glowColor},0.4)`,
              color: copied ? '#4ade80' : theme.uiAccent
            }}>
            {copied ? '✓ Kopyalandı' : '🔗 Davet'}
          </motion.button>
          <FriendSystem compact lobbyId={roomId} />
        </div>
      </header>

      <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">

        <div className="lg:col-span-2 flex flex-col gap-4">

          <div className="rounded-2xl overflow-hidden" style={panelStyle}>
            <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: uiBorder }}>
              <div className="flex items-center gap-2">
                <span className="text-white font-black">👥 Oyuncular</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `rgba(${theme.glowColor},0.2)`, color: theme.uiAccent }}>
                  {players.length}/8
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {readyCount}/{players.length} Hazır
              </div>
            </div>

            <div className="p-3">
              {players.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  <div className="text-4xl mb-2">🏠</div>
                  <div>Lobi bekleniyor...</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((p, i) => {
                  const frameColors = {
                    silver: '#9ca3af', gold: '#f59e0b', diamond: '#38bdf8', legendary: '#ec4899',
                    fire: '#ef4444', ice: '#60a5fa', neon: '#a78bfa', rainbow: '#ec4899',
                    galaxy: '#818cf8', sakura: '#fda4af',
                  }
                  const frameBorder = p.frame ? frameColors[p.frame] || '#6366f1' : (p.color || '#6366f1')
                  return (
                  <motion.div key={p.uid || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => p.uid !== playerId && setSelectedPlayer(p)}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: p.uid === playerId
                        ? `rgba(${theme.glowColor},0.1)`
                        : 'rgba(255,255,255,0.03)',
                      border: p.uid === playerId
                        ? `1px solid rgba(${theme.glowColor},0.3)`
                        : '1px solid rgba(255,255,255,0.06)',
                      cursor: p.uid !== playerId ? 'pointer' : 'default'
                    }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 18,
                        background: p.color || '#6366f1',
                        boxShadow: `0 0 14px ${frameBorder}88`,
                        border: `2.5px solid ${frameBorder}`,
                      }}>
                        {p.isGod ? '👑' : p.name?.[0] || '?'}
                      </div>
                      {(p.level > 1 || p.prestige > 0) && (
                        <div style={{
                          position: 'absolute', bottom: -4, right: -4,
                          background: p.prestige > 0 ? '#f59e0b' : 'rgba(30,30,50,0.95)',
                          border: `1px solid ${p.prestige > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                          borderRadius: 8, padding: '1px 5px',
                          fontSize: 9, fontWeight: 900,
                          color: p.prestige > 0 ? '#000' : '#9ca3af',
                        }}>
                          {p.prestige > 0 ? `✦${p.prestige}` : `${p.level}`}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span className="font-bold text-white text-sm truncate">
                          {p.isGod ? '👑 ' : ''}{p.name}
                        </span>
                        {p.uid === lobby?.host && (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 5px', borderRadius: 5, border: '1px solid rgba(245,158,11,0.3)' }}>HOST</span>
                        )}
                        {p.uid === playerId && (
                          <span style={{ fontSize: 9, fontWeight: 900, color: theme.uiAccent, background: `rgba(${theme.glowColor},0.12)`, padding: '1px 5px', borderRadius: 5, border: `1px solid rgba(${theme.glowColor},0.3)` }}>SEN</span>
                        )}
                      </div>
                      {p.clan && <div className="text-xs text-gray-500">[{p.clan}]</div>}
                      {p.frame && (
                        <div style={{ fontSize: 9, color: frameBorder, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {p.frame} çerçeve
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                      color: p.ready ? '#4ade80' : '#6b7280',
                      background: p.ready ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                      border: p.ready ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.07)',
                      flexShrink: 0,
                    }}>
                      {p.ready ? '✓ Hazır' : '○ Bekle'}
                    </div>
                  </motion.div>
                  )
                })}

                {[...Array(Math.max(0, 4 - players.length))].map((_, i) => (
                  <div key={`empty-${i}`}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 text-xl"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      +
                    </div>
                    <span className="text-gray-700 text-sm">Boş slot</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={panelStyle}>
            <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
              ⚙️ Oyun Ayarları
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GAME_MODES.map(m => (
                <motion.button key={m.id}
                  onClick={() => {
                    setSelectedMode(m.id)
                    if (isHost) {
                      try { update(ref(db, `lobbies/${roomId}`), { mode: m.id }) } catch (e) {}
                    }
                  }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  disabled={!isHost}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: selectedMode === m.id ? `rgba(${theme.glowColor},0.2)` : 'rgba(255,255,255,0.04)',
                    border: selectedMode === m.id ? `1px solid rgba(${theme.glowColor},0.5)` : '1px solid rgba(255,255,255,0.07)',
                    color: selectedMode === m.id ? theme.uiAccent : '#6b7280',
                    opacity: !isHost && selectedMode !== m.id ? 0.5 : 1,
                    cursor: isHost ? 'pointer' : 'default'
                  }}>
                  <span>{m.icon}</span>
                  <span className="text-xs">{m.name}</span>
                </motion.button>
              ))}
            </div>
            {!isHost && <div className="text-xs text-gray-600 mt-2">Sadece host mod değiştirebilir</div>}
          </div>

          <div className="flex gap-3">
            <motion.button onClick={toggleReady}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex-1 py-4 rounded-xl font-black text-lg"
              style={{
                background: ready
                  ? 'rgba(34,197,94,0.2)'
                  : `rgba(${theme.glowColor},0.15)`,
                border: ready
                  ? '1px solid rgba(34,197,94,0.5)'
                  : `1px solid rgba(${theme.glowColor},0.4)`,
                color: ready ? '#4ade80' : theme.uiAccent
              }}>
              {ready ? '✓ Hazırım!' : '○ Hazır Değilim'}
            </motion.button>

            {isHost && (
              <motion.button onClick={startGame}
                whileHover={{ scale: 1.03, boxShadow: `0 0 30px rgba(${theme.glowColor},0.6)` }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-xl font-black text-white text-lg"
                style={{
                  background: (readyCount === players.length && players.length > 0) || players.length <= 1
                    ? `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: (readyCount === players.length && players.length > 0) || players.length <= 1
                    ? `0 0 20px rgba(${theme.glowColor},0.4)` : 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: (readyCount === players.length && players.length > 0) || players.length <= 1 ? '#fff' : '#4b5563',
                  cursor: 'pointer',
                }}>
                {(readyCount === players.length && players.length > 0) || players.length <= 1 ? '▶ BAŞLAT' : `⏳ ${players.length - readyCount} Bekle`}
              </motion.button>
            )}
            {!isHost && (
              <div className="px-6 py-4 rounded-xl font-bold text-sm flex items-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#4b5563' }}>
                Host başlatacak
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">

          <div className="rounded-2xl p-4" style={panelStyle}>
            <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
              📋 Lobi Bilgisi
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Oyun Modu</span>
                <span className="text-white font-bold text-sm">
                  {GAME_MODES.find(m => m.id === selectedMode)?.icon} {GAME_MODES.find(m => m.id === selectedMode)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Oyuncu</span>
                <span className="text-white font-bold text-sm">{players.length}/8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Hazır</span>
                <span className="font-bold text-sm" style={{ color: readyCount === players.length && players.length > 0 ? '#4ade80' : '#fbbf24' }}>
                  {readyCount}/{players.length}
                </span>
              </div>
              <div className="border-t pt-3" style={{ borderColor: uiBorder }}>
                <div className="text-gray-400 text-xs mb-2">Davet Kodu</div>
                <div className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${theme.glowColor},0.2)` }}>
                  <span className="font-black text-white tracking-widest flex-1">{shortCode}</span>
                  <motion.button onClick={copyInvite} whileTap={{ scale: 0.9 }}
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: `rgba(${theme.glowColor},0.2)`, color: theme.uiAccent }}>
                    {copied ? '✓' : 'Kopyala'}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl flex flex-col flex-1" style={{ ...panelStyle, minHeight: 300 }}>
            <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: uiBorder }}>
              <span className="text-white font-black text-sm">💬 Lobi Sohbeti</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: 280 }}>
              {messages.length === 0 && (
                <div className="text-center py-6 text-gray-600 text-xs">
                  Henüz mesaj yok...
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm">
                  <span className="font-bold" style={{ color: msg.color || theme.uiAccent }}>{msg.name}: </span>
                  <span className="text-gray-300">{msg.text}</span>
                </motion.div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <div className="p-3 border-t flex gap-2" style={{ borderColor: uiBorder }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Mesaj yaz..."
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${theme.glowColor},0.25)`, outline: 'none' }}
              />
              <motion.button onClick={sendMessage}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl font-bold text-sm"
                style={{ background: `rgba(${theme.glowColor},0.25)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent }}>
                →
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
