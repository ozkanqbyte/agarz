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
import { fbGetLeaderboard, fbGetWeeklyLeaderboard, fbGetFriendsLeaderboard, fbGetClanLeaderboard } from '../../firebase/syncService'
import FriendSystem from '../Friends/FriendSystem'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

const GAME_MODES = [
  { id: 'ffa', name: 'Free For All', icon: '⚔️', desc: 'Herkese karşı tek başına oyna! En büyük hücre kazanır. Kimseye güvenme.', color: '#6366f1', players: '2-100', rules: ['En yüksek kütle kazanır', 'Kimse müttefikin değil', 'Süre bitmeden büyü'] },
  { id: 'teams', name: 'Takım Savaşı', icon: '🛡️', desc: 'Kırmızı vs Mavi! Takımınla birleş, düşman klanı ez. Koordinasyon şart.', color: '#06b6d4', players: '2-50', rules: ['Kırmızı vs Mavi', 'Takım arkadaşlarını yiyemezsin', 'En çok toplam kütle kazanır'] },
  { id: 'battle_royale', name: 'Battle Royale', icon: '💥', desc: 'Alan giderek küçülüyor! Dışarıda kalırsan ölürsün. Son kalan kazanır.', color: '#ef4444', players: '2-30', rules: ['Alan her 30 saniyede küçülür', 'Dışarıda kalmak hasar verir', 'Son hayatta kalan kazanır'] },
  { id: 'rush', name: 'Rush Mode', icon: '⚡', desc: '5 dakika, en çok öldürme kazanır! Hız ve refleks şart. Durma, saldır!', color: '#f59e0b', players: '2-20', rules: ['5 dakika süre', 'En çok öldürme kazanır', 'Kütle değil kill sayısı önemli'] },
  { id: 'clan_war', name: 'Klan Savaşı', icon: '🏰', desc: 'Klan lider lobisi açar, üyeler katılır. İki klan hazır olunca savaş başlar!', color: '#10b981', players: '6-50', rules: ['Klan lideri lobi açar', 'Üyeler koda girerek katılır', 'İki klan hazır olunca başlar', 'En çok kütle toplayan klan kazanır'] },
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
  { id: 'shop', icon: '🏪', label: 'Mağaza' },
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

  useEffect(() => { if (profile?.name) setPlayerName(profile.name) }, [profile?.name])
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

  const handleClanWarLobby = () => {
    if (!profile?.clan) { toast.error('Klan Savaşı için bir klana üye olmalısın!'); return }
    navigate(`/clan-war`)
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
          <div className="text-lg font-black tracking-widest"
            style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AGA
          </div>
          <div className="text-xs font-black tracking-widest"
            style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            RIX
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{m.name}</span>
                            {m.badge && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
                                {m.badge}
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                              {m.players} oyuncu
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                          {gameMode === m.id && m.rules && (
                            <div className="flex flex-col gap-1 mt-2">
                              {m.rules.map((r, ri) => (
                                <div key={ri} className="flex items-center gap-1.5">
                                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: m.color }} />
                                  <span className="text-xs font-semibold" style={{ color: m.color }}>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {gameMode === m.id && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: theme.uiAccent, boxShadow: `0 0 8px ${theme.uiAccent}` }} />
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
              <LeaderboardTab theme={theme} panelStyle={panelStyle} user={user} profile={profile} />
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

          {tab === 'shop' && (
            <motion.div key="shop"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center justify-center min-h-64 gap-6">
              <div className="text-6xl">🏪</div>
              <div className="text-white font-black text-2xl">Mağaza</div>
              <div className="text-gray-400 text-sm text-center">Şans Kutusu • Gold • Efektler • Boost</div>
              <motion.button onClick={() => navigate('/shop')}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-10 py-4 rounded-2xl font-black text-white text-lg"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}>
                🏪 Mağazaya Git →
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
              <motion.button onClick={gameMode === 'clan_war' ? handleClanWarLobby : handlePlay}
                whileHover={{ scale: 1.04, boxShadow: `0 0 40px rgba(${theme.glowColor},0.8)` }}
                whileTap={{ scale: 0.96 }}
                className="px-12 py-3 rounded-xl font-black text-white text-xl"
                style={{ background: gameMode === 'clan_war' ? 'linear-gradient(135deg,#10b981,#06b6d4)' : `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})`, boxShadow: `0 0 25px rgba(${theme.glowColor},0.5)` }}>
                {gameMode === 'clan_war' ? '🏰 KLAN LOBİSİ' : '▶ OYNA'}
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
    if (!lobbyCode.trim()) return
    let code = lobbyCode.trim()
    try {
      const url = new URL(code)
      const roomParam = url.searchParams.get('room')
      if (roomParam) code = roomParam
    } catch {}
    code = code.replace(/^priv_/, '').replace(/[.#$[\]/\s:?&=]/g, '_').toLowerCase().slice(0, 80)
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

const COLOR_OPTIONS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6','#14b8a6','#f97316','#a855f7','#84cc16','#f43f5e','#0ea5e9','#d946ef','#65a30d']

function ProfileTab({ theme, panelStyle, profile, user, logout, setShowShop }) {
  const { updateProfile } = useAuthStore()
  const { ownedSkins, ownedPackage } = usePremiumStore()
  const { ownedFrames, ownedNameEffects, activeFrame, activeNameEffect, setActiveFrame, setActiveNameEffect, coins, ownedSkills, ownedDeathEffects, ownedTrailEffects, activeDeathEffect, activeTrailEffect, setActiveDeathEffect, setActiveTrailEffect, level: storeLevel, highScore, totalKills, gamesPlayed, totalPlayTime, prestige, xp } = useProgressStore()
  const [copiedUid, setCopiedUid] = useState(false)
  const copyUid = () => { navigator.clipboard.writeText(user?.uid || ''); setCopiedUid(true); setTimeout(()=>setCopiedUid(false),2000) }
  const [editName, setEditName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '')
  const [photoEdit, setPhotoEdit] = useState(false)
  const [profileTab, setProfileTab] = useState('stats')

  const playTimeHours = totalPlayTime > 0 ? (totalPlayTime / 3600).toFixed(1) : '0'
  const stats = [
    { label: 'SEVİYE', value: storeLevel || 1, color: theme.uiAccent },
    { label: 'EN YÜKSEK', value: (highScore || 0).toLocaleString(), color: '#fbbf24' },
    { label: 'ÖLDÜRME', value: (totalKills || 0).toLocaleString(), color: '#ef4444' },
    { label: 'OYUN', value: (gamesPlayed || 0).toLocaleString(), color: '#10b981' },
    { label: 'GOLD', value: coins.toLocaleString(), color: '#f59e0b' },
    { label: 'SÜRE', value: `${playTimeHours}s`, color: '#8b5cf6' },
  ]

  const handleSaveProfile = async () => {
    if (!editName.trim()) return
    setSaving(true)
    await updateProfile({ name: editName.trim().slice(0, 20) })
    setSaving(false)
    setEditMode(false)
    toast.success('İsim güncellendi!')
  }

  const handleSavePhoto = async () => {
    await updateProfile({ photoUrl: photoUrl.trim() })
    setPhotoEdit(false)
    toast.success('Profil fotoğrafı güncellendi!')
  }

  const handleSelectColor = async (color) => {
    await updateProfile({ color })
    toast.success('Renk güncellendi!')
  }

  const SKIN_COLORS = {
    default:'#6366f1',steel:'#94a3b8',fire:'#ef4444',ice:'#38bdf8',forest:'#22c55e',plasma:'#8b5cf6',
    neon:'#a3e635',galaxy:'#818cf8',toxic:'#84cc16',lava:'#f97316',gold:'#fbbf24',shadow:'#334155',
    sakura:'#f9a8d4',cyber:'#06b6d4',dragon:'#dc2626',void:'#1e1b4b',crown:'#fbbf24',demon:'#7f1d1d',
    angel:'#fef9c3',rainbow:'#ec4899',crystal:'#7df9ff',dark:'#0f172a',apex_skin:'#f59e0b',immortal_skin:'#ec4899',
  }
  const ALL_SKINS = [
    {id:'default',name:'Varsayılan',premium:false,tier:0},{id:'steel',name:'Çelik',premium:false,tier:1},{id:'fire',name:'Ateş',premium:false,tier:1},
    {id:'ice',name:'Buz',premium:false,tier:1},{id:'forest',name:'Orman',premium:false,tier:2},{id:'plasma',name:'Plazma',premium:false,tier:2},
    {id:'neon',name:'Neon',premium:true,tier:3},{id:'galaxy',name:'Galaksi',premium:true,tier:3},{id:'toxic',name:'Zehir',premium:true,tier:3},
    {id:'lava',name:'Lav',premium:true,tier:4},{id:'gold',name:'Altın',premium:true,tier:4},{id:'shadow',name:'Gölge',premium:true,tier:4},
    {id:'sakura',name:'Sakura',premium:true,tier:5},{id:'cyber',name:'Siber',premium:true,tier:5},{id:'dragon',name:'Ejderha',premium:true,tier:6},
    {id:'void',name:'Void',premium:true,tier:6},{id:'crown',name:'Taç',premium:true,tier:7},{id:'demon',name:'Şeytan',premium:true,tier:7},
    {id:'angel',name:'Melek',premium:true,tier:7},{id:'rainbow',name:'Gökkuşağı',premium:true,tier:8},{id:'crystal',name:'Kristal',premium:true,tier:8},
    {id:'dark',name:'Karanlık',premium:true,tier:9},{id:'apex_skin',name:'APEX',premium:true,tier:10},
  ]
  const FRAME_CFG = { silver:'#9ca3af', gold:'#f59e0b', diamond:'#38bdf8', legendary:'#ec4899', fire:'#ef4444', ice:'#60a5fa', neon:'#a78bfa', rainbow:'#ec4899', galaxy:'#818cf8', sakura:'#fda4af' }
  const FRAME_NAMES = { silver:'Gümüş', gold:'Altın', diamond:'Elmas', legendary:'Efsane', fire:'Ateş', ice:'Buz', neon:'Neon', rainbow:'Gökkuşağı', galaxy:'Galaksi', sakura:'Sakura' }
  const EFFECT_CFG = { glow:'#60a5fa', fire:'#ef4444', neon:'#22c55e', electric:'#fbbf24', rainbow:'#ec4899', galaxy:'#8b5cf6', shadow:'#6b7280', crystal:'#38bdf8' }
  const SKILL_CFG = { speed:{label:'Hizlanma',color:'#fbbf24'}, slow:{label:'Yavaslatma',color:'#8b5cf6'}, shield:{label:'Kalkan',color:'#06b6d4'}, magnet:{label:'Manyetik',color:'#ec4899'}, ghost:{label:'Hayalet',color:'#a78bfa'}, teleport:{label:'Isinlanma',color:'#38bdf8'} }
  const PKG_TIER = { free:0, trial:1, starter:2, player:3, pro:4, elite:5, champion:6, master:7, legend:8, apex:9, immortal:10 }

  const currentSkin = profile?.skin || 'default'
  const skinColor = SKIN_COLORS[currentSkin] || profile?.color || theme.gradientA

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="rounded-2xl p-5 flex flex-col items-center text-center" style={panelStyle}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <motion.div
              animate={{ boxShadow: [`0 0 18px ${skinColor}55`,`0 0 36px ${skinColor}99`,`0 0 18px ${skinColor}55`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
                background: profile?.photoUrl ? 'transparent' : `radial-gradient(circle at 35% 35%, ${skinColor}ee, ${skinColor}66)`,
                border: `3px solid ${skinColor}cc`,
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 900, color: '#fff',
              }}
              onClick={() => setPhotoEdit(p => !p)}>
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="pfp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} />
              ) : (
                <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{(profile?.name||'?')[0].toUpperCase()}</span>
              )}
            </motion.div>
            {profile?.isGod && (
              <div style={{
                position:'absolute',bottom:-4,right:-4,
                background:'linear-gradient(135deg,#fbbf24,#f59e0b)',
                borderRadius:6,padding:'2px 6px',fontSize:8,fontWeight:900,color:'#000',letterSpacing:1,
              }}>APEX</div>
            )}
          </div>

          {photoEdit && (
            <div style={{ width:'100%',marginBottom:10,display:'flex',flexDirection:'column',gap:6 }}>
              <input value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)}
                placeholder="Fotoğraf URL..."
                style={{ width:'100%',padding:'7px 10px',borderRadius:10,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:11,outline:'none' }}
              />
              <div style={{ display:'flex',gap:6 }}>
                <button onClick={handleSavePhoto} style={{ flex:1,padding:'7px 0',borderRadius:8,background:`linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`,color:'#fff',fontWeight:900,fontSize:11,border:'none',cursor:'pointer' }}>Kaydet</button>
                <button onClick={()=>setPhotoEdit(false)} style={{ padding:'7px 10px',borderRadius:8,background:'rgba(255,255,255,0.06)',color:'#9ca3af',border:'none',cursor:'pointer',fontSize:11 }}>X</button>
              </div>
            </div>
          )}

          {editMode ? (
            <div style={{ width:'100%',display:'flex',flexDirection:'column',gap:6 }}>
              <input value={editName} onChange={e=>setEditName(e.target.value)} maxLength={20}
                style={{ width:'100%',padding:'8px',borderRadius:10,background:'rgba(255,255,255,0.08)',border:`1px solid rgba(${theme.glowColor},0.4)`,color:'#fff',fontWeight:700,textAlign:'center',fontSize:13,outline:'none' }}
                placeholder="İsim gir..."
              />
              <button onClick={handleSaveProfile} disabled={saving}
                style={{ width:'100%',padding:'8px',borderRadius:10,background:`linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`,color:'#fff',fontWeight:900,fontSize:12,border:'none',cursor:'pointer' }}>
                {saving ? '...' : 'Kaydet'}
              </button>
              <button onClick={()=>setEditMode(false)} style={{ padding:'6px',borderRadius:8,background:'rgba(255,255,255,0.04)',color:'#9ca3af',border:'none',cursor:'pointer',fontSize:11 }}>İptal</button>
            </div>
          ) : (
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:6,justifyContent:'center',marginBottom:2 }}>
                <div style={{ color:'#fff',fontWeight:900,fontSize:16 }}>{profile?.name}</div>
                <button onClick={()=>setEditMode(true)} style={{ background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:12 }}>✎</button>
              </div>
              <div style={{ color:'#4b5563',fontSize:11 }}>{user?.email || 'Misafir'}</div>
              {user?.uid && (
                <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:6,justifyContent:'center' }}>
                  <span style={{ color:'#374151',fontSize:10,fontFamily:'monospace',letterSpacing:1 }}>
                    #{(user.uid||'').slice(0,8).toUpperCase()}
                  </span>
                  <motion.button onClick={copyUid} whileHover={{scale:1.12}} whileTap={{scale:0.9}}
                    style={{ background:'none',border:`1px solid rgba(${theme.glowColor},0.3)`,borderRadius:6,padding:'1px 7px',cursor:'pointer',color:copiedUid?'#4ade80':theme.uiAccent,fontSize:9,fontWeight:700 }}>
                    {copiedUid?'✓ Kopyalandı':'KOPYALA'}
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {profile?.clan && (
            <div style={{ marginTop:8,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:`rgba(${theme.glowColor},0.15)`,color:theme.uiAccent,border:`1px solid rgba(${theme.glowColor},0.35)` }}>
              ⚔️ {profile.clan}
            </div>
          )}

          {prestige > 0 && (
            <div style={{ marginTop:6,padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:900,background:'linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.1))',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.4)' }}>
              ✨ Prestij {prestige}
            </div>
          )}

          <div style={{ marginTop:10,width:'100%' }}>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:9,color:'#4b5563',fontWeight:700,marginBottom:4 }}>
              <span>LV.{storeLevel}</span>
              <span>{(xp||0).toLocaleString()} / {xpForLevel(storeLevel).toLocaleString()} XP</span>
            </div>
            <div style={{ width:'100%',height:5,borderRadius:5,background:'rgba(255,255,255,0.06)' }}>
              <motion.div
                animate={{ width:`${Math.min(100,(xp||0)/xpForLevel(storeLevel)*100)}%` }}
                transition={{ duration:0.8,ease:'easeOut' }}
                style={{ height:'100%',borderRadius:5,background:`linear-gradient(90deg,${theme.gradientA},${theme.gradientB})`,boxShadow:`0 0 6px rgba(${theme.glowColor},0.5)` }} />
            </div>
          </div>

          <div style={{ marginTop:12,width:'100%' }}>
            <div style={{ fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:700,letterSpacing:1 }}>BALON RENGİ</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5,justifyContent:'center' }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={()=>handleSelectColor(c)}
                  style={{ width:22,height:22,borderRadius:'50%',background:c,border:profile?.color===c?'2px solid #fff':'2px solid transparent',boxShadow:profile?.color===c?`0 0 8px ${c}`:undefined,cursor:'pointer',transition:'transform 0.15s' }} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={panelStyle}>
          <div style={{ fontSize:9,fontWeight:900,letterSpacing:2,color:'#4b5563',marginBottom:8 }}>PREMİUM</div>
          <div style={{ fontSize:13,fontWeight:900,color:theme.uiAccent,marginBottom:4 }}>
            {!profile?.premium || profile.premium==='free' ? 'ÜCRETSİZ' : profile.premium.toUpperCase()}
          </div>
          <button onClick={()=>setShowShop(true)}
            style={{ width:'100%',padding:'9px',borderRadius:10,background:'linear-gradient(135deg,#fbbf24,#d97706)',color:'#000',fontWeight:900,fontSize:12,border:'none',cursor:'pointer' }}>
            {!profile?.premium||profile.premium==='free'?'SATIN AL':'YÜKSELT'}
          </button>
        </div>

        <button onClick={logout}
          style={{ width:'100%',padding:'10px',borderRadius:14,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',fontWeight:700,fontSize:12,cursor:'pointer' }}>
          Cikis Yap
        </button>
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={panelStyle}>
              <div style={{ color:s.color,fontWeight:900,fontSize:20,lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'#6b7280',fontSize:9,marginTop:4,fontWeight:700,letterSpacing:1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl" style={panelStyle}>
          <div style={{ display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            {[{id:'skins',label:'SKİNLER'},{id:'frames',label:'ÇERÇEVELER'},{id:'effects',label:'İSİM EFEKT'},{id:'death',label:'ÖLÜM'},{id:'trail',label:'İZ'},{id:'skills',label:'YETENEKLER'}].map(t => (
              <button key={t.id} onClick={()=>setProfileTab(t.id)}
                style={{ flex:1,padding:'10px 0',background:'none',border:'none',cursor:'pointer',
                  color:profileTab===t.id?'#fff':'#4b5563',fontWeight:900,fontSize:10,letterSpacing:1.5,
                  borderBottom:profileTab===t.id?`2px solid ${theme.uiAccent}`:'2px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:14 }}>
            {profileTab === 'skins' && (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:7 }}>
                {ALL_SKINS.map(skin => {
                  const owned = !skin.premium || ownedSkins.includes(skin.id) || (PKG_TIER[ownedPackage] || 0) >= (skin.tier || 99)
                  const selected = currentSkin === skin.id
                  const sc = SKIN_COLORS[skin.id] || '#6366f1'
                  return (
                    <motion.button key={skin.id}
                      onClick={async()=>{
                        if(!owned){toast.error('Premium gerekli!');setShowShop(true);return}
                        await updateProfile({skin:skin.id,color:sc})
                        toast.success(`${skin.name} seçildi!`)
                      }}
                      whileHover={{scale:1.08}} whileTap={{scale:0.94}}
                      style={{
                        borderRadius:10,padding:'8px 4px',display:'flex',flexDirection:'column',alignItems:'center',gap:5,
                        background:selected?`${sc}22`:'rgba(255,255,255,0.03)',
                        border:`1.5px solid ${selected?sc:'rgba(255,255,255,0.08)'}`,
                        boxShadow:selected?`0 0 14px ${sc}40`:undefined,
                        opacity:owned?1:0.45,cursor:'pointer',position:'relative',
                      }}>
                      <div style={{ width:28,height:28,borderRadius:'50%',background:`radial-gradient(circle at 35% 35%,${sc}ee,${sc}66)`,border:`2px solid ${sc}cc` }} />
                      <div style={{ fontSize:8,color:'#e2e8f0',fontWeight:700,textAlign:'center',lineHeight:1.1 }}>{skin.name}</div>
                      {!owned&&<div style={{ position:'absolute',top:3,right:3,width:8,height:8,borderRadius:'50%',background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,color:'#fbbf24' }}>P</div>}
                    </motion.button>
                  )
                })}
              </div>
            )}

            {profileTab === 'frames' && (
              <div>
                {ownedFrames.length === 0 ? (
                  <div style={{ color:'#4b5563',fontSize:12,textAlign:'center',padding:'20px 0',fontWeight:700,letterSpacing:1 }}>
                    HENUZ CERCEVE YOK — MAGAZA&apos;DAN SATIN AL
                  </div>
                ) : (
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
                    {ownedFrames.map(fid => {
                      const fc = FRAME_CFG[fid] || '#9ca3af'
                      const fname = FRAME_NAMES[fid] || fid
                      const active = activeFrame === fid
                      return (
                        <motion.button key={fid}
                          onClick={()=>{ setActiveFrame(active?null:fid); toast.success(active?'Çerçeve kaldırıldı!':'Çerçeve aktif!') }}
                          whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                          style={{ borderRadius:14,padding:'14px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                            background:active?`${fc}18`:'rgba(255,255,255,0.03)',
                            border:`1.5px solid ${active?fc:'rgba(255,255,255,0.08)'}`,
                            boxShadow:active?`0 0 22px ${fc}35`:undefined,cursor:'pointer',
                          }}>
                          <div style={{ position:'relative',width:48,height:48 }}>
                            <motion.div animate={active?{rotate:360}:{}} transition={{duration:3,repeat:Infinity,ease:'linear'}}
                              style={{ position:'absolute',inset:0,borderRadius:'50%',border:`3px solid ${fc}`,boxShadow:`0 0 ${active?16:6}px ${fc}${active?'80':'40'}` }} />
                            <motion.div animate={active?{rotate:-360}:{}} transition={{duration:5,repeat:Infinity,ease:'linear'}}
                              style={{ position:'absolute',inset:5,borderRadius:'50%',border:`1.5px dashed ${fc}55` }} />
                            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                              <div style={{ width:6,height:6,borderRadius:'50%',background:fc,boxShadow:`0 0 8px ${fc}` }} />
                            </div>
                          </div>
                          <div style={{ fontSize:9,fontWeight:900,color:active?fc:'#9ca3af',letterSpacing:1 }}>{fname.toUpperCase()}</div>
                          {active&&<div style={{ fontSize:8,fontWeight:900,color:fc,background:`${fc}20`,border:`1px solid ${fc}44`,padding:'2px 8px',borderRadius:20,letterSpacing:1 }}>AKTIF</div>}
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {profileTab === 'effects' && (
              <div>
                {ownedNameEffects.length === 0 ? (
                  <div style={{ color:'#4b5563',fontSize:12,textAlign:'center',padding:'20px 0',fontWeight:700,letterSpacing:1 }}>
                    HENUZ EFEKT YOK — MAGAZA&apos;DAN SATIN AL
                  </div>
                ) : (
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10 }}>
                    {ownedNameEffects.map(eid => {
                      const ec = EFFECT_CFG[eid] || '#60a5fa'
                      const active = activeNameEffect === eid
                      return (
                        <motion.button key={eid}
                          onClick={()=>{ setActiveNameEffect(active?null:eid); toast.success(active?'Efekt kaldırıldı!':'Efekt aktif!') }}
                          whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                          style={{ borderRadius:12,padding:'14px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                            background:active?`${ec}18`:'rgba(255,255,255,0.03)',
                            border:`1.5px solid ${active?ec:'rgba(255,255,255,0.08)'}`,
                            boxShadow:active?`0 0 20px ${ec}30`:undefined,cursor:'pointer',
                          }}>
                          <div style={{ height:4,width:'80%',borderRadius:4,background:`linear-gradient(to right,${ec},${ec}44)` }} />
                          <div style={{ fontSize:10,fontWeight:900,color:ec,letterSpacing:1 }}>{eid.toUpperCase()}</div>
                          {active&&<div style={{ fontSize:8,fontWeight:900,color:ec,background:`${ec}18`,padding:'2px 8px',borderRadius:4,letterSpacing:1 }}>AKTİF</div>}
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {profileTab === 'death' && (() => {
              const DEATH_EFFECTS = [
                { id: 'gold',     name: 'Altın Patlama',   icon: '✨', desc: 'Altın rengi parçacıklar',   color: '#f59e0b' },
                { id: 'rainbow',  name: 'Gökkuşağı',       icon: '🌈', desc: 'Renkli patlama efekti',     color: '#ec4899' },
                { id: 'smoke',    name: 'Duman',           icon: '💨', desc: 'Dramatik duman efekti',     color: '#94a3b8' },
                { id: 'electric', name: 'Elektrik',        icon: '⚡', desc: 'Elektrik parıltısı',        color: '#06b6d4' },
                { id: 'sakura',   name: 'Sakura',          icon: '🌸', desc: 'Kiraz çiçeği yaprakları',   color: '#f9a8d4' },
              ]
              return (
                <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  <div style={{ color:'#6b7280',fontSize:10,fontWeight:700,letterSpacing:1 }}>
                    ÖLÜM EFEKTİ — Yutulunca özel patlama animasyonu
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                    {DEATH_EFFECTS.map(ef => {
                      const owned = ownedDeathEffects.includes(ef.id)
                      const active = activeDeathEffect === ef.id
                      return (
                        <motion.button key={ef.id} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                          onClick={()=>{
                            if(!owned){toast.error('Mağazadan satın al!');return}
                            setActiveDeathEffect(active?null:ef.id)
                            toast.success(active?'Efekt kaldırıldı!':'Efekt aktif! 💥')
                          }}
                          style={{ borderRadius:14,padding:'14px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                            background:active?`${ef.color}18`:'rgba(255,255,255,0.03)',
                            border:`1.5px solid ${active?ef.color:'rgba(255,255,255,0.08)'}`,
                            boxShadow:active?`0 0 20px ${ef.color}30`:undefined,cursor:'pointer',
                            opacity:owned?1:0.45,position:'relative',
                          }}>
                          <div style={{ fontSize:24 }}>{ef.icon}</div>
                          <div style={{ fontSize:9,fontWeight:900,color:active?ef.color:'#9ca3af',letterSpacing:1,textAlign:'center' }}>{ef.name}</div>
                          <div style={{ fontSize:8,color:'#4b5563',textAlign:'center',lineHeight:1.3 }}>{ef.desc}</div>
                          {active&&<div style={{ fontSize:7,fontWeight:900,color:ef.color,background:`${ef.color}18`,padding:'1px 6px',borderRadius:4,letterSpacing:1 }}>AKTİF</div>}
                          {!owned&&<div style={{ position:'absolute',top:4,right:4,fontSize:10 }}>🔒</div>}
                        </motion.button>
                      )
                    })}
                  </div>
                  <div style={{ padding:'10px 12px',borderRadius:10,background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24',fontSize:10,fontWeight:700 }}>
                    💡 Ölüm efektleri mağazadan satın alınabilir
                  </div>
                </div>
              )
            })()}

            {profileTab === 'trail' && (() => {
              const TRAIL_EFFECTS = [
                { id: 'flame',   name: 'Alev İzi',    icon: '🔥', desc: 'Ateş izi bırakır',       color: '#ef4444' },
                { id: 'star',    name: 'Yıldız İzi',  icon: '⭐', desc: 'Parlayan yıldızlar',     color: '#fbbf24' },
                { id: 'bubble',  name: 'Balon İzi',   icon: '🫧', desc: 'Renkli balonlar',        color: '#38bdf8' },
                { id: 'rainbow', name: 'Gökkuşağı',   icon: '🌈', desc: 'Gökkuşağı izi',         color: '#ec4899' },
                { id: 'neon',    name: 'Neon İzi',    icon: '💜', desc: 'Neon parıltısı',         color: '#a78bfa' },
              ]
              return (
                <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                  <div style={{ color:'#6b7280',fontSize:10,fontWeight:700,letterSpacing:1 }}>
                    İZ EFEKTİ — Hücre hareket ederken arkasında iz bırakır
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                    {TRAIL_EFFECTS.map(ef => {
                      const owned = ownedTrailEffects.includes(ef.id)
                      const active = activeTrailEffect === ef.id
                      return (
                        <motion.button key={ef.id} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                          onClick={()=>{
                            if(!owned){toast.error('Mağazadan satın al!');return}
                            setActiveTrailEffect(active?null:ef.id)
                            toast.success(active?'İz kaldırıldı!':'İz aktif! ✨')
                          }}
                          style={{ borderRadius:14,padding:'14px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                            background:active?`${ef.color}18`:'rgba(255,255,255,0.03)',
                            border:`1.5px solid ${active?ef.color:'rgba(255,255,255,0.08)'}`,
                            boxShadow:active?`0 0 20px ${ef.color}30`:undefined,cursor:'pointer',
                            opacity:owned?1:0.45,position:'relative',
                          }}>
                          <div style={{ fontSize:24 }}>{ef.icon}</div>
                          <div style={{ fontSize:9,fontWeight:900,color:active?ef.color:'#9ca3af',letterSpacing:1,textAlign:'center' }}>{ef.name}</div>
                          <div style={{ fontSize:8,color:'#4b5563',textAlign:'center',lineHeight:1.3 }}>{ef.desc}</div>
                          {active&&<div style={{ fontSize:7,fontWeight:900,color:ef.color,background:`${ef.color}18`,padding:'1px 6px',borderRadius:4,letterSpacing:1 }}>AKTİF</div>}
                          {!owned&&<div style={{ position:'absolute',top:4,right:4,fontSize:10 }}>🔒</div>}
                        </motion.button>
                      )
                    })}
                  </div>
                  <div style={{ padding:'10px 12px',borderRadius:10,background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.2)',color:'#a78bfa',fontSize:10,fontWeight:700 }}>
                    💡 İz efektleri mağazadan satın alınabilir
                  </div>
                </div>
              )
            })()}

            {profileTab === 'skills' && (
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                <div style={{ color:'#6b7280',fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4 }}>
                  KUTUDAN KAZANILAN YETENEKLER (Sonraki Oyun)
                </div>
                {Object.entries(SKILL_CFG).map(([sid, cfg]) => {
                  const boxUses = (ownedSkills||{})[sid] || 0
                  const hasPkg = ['legend','apex','immortal'].includes(ownedPackage)
                  const total = hasPkg ? '∞ (Paket)' : boxUses > 0 ? `${boxUses}x` : '0x'
                  const color = boxUses > 0 || hasPkg ? cfg.color : '#4b5563'
                  return (
                    <div key={sid} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,
                      background: boxUses>0||hasPkg ? `${cfg.color}0e` : 'rgba(255,255,255,0.02)',
                      border:`1px solid ${boxUses>0||hasPkg?cfg.color+'40':'rgba(255,255,255,0.06)'}` }}>
                      <div style={{ width:32,height:32,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
                        background:`${cfg.color}18`,border:`1.5px solid ${cfg.color}50`,fontSize:14 }}>
                        {sid==='speed'?'⚡':sid==='slow'?'🌀':sid==='shield'?'🛡️':sid==='magnet'?'🧲':sid==='ghost'?'👻':'✨'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ color:'#e2e8f0',fontWeight:700,fontSize:12 }}>{cfg.label}</div>
                        <div style={{ color:'#6b7280',fontSize:10,marginTop:1 }}>
                          {hasPkg ? 'Efsane+ Paketi — Sınırsız' : boxUses > 0 ? `${boxUses} kullanım hakkı mevcut` : 'Kutulardan kazan!'}
                        </div>
                      </div>
                      <div style={{ fontWeight:900,fontSize:14,color,minWidth:36,textAlign:'right' }}>{total}</div>
                    </div>
                  )
                })}
                <div style={{ marginTop:6,padding:'10px 12px',borderRadius:10,background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)' }}>
                  <div style={{ color:'#fbbf24',fontSize:10,fontWeight:700,letterSpacing:0.5 }}>
                    Efsane+ paketi al — tum yetenekler sınırsız kullanım!
                  </div>
                  <div style={{ color:'#6b7280',fontSize:9,marginTop:3 }}>
                    Veya Şans Kutularından nadir olarak kazan.
                  </div>
                </div>
              </div>
            )}
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

const LB_RANK_COLORS = ['#fbbf24', '#94a3b8', '#f97316']
const LB_RANK_LABELS = ['1', '2', '3']

function LBRankBadge({ rank }) {
  if (rank < 3) {
    const colors = ['linear-gradient(135deg,#fbbf24,#f59e0b)', 'linear-gradient(135deg,#94a3b8,#64748b)', 'linear-gradient(135deg,#f97316,#ea580c)']
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white flex-shrink-0"
        style={{ background: colors[rank], boxShadow: `0 0 12px ${LB_RANK_COLORS[rank]}66` }}>
        {rank + 1}
      </div>
    )
  }
  return (
    <div className="w-8 text-center font-black text-sm flex-shrink-0" style={{ color: '#4b5563' }}>
      #{rank + 1}
    </div>
  )
}

function LBRow({ p, i, theme, myUid }) {
  const isMe = p.uid === myUid
  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.03 }}
      whileHover={{ x: 3 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: isMe
          ? `rgba(${theme.glowColor},0.12)`
          : i < 3 ? `rgba(${theme.glowColor},0.06)` : 'rgba(255,255,255,0.02)',
        border: isMe
          ? `1px solid rgba(${theme.glowColor},0.4)`
          : i < 3 ? `1px solid rgba(${theme.glowColor},0.15)` : '1px solid transparent'
      }}>
      <LBRankBadge rank={i} />
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: p.color || '#6366f1', boxShadow: `0 0 10px ${p.color || '#6366f1'}55` }}>
        {p.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate" style={{ color: isMe ? theme.uiAccent : '#fff' }}>
          {p.name}{isMe && <span className="ml-1.5 text-xs opacity-60">(Sen)</span>}
        </div>
        <div className="text-xs text-gray-600 flex items-center gap-1.5">
          {p.level > 1 ? `Lv.${p.level}` : ''}
          {p.clan ? <span style={{ color: theme.uiAccent, fontWeight: 700 }}>[{p.clan}]</span> : ''}
          {p.uid && <span style={{ fontFamily:'monospace', fontSize: 9, opacity: 0.45 }}>#{p.uid.slice(0,6).toUpperCase()}</span>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-black text-sm" style={{ color: i === 0 ? '#fbbf24' : theme.uiAccent }}>
          {(p.score || 0).toLocaleString()}
        </div>
        <div className="text-xs text-gray-600">puan</div>
      </div>
    </motion.div>
  )
}

function LeaderboardTab({ theme, panelStyle, user, profile }) {
  const [lbTab, setLbTab] = useState('global')
  const [lbData, setLbData] = useState([])
  const [lbLoading, setLbLoading] = useState(true)
  const myUid = user?.uid

  useEffect(() => {
    setLbLoading(true)
    setLbData([])
    const fallback = MOCK_LEADERBOARD.map(p => ({ name: p.name, score: p.mass, color: p.color, level: 1 }))

    if (lbTab === 'global') {
      fbGetLeaderboard(50).then(d => {
        setLbData(d.length > 0 ? d : fallback)
        setLbLoading(false)
      }).catch(() => { setLbData(fallback); setLbLoading(false) })
    } else if (lbTab === 'weekly') {
      fbGetWeeklyLeaderboard(50).then(d => {
        setLbData(d.length > 0 ? d : fallback.slice(0, 5))
        setLbLoading(false)
      }).catch(() => { setLbData([]); setLbLoading(false) })
    } else if (lbTab === 'friends') {
      const friendUids = Object.keys(profile?.friends || {})
      if (myUid) friendUids.push(myUid)
      fbGetFriendsLeaderboard(friendUids).then(d => {
        setLbData(d)
        setLbLoading(false)
      }).catch(() => { setLbData([]); setLbLoading(false) })
    } else if (lbTab === 'clan') {
      const clanName = profile?.clan
      fbGetClanLeaderboard(clanName, 50).then(d => {
        setLbData(d)
        setLbLoading(false)
      }).catch(() => { setLbData([]); setLbLoading(false) })
    }
  }, [lbTab, myUid])

  const tabs = [
    { id: 'global', label: 'Küresel' },
    { id: 'weekly', label: 'Haftalık' },
    { id: 'friends', label: 'Arkadaşlar' },
    { id: 'clan', label: 'Klan' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={panelStyle}>
        <div className="px-4 py-3 flex items-center gap-3 border-b flex-wrap" style={{ borderColor: `rgba(${theme.glowColor},0.2)` }}>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id}
                onClick={() => setLbTab(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: lbTab === t.id ? `rgba(${theme.glowColor},0.25)` : 'rgba(255,255,255,0.05)',
                  border: lbTab === t.id ? `1px solid rgba(${theme.glowColor},0.5)` : '1px solid transparent',
                  color: lbTab === t.id ? theme.uiAccent : '#6b7280'
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-bold">CANLI</span>
          </div>
        </div>
        <div className="p-3 space-y-1" style={{ minHeight: 300 }}>
          {lbLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.uiAccent }} />
            </div>
          ) : lbData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div className="text-sm">
                {lbTab === 'friends' ? 'Arkadaş sıralama verisi bulunamadı' :
                 lbTab === 'clan' ? 'Klan üyesi sıralaması bulunamadı' :
                 lbTab === 'weekly' ? 'Bu hafta henüz veri yok' : 'Sıralama verisi bulunamadı'}
              </div>
            </div>
          ) : lbData.map((p, i) => (
            <LBRow key={p.uid || p.name + i} p={p} i={i} theme={theme} myUid={myUid} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {myUid && (
          <div className="rounded-2xl p-4" style={panelStyle}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
              Benim Yerim
            </div>
            {(() => {
              const myRank = lbData.findIndex(p => p.uid === myUid)
              const myEntry = lbData.find(p => p.uid === myUid)
              return (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `rgba(${theme.glowColor},0.1)`, border: `1px solid rgba(${theme.glowColor},0.3)` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm" style={{ background: profile?.color || '#6366f1' }}>
                    {(profile?.name || 'P')[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{profile?.name || 'Sen'}</div>
                    <div className="text-xs" style={{ color: theme.uiAccent }}>{myEntry ? `#${myRank + 1} sırada` : 'Listede yok'}</div>
                  </div>
                  <div className="font-black text-sm" style={{ color: theme.uiAccent }}>
                    {(myEntry?.score || 0).toLocaleString()}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <div className="rounded-2xl p-5" style={panelStyle}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.uiAccent }}>
            Istatistikler
          </div>
          {[
            { label: 'Toplam Oyuncu', value: lbData.length + '+', color: '#22c55e' },
            { label: 'En Yüksek Skor', value: lbData[0] ? (lbData[0].score || 0).toLocaleString() : '-', color: '#fbbf24' },
            { label: 'Ortalama Skor', value: lbData.length ? Math.round(lbData.reduce((s,p)=>s+(p.score||0),0)/lbData.length).toLocaleString() : '-', color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-gray-400">{s.label}</div>
              <div className="font-black text-sm" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
