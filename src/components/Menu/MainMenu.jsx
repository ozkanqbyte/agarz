import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ref, onValue, off } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import usePremiumStore from '../../store/usePremiumStore'
import useProgressStore, { xpForLevel, BADGES } from '../../store/useProgressStore'
import useQuestStore from '../../store/useQuestStore'
import { THEME_LIST, getTheme } from '../../themes/themes'
import { fbGetLeaderboard } from '../../firebase/syncService'
import FriendSystem from '../Friends/FriendSystem'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

const GAME_MODES = [
  { id: 'ffa', name: 'Free For All', icon: '⚔️', desc: 'Herkese karşı oyna! En büyük kazanır.', color: '#6366f1', players: '2-100' },
  { id: 'teams', name: 'Takım Modu', icon: '🛡️', desc: 'Kırmızı vs Mavi! Takımınla birleş.', color: '#06b6d4', players: '2-50' },
  { id: 'battle_royale', name: 'Battle Royale', icon: '💥', desc: 'Alan küçülüyor, son kalan kazanır!', color: '#ef4444', players: '2-30' },
  { id: 'rush', name: 'Rush Mode', icon: '⚡', desc: 'Hızlı büyü, 5 dakika içinde kazan!', color: '#f59e0b', players: '2-20' },
  { id: 'clan_war', name: 'Klan Savaşı', icon: '🏰', desc: 'Klanlar arası büyük savaş!', color: '#10b981', players: '10-50' },
]

const NAV_ITEMS = [
  { id: 'play', icon: '🎮', label: 'Oyna' },
  { id: 'lobby', icon: '🏠', label: 'Lobi' },
  { id: 'friends', icon: '👥', label: 'Arkadaşlar' },
  { id: 'profile', icon: '👤', label: 'Profil' },
  { id: 'clan', icon: '⚔️', label: 'Klan' },
  { id: 'leaderboard', icon: '🏆', label: 'Sıralama' },
  { id: 'quests', icon: '📋', label: 'Görevler' },
  { id: 'battlepass', icon: '🎖️', label: 'Battle Pass' },
]

const MOCK_LEADERBOARD = [
  { name: 'DragonSlayer', mass: 98450, color: '#6366f1', isGod: true },
  { name: 'CellMaster', mass: 74200, color: '#ec4899', isGod: false },
  { name: 'VirusKing', mass: 61800, color: '#f59e0b', isGod: false },
  { name: 'NeonGhost', mass: 55300, color: '#06b6d4', isGod: false },
  { name: 'BlobZilla', mass: 48900, color: '#10b981', isGod: false },
  { name: 'AgarPro', mass: 41200, color: '#8b5cf6', isGod: true },
  { name: 'CyberCell', mass: 37600, color: '#ef4444', isGod: false },
  { name: 'StarEater', mass: 29400, color: '#38bdf8', isGod: false },
  { name: 'MassHunter', mass: 21100, color: '#a855f7', isGod: false },
  { name: 'BlobFish', mass: 15300, color: '#22c55e', isGod: false },
]

function FloatingBalls({ theme }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(18)].map((_, i) => {
        const size = 30 + (i * 23) % 100
        const colors = theme.foodColors || [theme.uiAccent]
        const color = colors[i % colors.length]
        return (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size,
              left: `${(i * 17 + 5) % 95}%`,
              top: `${(i * 13 + 8) % 88}%`,
              background: color,
              opacity: 0.08 + (i % 3) * 0.04,
              filter: `blur(${8 + (i%3)*12}px)`
            }}
            animate={{
              x: [0, (i%2===0?1:-1) * (20 + i%30), 0],
              y: [0, (i%3===0?1:-1) * (15 + i%25), 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 6 + i%5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          />
        )
      })}
    </div>
  )
}

export default function MainMenu() {
  const { user, profile, logout } = useAuthStore()
  const { gameMode, currentTheme, setGameMode, setTheme } = useGameStore()
  const { setShowShop, ownedPackage } = usePremiumStore()
  const { xp, level, prestige, earnedBadges } = useProgressStore()
  const { quests, checkReset } = useQuestStore()
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState(profile?.name || 'Player')
  const [tab, setTab] = useState('play')

  useEffect(() => { checkReset() }, [])
  const [modeOpen, setModeOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [hoveredTheme, setHoveredTheme] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState('red')

  const theme = getTheme(hoveredTheme || currentTheme)
  const selectedMode = GAME_MODES.find(m => m.id === gameMode) || GAME_MODES[0]

  const handlePlay = () => {
    if (!playerName.trim()) { toast.error('Bir isim gir!'); return }
    const roomId = 'main_' + gameMode + '_' + Math.floor(Date.now()/300000)
    const teamParam = gameMode === 'teams' || gameMode === 'clan_war' ? `&team=${selectedTeam}` : ''
    navigate(`/game?room=${roomId}&name=${encodeURIComponent(playerName)}&mode=${gameMode}${teamParam}`)
  }

  const handlePrivateLobby = () => {
    const roomId = 'priv_' + uuidv4().slice(0, 8)
    navigate(`/lobby/${gameMode}?room=${roomId}`)
  }

  const handleModeLobby = (mode) => {
    navigate(`/lobby/${mode}`)
  }

  const panelStyle = {
    background: 'rgba(10,10,25,0.85)',
    border: `1px solid rgba(${theme.glowColor},0.25)`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)'
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid rgba(${theme.glowColor},0.3)`,
    color: '#fff',
    outline: 'none'
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, #050510 0%, #0d0d20 40%, #050514 100%)` }}>

      <FloatingBalls theme={theme} />

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 20% 50%, rgba(${theme.glowColor},0.08) 0%, transparent 60%)` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 30%, rgba(${theme.glowColor},0.05) 0%, transparent 50%)` }} />

      <div className="relative z-10 flex flex-1 overflow-hidden">

      <nav className="flex flex-col items-center py-8 px-4 gap-6 flex-shrink-0"
        style={{ width: 80, background: 'rgba(5,5,15,0.9)', borderRight: `1px solid rgba(${theme.glowColor},0.15)` }}>

        <motion.div
          animate={{ textShadow: [`0 0 15px rgba(${theme.glowColor},0.8)`, `0 0 35px rgba(${theme.glowColor},1)`, `0 0 15px rgba(${theme.glowColor},0.8)`] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center cursor-default">
          <div className="text-xl font-black tracking-widest"
            style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AG
          </div>
          <div className="text-xs font-black tracking-widest"
            style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ARZ
          </div>
        </motion.div>

        <div className="flex flex-col gap-2 flex-1 mt-4">
          {NAV_ITEMS.map(item => (
            <motion.button key={item.id}
              onClick={() => setTab(item.id)}
              whileHover={{ scale: 1.1, x: 2 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all"
              style={{
                background: tab === item.id ? `rgba(${theme.glowColor},0.2)` : 'transparent',
                border: tab === item.id ? `1px solid rgba(${theme.glowColor},0.5)` : '1px solid transparent',
                boxShadow: tab === item.id ? `0 0 15px rgba(${theme.glowColor},0.2)` : 'none'
              }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-bold" style={{ color: tab === item.id ? theme.uiAccent : '#4b5563' }}>
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>

        <motion.button onClick={logout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all"
          style={{ color: '#6b7280' }}>
          <span className="text-lg">🚪</span>
          <span className="text-xs">Çıkış</span>
        </motion.button>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="flex-1 overflow-y-auto p-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white">
              {tab === 'play' && '🎮 Oyna'}
              {tab === 'lobby' && '🏠 Lobi'}
              {tab === 'friends' && '👥 Arkadaşlar'}
              {tab === 'profile' && '👤 Profil'}
              {tab === 'clan' && '⚔️ Klan'}
              {tab === 'leaderboard' && '🏆 Küresel Sıralama'}
            {tab === 'quests' && '📋 Günlük Görevler'}
            {tab === 'battlepass' && '🎖️ Battle Pass'}
            </h2>
            <p className="text-sm" style={{ color: `rgba(${theme.glowColor},0.7)` }}>
              {profile?.isGod ? '👑 GOD · ' : ''}{profile?.name} · Seviye {profile?.level || 1}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.premium !== 'free' && profile?.premium && (
              <div className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000' }}>
                💎 {profile.premium?.toUpperCase()}
              </div>
            )}
            <motion.button onClick={() => setShowShop(true)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)', color: '#000' }}>
              💎 Mağaza
            </motion.button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {tab === 'play' && (
            <motion.div key="play"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              <div className="lg:col-span-2 space-y-4">

                <div className="rounded-2xl p-5" style={panelStyle}>
                  <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: theme.uiAccent }}>
                    Oyuncu İsmi
                  </label>
                  <input
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value.slice(0, 20))}
                    className="w-full px-4 py-3 rounded-xl font-bold text-lg"
                    style={inputStyle}
                    placeholder="İsmini gir..."
                  />
                </div>

                <div className="rounded-2xl p-5" style={panelStyle}>
                  <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: theme.uiAccent }}>
                    Oyun Modu
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {GAME_MODES.map(m => (
                      <motion.button key={m.id}
                        onClick={() => setGameMode(m.id)}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                        style={{
                          background: gameMode === m.id ? `rgba(${theme.glowColor},0.15)` : 'rgba(255,255,255,0.03)',
                          border: gameMode === m.id ? `1px solid rgba(${theme.glowColor},0.5)` : '1px solid rgba(255,255,255,0.07)',
                          boxShadow: gameMode === m.id ? `0 0 20px rgba(${theme.glowColor},0.15)` : 'none'
                        }}>
                        <div className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: gameMode === m.id ? `rgba(${theme.glowColor},0.2)` : 'rgba(255,255,255,0.05)' }}>
                          {m.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{m.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                              {m.players} oyuncu
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                        </div>
                        {gameMode === m.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: theme.uiAccent, boxShadow: `0 0 8px ${theme.uiAccent}` }} />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-5" style={panelStyle}>
                  <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: theme.uiAccent }}>
                    Tema Seç
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {THEME_LIST.map(t => {
                      const th = getTheme(t.id)
                      const locked = t.premium && (!ownedPackage || ownedPackage === 'free')
                      return (
                        <motion.button key={t.id}
                          onMouseEnter={() => !locked && setHoveredTheme(t.id)}
                          onMouseLeave={() => setHoveredTheme(null)}
                          onClick={() => {
                            if (locked) { toast.error('Bu tema Premium gerektirir! 💎'); setShowShop(true); return }
                            setTheme(t.id)
                          }}
                          whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.95 }}
                          className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
                          style={{
                            background: currentTheme === t.id
                              ? `linear-gradient(135deg, ${th.gradientA}33, ${th.gradientB}33)`
                              : 'rgba(255,255,255,0.04)',
                            border: currentTheme === t.id
                              ? `1px solid ${th.uiAccent}`
                              : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: currentTheme === t.id ? `0 0 18px rgba(${th.glowColor},0.3)` : 'none'
                          }}>
                          <div className="w-full h-8 rounded-lg"
                            style={{ background: `linear-gradient(135deg, ${th.gradientA}, ${th.gradientB})`, opacity: locked ? 0.4 : 1 }} />
                          <span className="text-base">{t.icon}</span>
                          <span className="text-xs font-bold text-white opacity-80 leading-tight text-center" style={{ fontSize: 9 }}>
                            {t.name}
                          </span>
                          {locked && (
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
                              style={{ background: 'rgba(0,0,0,0.5)' }}>
                              <span className="text-yellow-400 text-sm">💎</span>
                            </div>
                          )}
                          {currentTheme === t.id && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full"
                              style={{ background: th.uiAccent, boxShadow: `0 0 6px ${th.uiAccent}` }} />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3" style={{ display: 'none' }}>
                  <motion.button
                    onClick={handlePlay}
                    className="py-5 rounded-2xl font-black text-2xl text-white tracking-wider"
                    style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                    ▶ OYNA
                  </motion.button>
                  <motion.button
                    onClick={handlePrivateLobby}
                    className="py-5 rounded-2xl font-bold text-white text-lg"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    🏠 Özel Lobi
                  </motion.button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-4" style={panelStyle}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
                    🕹️ Kontroller
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { key: 'Mouse', action: 'Hareket et' },
                      { key: 'Space', action: 'Böl', color: '#6366f1' },
                      { key: 'W', action: 'Küçük fırlat' },
                      { key: 'E', action: 'Orta fırlat' },
                      { key: 'R', action: 'Büyük fırlat' },
                      { key: 'A', action: '10 gold → kütle' },
                      { key: 'S', action: '50 gold → kütle' },
                      { key: 'Z', action: 'Çift bölün (Macro)' },
                      { key: 'X', action: 'Max bölün (Macro)' },
                      { key: 'T', action: 'Oto hareket' },
                      { key: 'Q', action: 'İzleme modu' },
                      { key: '1/2', action: 'Hedef değiştir' },
                    ].map(({ key, action, color }) => (
                      <div key={key} className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 rounded-md text-xs font-bold min-w-12 text-center"
                          style={{ background: color ? `rgba(${theme.glowColor},0.2)` : 'rgba(255,255,255,0.1)', color: color || '#e2e8f0', border: `1px solid rgba(255,255,255,0.15)` }}>
                          {key}
                        </kbd>
                        <span className="text-xs text-gray-400">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={panelStyle}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
                    🌿 Virüs Tipleri
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: '🌿', name: 'Normal', desc: '8\'e kadar böler', color: '#22c55e' },
                      { icon: '💢', name: 'Süper', desc: '16\'ya böler!', color: '#16a34a' },
                      { icon: '☠️', name: 'Zehirli', desc: '5sn kütle kaybı', color: '#a855f7' },
                      { icon: '❄️', name: 'Dondurucu', desc: '4sn yavaşlatır', color: '#38bdf8' },
                    ].map(v => (
                      <div key={v.name} className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-base w-6 text-center">{v.icon}</span>
                        <div>
                          <div className="text-xs font-bold" style={{ color: v.color }}>{v.name}</div>
                          <div className="text-xs text-gray-500">{v.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'lobby' && (
            <motion.div key="lobby"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <LobbyTab theme={theme} panelStyle={panelStyle} onCreateLobby={handlePrivateLobby} onJoinPublic={handlePlay} navigate={navigate} playerName={playerName} />
            </motion.div>
          )}

          {tab === 'friends' && (
            <motion.div key="friends"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <FriendSystem />
            </motion.div>
          )}

          {tab === 'profile' && (
            <motion.div key="profile"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <ProfileTab theme={theme} panelStyle={panelStyle} profile={profile} user={user} logout={logout} setShowShop={setShowShop} />
            </motion.div>
          )}

          {tab === 'clan' && (
            <motion.div key="clan"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center justify-center min-h-96">
              <div className="rounded-2xl p-10 text-center max-w-md w-full" style={panelStyle}>
                <div className="text-6xl mb-4">⚔️</div>
                <div className="text-white font-black text-2xl mb-2">Klan Sistemi</div>
                <div className="text-gray-400 text-sm mb-6">Klan kur, arkadaşlarını davet et, birlikte savaş!</div>
                {profile?.clan && (
                  <div className="mb-4 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: `rgba(${theme.glowColor},0.15)`, color: theme.uiAccent }}>
                    Mevcut Klan: {profile.clan}
                  </div>
                )}
                <motion.button onClick={() => navigate('/clan')}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="w-full py-4 rounded-xl font-black text-white text-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 25px rgba(${theme.glowColor},0.4)` }}>
                  Klan Sistemine Git →
                </motion.button>
              </div>
            </motion.div>
          )}

          {tab === 'leaderboard' && (
            <motion.div key="lb"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <LeaderboardTab theme={theme} panelStyle={panelStyle} />
            </motion.div>
          )}

          {tab === 'quests' && (
            <motion.div key="quests"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <QuestsTab theme={theme} panelStyle={panelStyle} quests={quests} />
            </motion.div>
          )}

          {tab === 'battlepass' && (
            <motion.div key="battlepass"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center justify-center min-h-64 gap-6">
              <div className="text-6xl">🎖️</div>
              <div className="text-white font-black text-2xl">Battle Pass</div>
              <div className="text-gray-400 text-sm">Her sezon yeni ödüller ve görevler!</div>
              <motion.button onClick={() => navigate('/battlepass')}
                whileHover={{ scale: 1.05, boxShadow: `0 0 30px rgba(${theme.glowColor},0.5)` }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 rounded-2xl font-black text-white text-lg"
                style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                Battle Pass'e Git →
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
        </div>

        {tab === 'play' && (
          <div className="flex-shrink-0 border-t" style={{ borderColor: `rgba(${theme.glowColor},0.2)`, background: 'rgba(5,5,15,0.95)' }}>
            {(gameMode === 'teams' || gameMode === 'clan_war') && (
              <div className="flex items-center gap-3 px-6 pt-3">
                <span className="text-xs text-gray-400 font-bold">Takım Seç:</span>
                {[
                  { id: 'red', label: '🔴 Kırmızı', color: '#ef4444', glow: '239,68,68' },
                  { id: 'blue', label: '🔵 Mavi', color: '#3b82f6', glow: '59,130,246' }
                ].map(t => (
                  <motion.button key={t.id} onClick={() => setSelectedTeam(t.id)}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                    className="px-4 py-1.5 rounded-lg font-bold text-sm text-white"
                    style={{
                      background: selectedTeam === t.id ? `rgba(${t.glow},0.3)` : 'rgba(255,255,255,0.06)',
                      border: `2px solid ${selectedTeam === t.id ? t.color : 'rgba(255,255,255,0.12)'}`,
                      boxShadow: selectedTeam === t.id ? `0 0 15px rgba(${t.glow},0.5)` : 'none'
                    }}>
                    {t.label}
                  </motion.button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 px-6 py-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">Seçili Mod</div>
                <div className="font-black text-white flex items-center gap-2 text-sm">
                  {GAME_MODES.find(m => m.id === gameMode)?.icon}
                  {GAME_MODES.find(m => m.id === gameMode)?.name}
                </div>
              </div>
              <motion.button onClick={handlePrivateLobby}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-5 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(${theme.glowColor},0.3)` }}>
                🏠 Özel Lobi
              </motion.button>
              <motion.button onClick={handlePlay}
                whileHover={{ scale: 1.04, boxShadow: `0 0 40px rgba(${theme.glowColor},0.8)` }}
                whileTap={{ scale: 0.96 }}
                className="px-12 py-3 rounded-xl font-black text-white text-xl"
                style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 25px rgba(${theme.glowColor},0.5)` }}>
                ▶ OYNA
              </motion.button>
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  )
}

function LobbyTab({ theme, panelStyle, onCreateLobby, navigate, playerName }) {
  const [lobbyCode, setLobbyCode] = useState('')
  const [recentLobbies, setRecentLobbies] = useState([])
  const [loadingLobbies, setLoadingLobbies] = useState(true)

  useEffect(() => {
    let lobbiesRef
    try {
      lobbiesRef = ref(db, 'lobbies')
      const unsub = onValue(lobbiesRef, (snap) => {
        setLoadingLobbies(false)
        if (!snap.exists()) { setRecentLobbies([]); return }
        const data = snap.val()
        const list = Object.entries(data)
          .map(([id, lobby]) => ({
            id,
            mode: lobby.mode || 'ffa',
            players: Object.keys(lobby.players || {}).length,
            max: lobby.maxPlayers || 8,
            host: lobby.hostName || Object.values(lobby.players || {})[0]?.name || 'Host',
            starting: !!lobby.starting,
            createdAt: lobby.createdAt || 0,
          }))
          .filter(l => l.players > 0 && !l.starting)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 10)
        setRecentLobbies(list)
      })
      return () => off(lobbiesRef)
    } catch {
      setLoadingLobbies(false)
    }
  }, [])

  const handleJoinCode = () => {
    if (!lobbyCode.trim()) { return }
    const code = lobbyCode.trim().replace('priv_', '')
    navigate(`/lobby?room=priv_${code}`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="rounded-2xl p-5" style={panelStyle}>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: theme.uiAccent }}>
            🏠 Özel Lobi Oluştur
          </div>
          <p className="text-gray-400 text-sm mb-4">Kendi lobini oluştur ve arkadaşlarına davet linki gönder.</p>
          <motion.button onClick={onCreateLobby}
            whileHover={{ scale: 1.02, boxShadow: `0 0 30px rgba(${theme.glowColor},0.5)` }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl font-black text-white text-lg"
            style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
            + Lobi Oluştur
          </motion.button>
        </div>

        <div className="rounded-2xl p-5" style={panelStyle}>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: theme.uiAccent }}>
            🔑 Koda Göre Katıl
          </div>
          <div className="flex gap-2">
            <input value={lobbyCode} onChange={e => setLobbyCode(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${theme.glowColor},0.3)`, outline: 'none' }}
              placeholder="Lobi kodu gir..." />
            <motion.button onClick={handleJoinCode}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-xl font-bold text-white"
              style={{ background: `rgba(${theme.glowColor},0.3)`, border: `1px solid rgba(${theme.glowColor},0.5)` }}>
              Katıl
            </motion.button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={panelStyle}>
        <div className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center justify-between" style={{ color: theme.uiAccent }}>
          <span>🌐 Aktif Lobiler</span>
          {!loadingLobbies && <span className="text-gray-500 normal-case tracking-normal font-normal text-xs">{recentLobbies.length} lobi</span>}
        </div>
        <div className="space-y-2">
          {loadingLobbies && (
            <div className="text-center text-gray-500 py-6 text-sm">Lobiler yükleniyor...</div>
          )}
          {!loadingLobbies && recentLobbies.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-sm">
              <div className="text-3xl mb-2">🏠</div>
              Aktif lobi yok. İlk seni oluştur!
            </div>
          )}
          {recentLobbies.map(lobby => {
            const modeIcon = lobby.mode === 'ffa' ? '⚔️' : lobby.mode === 'teams' ? '🛡️' : lobby.mode === 'battle_royale' ? '💥' : lobby.mode === 'rush' ? '⚡' : '🏰'
            return (
              <motion.div key={lobby.id}
                whileHover={{ scale: 1.01, x: 3 }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => navigate(`/lobby?room=${lobby.id}`)}>
                <div className="text-xl">{modeIcon}</div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">{lobby.host}'s Lobby</div>
                  <div className="text-xs text-gray-400">{lobby.mode.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: theme.uiAccent }}>
                    {lobby.players}/{lobby.max}
                  </div>
                  <div className="text-xs text-gray-500">oyuncu</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ theme, panelStyle, profile, user, logout, setShowShop }) {
  const stats = [
    { icon: '⭐', label: 'Seviye', value: profile?.level || 1 },
    { icon: '✨', label: 'XP', value: (profile?.xp || 0).toLocaleString() },
    { icon: '🏆', label: 'En Yüksek', value: (profile?.stats?.highScore || 0).toLocaleString() },
    { icon: '💀', label: 'Öldürme', value: (profile?.stats?.kills || 0).toLocaleString() },
    { icon: '🎮', label: 'Oyun', value: (profile?.stats?.gamesPlayed || 0).toLocaleString() },
    { icon: '💰', label: 'Toplam Kütle', value: (profile?.stats?.totalMass || 0).toLocaleString() },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="rounded-2xl p-6 flex flex-col items-center text-center" style={panelStyle}>
        <motion.div
          animate={{ boxShadow: [`0 0 20px rgba(${theme.glowColor},0.4)`, `0 0 40px rgba(${theme.glowColor},0.7)`, `0 0 20px rgba(${theme.glowColor},0.4)`] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4"
          style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
          {profile?.isGod ? '👑' : '🫧'}
        </motion.div>
        <div className="text-white font-black text-xl mb-1">{profile?.name}</div>
        <div className="text-gray-400 text-sm mb-2">{user?.email || 'Misafir'}</div>
        {profile?.isGod && (
          <div className="px-3 py-1 rounded-full text-xs font-black mb-2"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000' }}>
            ⚡ GOD MODE
          </div>
        )}
        {profile?.clan && (
          <div className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: `rgba(${theme.glowColor},0.2)`, color: theme.uiAccent, border: `1px solid rgba(${theme.glowColor},0.4)` }}>
            ⚔️ {profile.clan}
          </div>
        )}
        <div className="mt-4 w-full">
          <div className="text-xs text-gray-400 mb-1 text-left">XP İlerlemesi</div>
          <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((profile?.xp || 0) % 1000) / 10}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-2 rounded-full"
              style={{ background: `linear-gradient(90deg, ${theme.gradientA}, ${theme.gradientB})` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">{(profile?.xp || 0) % 1000}/1000 XP</div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {stats.map(s => (
            <motion.div key={s.label}
              whileHover={{ scale: 1.02, y: -2 }}
              className="rounded-2xl p-4 text-center"
              style={panelStyle}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-white font-black text-lg">{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-2xl p-5" style={panelStyle}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
            💎 Premium Paket
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-white font-bold">
                {!profile?.premium || profile.premium === 'free' ? 'Ücretsiz' : profile.premium.toUpperCase()}
              </div>
              <div className="text-gray-400 text-sm">
                {!profile?.premium || profile.premium === 'free' ? 'Tüm özelliklere erişmek için Premium al!' : 'Premium üyesin! Tüm özellikler aktif.'}
              </div>
            </div>
            <motion.button onClick={() => setShowShop(true)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-xl font-black text-sm"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)', color: '#000' }}>
              {!profile?.premium || profile.premium === 'free' ? 'Satın Al' : 'Yükselt'}
            </motion.button>
          </div>
        </div>

        <motion.button onClick={logout}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="w-full py-3 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          🚪 Çıkış Yap
        </motion.button>

        <div className="rounded-2xl p-5" style={panelStyle}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
            🔗 Arkadaşını Davet Et
          </div>
          <div className="text-gray-400 text-sm mb-3">
            Her başarılı davet için <span style={{ color: theme.uiAccent }}>50 coin</span> kazan!
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl text-xs font-mono text-gray-300 truncate"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {`https://agarz.io/join?ref=${user?.uid?.slice(0, 8) || 'guest123'}`}
            </div>
            <motion.button
              onClick={() => {
                navigator.clipboard?.writeText(`https://agarz.io/join?ref=${user?.uid?.slice(0, 8) || 'guest123'}`)
                  .catch(() => {})
                toast.success('Davet linki kopyalandı! 🔗')
              }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: `rgba(${theme.glowColor},0.2)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent }}>
              Kopyala
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestsTab({ theme, panelStyle, quests }) {
  const { claimQuest, checkReset } = useQuestStore()
  const [resetIn, setResetIn] = useState('')

  useEffect(() => {
    const update = () => {
      const { lastReset } = useQuestStore.getState()
      const next = lastReset + 24 * 60 * 60 * 1000
      const diff = Math.max(0, next - Date.now())
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setResetIn(`${h}s ${m}d`)
    }
    update()
    const iv = setInterval(update, 60000)
    return () => clearInterval(iv)
  }, [])

  if (!quests.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="text-5xl">📋</div>
        <div className="text-white font-bold">Görevler yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Görevler {resetIn} sonra sıfırlanır</div>
        <div className="text-xs font-bold" style={{ color: theme.uiAccent }}>
          {quests.filter(q => q.completed).length}/{quests.length} Tamamlandı
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {quests.map(quest => {
          const progress = Math.min(quest.progress || 0, quest.target)
          const pct = (progress / quest.target) * 100
          return (
            <motion.div key={quest.id}
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl p-4"
              style={{
                ...panelStyle,
                border: quest.completed
                  ? '1px solid rgba(74,222,128,0.4)'
                  : `1px solid rgba(${theme.glowColor},0.2)`,
                background: quest.completed ? 'rgba(74,222,128,0.05)' : 'rgba(6,6,18,0.95)',
              }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{quest.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-bold text-sm">{quest.title}</span>
                    {quest.completed && <span className="text-green-400 text-xs">✓ Tamamlandı</span>}
                  </div>
                  <div className="text-gray-400 text-xs mb-2">{quest.desc}</div>
                  <div className="w-full h-1.5 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-1.5 rounded-full"
                      style={{ background: quest.completed ? '#4ade80' : `linear-gradient(90deg, ${theme.gradientA}, ${theme.gradientB})` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{progress}/{quest.target}</span>
                    <div className="flex items-center gap-2">
                      {quest.reward.coins && (
                        <span className="text-xs text-yellow-400">💰 {quest.reward.coins}</span>
                      )}
                      {quest.reward.lootbox && (
                        <span className="text-xs text-blue-400">📦 ×{quest.reward.lootbox}</span>
                      )}
                    </div>
                  </div>
                </div>
                {quest.completed && !quest.claimed && (
                  <motion.button
                    onClick={() => { claimQuest(quest.id); toast.success('Ödül alındı! 🎉') }}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    className="px-4 py-2 rounded-xl font-black text-sm text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#4ade80,#16a34a)' }}>
                    Al!
                  </motion.button>
                )}
                {quest.claimed && (
                  <div className="text-green-400 text-xs font-bold flex-shrink-0">✓ Alındı</div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function LeaderboardTab({ theme, panelStyle }) {
  const medals = ['🥇', '🥈', '🥉']
  const [lbData, setLbData] = useState([])
  const [lbLoading, setLbLoading] = useState(true)

  useEffect(() => {
    setLbLoading(true)
    fbGetLeaderboard(50).then(data => {
      if (data.length > 0) {
        setLbData(data)
      } else {
        setLbData(MOCK_LEADERBOARD.map(p => ({ name: p.name, score: p.mass, color: p.color, level: 1 })))
      }
      setLbLoading(false)
    }).catch(() => {
      setLbData(MOCK_LEADERBOARD.map(p => ({ name: p.name, score: p.mass, color: p.color, level: 1 })))
      setLbLoading(false)
    })
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={panelStyle}>
        <div className="px-5 py-4 flex items-center gap-2 border-b" style={{ borderColor: `rgba(${theme.glowColor},0.2)` }}>
          <span className="text-xl">🏆</span>
          <span className="text-white font-black">Küresel Sıralama</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-bold">CANLI</span>
          </div>
        </div>
        <div className="p-3 space-y-1">
          {lbLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.uiAccent }} />
            </div>
          ) : lbData.map((p, i) => (
            <motion.div key={p.uid || p.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{
                background: i < 3 ? `rgba(${theme.glowColor},0.08)` : 'rgba(255,255,255,0.02)',
                border: i < 3 ? `1px solid rgba(${theme.glowColor},0.2)` : '1px solid transparent'
              }}>
              <div className="w-8 text-center font-black text-sm">
                {i < 3 ? medals[i] : <span style={{ color: '#4b5563' }}>#{i+1}</span>}
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: p.color || '#6366f1', boxShadow: `0 0 10px ${p.color || '#6366f1'}66` }}>
                {p.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">{p.name}</div>
                {p.level > 1 && <div className="text-xs text-gray-500">Lv.{p.level}{p.prestige > 0 ? ` ✦${p.prestige}` : ''}</div>}
              </div>
              <div className="text-right">
                <div className="font-black text-sm" style={{ color: i === 0 ? '#fbbf24' : theme.uiAccent }}>
                  {(p.score || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">skor</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl p-5" style={panelStyle}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
            📊 İstatistikler
          </div>
          {[
            { label: 'Aktif Oyuncu', value: '1,247', icon: '👥', color: '#22c55e' },
            { label: 'Aktif Oda', value: '89', icon: '🏠', color: '#06b6d4' },
            { label: 'Bugün Oynanan', value: '14,392', icon: '🎮', color: '#8b5cf6' },
            { label: 'Toplam Oyuncu', value: '2.4M', icon: '🌍', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-lg">{s.icon}</span>
              <div className="flex-1 text-xs text-gray-400">{s.label}</div>
              <div className="font-black text-sm" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
