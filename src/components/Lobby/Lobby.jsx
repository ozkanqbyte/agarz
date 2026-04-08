import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { ref, set, onValue, remove, update } from 'firebase/database'
import { signInAnonymously, updateProfile } from 'firebase/auth'
import { db, auth } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
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

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b"
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

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">

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
                {players.map((p, i) => (
                  <motion.div key={p.uid || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: p.uid === playerId
                        ? `rgba(${theme.glowColor},0.1)`
                        : 'rgba(255,255,255,0.03)',
                      border: p.uid === playerId
                        ? `1px solid rgba(${theme.glowColor},0.3)`
                        : '1px solid rgba(255,255,255,0.06)'
                    }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0"
                      style={{
                        background: p.color || '#6366f1',
                        boxShadow: `0 0 15px ${p.color || '#6366f1'}66`
                      }}>
                      {p.isGod ? '👑' : p.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">
                        {p.isGod ? '👑 ' : ''}{p.name}
                        {p.uid === lobby?.host && <span className="ml-1 text-yellow-400 text-xs">(Host)</span>}
                        {p.uid === playerId && <span className="ml-1 text-xs" style={{ color: theme.uiAccent }}>(Sen)</span>}
                      </div>
                      {p.clan && <div className="text-xs text-gray-500">[{p.clan}]</div>}
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${p.ready ? 'text-green-400' : 'text-gray-500'}`}
                      style={{
                        background: p.ready ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                        border: p.ready ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)'
                      }}>
                      {p.ready ? '✓ Hazır' : '○ Bekle'}
                    </div>
                  </motion.div>
                ))}

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

            <motion.button onClick={startGame}
              whileHover={{ scale: 1.03, boxShadow: `0 0 30px rgba(${theme.glowColor},0.6)` }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-xl font-black text-white text-lg"
              style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 20px rgba(${theme.glowColor},0.4)` }}>
              ▶ BAŞLAT
            </motion.button>
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
