import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GameEngine } from '../../game/GameEngine'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import usePremiumStore from '../../store/usePremiumStore'
import useProgressStore from '../../store/useProgressStore'
import useQuestStore from '../../store/useQuestStore'
import useBattlePassStore from '../../store/useBattlePassStore'
import { fbSaveProgress, fbSaveBattlePass, fbSaveQuests, fbUpdateLeaderboard, fbSaveInventory } from '../../firebase/syncService'
import { ref, set } from 'firebase/database'
import { db } from '../../firebase/config'
import GameUI from './GameUI'
import ChatSystem from '../Chat/ChatSystem'
import toast from 'react-hot-toast'

export default function GameCanvas({ onLevelUp }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuthStore()
  const { setScore, setRank, setTotalPlayers, setLeaderboard, setPlaying, currentTheme, gameMode } = useGameStore()
  const { ownedPackage } = usePremiumStore()
  const { addXP, addKill, addVirus, updateHighScore, incrementGames, checkBadges, usePendingGod, pendingGodGames, addGoldForFood, addGoldForKill, addGoldForGame, activeNameEffect, activeFrame, ownedSkills } = useProgressStore()
  const { updateProgress } = useQuestStore()
  const { addBPXP } = useBattlePassStore()
  const startTimeRef = useRef(Date.now())
  const splitCountRef = useRef(0)
  const sessionXPRef = useRef(0)
  const [clickedPlayer, setClickedPlayer] = useState(null)

  const roomId = searchParams.get('room') || 'main_ffa'
  const playerName = searchParams.get('name') || profile?.name || 'Player'
  const mode = searchParams.get('mode') || gameMode || 'ffa'
  const team = searchParams.get('team') || 'none'

  const handleDeath = useCallback((stats) => {
    toast.error('💀 Yenildin!', { duration: 2000 })
  }, [])

  const handleXPGain = useCallback((amount) => {
    const result = addXP(amount)
    sessionXPRef.current += amount
    addBPXP(Math.floor(amount / 5))
    updateProgress('xp', amount)
    if (result?.leveledUp) {
      onLevelUp?.({ level: result.newLevel, prestige: result.prestige, rewards: [] })
    }
    checkBadges()
  }, [addXP, addBPXP, updateProgress, onLevelUp, checkBadges])

  const handleKill = useCallback((mass) => {
    addKill()
    addGoldForKill()
    updateProgress('kills', 1)
    checkBadges()
  }, [addKill, addGoldForKill, updateProgress, checkBadges])

  useEffect(() => {
    if (!canvasRef.current) return

    incrementGames()
    updateProgress('games', 1)
    startTimeRef.current = Date.now()

    const engine = new GameEngine(canvasRef.current, {
      playerId: user?.uid || 'guest_' + Math.random().toString(36).slice(2),
      playerName,
      color: profile?.color || '#6366f1',
      skin: profile?.skin || 'default',
      avatar: profile?.avatar || 'gradient',
      roomId,
      gameMode: mode,
      theme: currentTheme,
      isGod: profile?.isGod || (pendingGodGames > 0 && usePendingGod()) || false,
      clan: profile?.clan || null,
      isPremium: ownedPackage !== 'free',
      ownedPackage,
      team,
      nameEffect: activeNameEffect,
      ownedSkills: ownedSkills || {},
      activeFrame: activeFrame,
      onScoreChange: (score) => {
        setScore(score)
        updateHighScore(score)
        updateProgress('score', score)
        if (score > 0 && score % 100 === 0) addGoldForFood()
      },
      onDeath: handleDeath,
      onLeaderboardChange: (lb) => setLeaderboard(lb),
      onPlayerCountChange: (n) => setTotalPlayers(n),
      onTimerChange: () => {},
      onXPGain: handleXPGain,
      onKill: handleKill,
    })

    engineRef.current = engine
    setPlaying(true)

    engine.init().catch(err => {
      console.warn('Firebase init failed, running in offline mode:', err)
    })

    const origSplit = engine._split.bind(engine)
    engine._split = function() {
      origSplit()
      splitCountRef.current++
      updateProgress('splits', 1)
    }

    return () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      useProgressStore.getState().addPlayTime(elapsed)
      updateProgress('playtime', elapsed)
      engine.destroy()
      setPlaying(false)

      const uid = user?.uid
      if (uid && !uid.startsWith('guest_')) {
        const ps = useProgressStore.getState()
        const bp = useBattlePassStore.getState()
        const qs = useQuestStore.getState()
        const pms = usePremiumStore.getState()
        fbSaveProgress(uid, ps).catch(() => {})
        fbSaveBattlePass(uid, bp).catch(() => {})
        fbSaveQuests(uid, qs).catch(() => {})
        fbSaveInventory(uid, {
          ownedFrames: ps.ownedFrames || [],
          ownedNameEffects: ps.ownedNameEffects || [],
          ownedSkills: ps.ownedSkills || {},
          ownedSkins: pms.ownedSkins || ['default'],
          activeNameEffect: ps.activeNameEffect || null,
          activeFrame: ps.activeFrame || null,
        }).catch(() => {})
        fbUpdateLeaderboard(uid, {
          name: profile?.name || playerName,
          score: ps.highScore,
          level: ps.level,
          prestige: ps.prestige,
          color: profile?.color || '#6366f1',
          clan: profile?.clan || null,
        }).catch(() => {})
      }
    }
  }, [])

  const handleCanvasClick = useCallback((e) => {
    const engine = engineRef.current
    if (!engine || !user?.uid) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const cam = engine.camera
    const zoom = cam.zoom
    const wx = (sx - canvas.width / 2) / zoom + cam.x
    const wy = (sy - canvas.height / 2) / zoom + cam.y
    for (const [id, p] of Object.entries(engine.otherPlayers || {})) {
      const cells = p.cells?.length ? p.cells : [{ x: p.x, y: p.y, mass: p.mass || 20 }]
      for (const c of cells) {
        const r = Math.sqrt(c.mass || 20) * 4.5
        const dx = wx - c.x, dy = wy - c.y
        if (dx * dx + dy * dy <= r * r) {
          setClickedPlayer({ id, name: p.name, color: p.color })
          return
        }
      }
    }
    setClickedPlayer(null)
  }, [user])

  const handleAddFriend = async (targetId, targetName, targetColor) => {
    if (!user?.uid || user.uid.startsWith('guest_')) {
      toast.error('Arkadaş eklemek için giriş yapmalısın')
      return
    }
    try {
      await set(ref(db, `users/${targetId}/friendRequests/${user.uid}`), {
        name: profile?.name || 'Player',
        color: profile?.color || '#6366f1',
        uid: user.uid,
        status: 'pending',
        sentAt: Date.now()
      })
      toast.success(`${targetName}'e arkadaşlık isteği gönderildi! 👥`)
      setClickedPlayer(null)
    } catch {
      toast.error('İstek gönderilemedi')
    }
  }

  const handleSplit = () => engineRef.current?.touchSplit()
  const handleEject = () => engineRef.current?.touchEject()
  const handleLeave = () => {
    const finalScore = engineRef.current?.score || 0
    if (finalScore > 0) addGoldForGame(finalScore)
    engineRef.current?.destroy()
    navigate('/menu')
  }
  const handleSpectate = (targetId) => {
    if (!engineRef.current) return
    engineRef.current.spectating = true
    engineRef.current.dead = false
    if (targetId) {
      const targets = Object.keys(engineRef.current.otherPlayers)
      const idx = targets.indexOf(targetId)
      if (idx >= 0) engineRef.current.spectateIndex = idx
    }
  }
  const handleRestart = () => {
    if (!engineRef.current) return
    engineRef.current.spectating = false
    engineRef.current.dead = false
    engineRef.current.cells = []
    engineRef.current.init()
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" onClick={handleCanvasClick} />

      {clickedPlayer && (
        <div className="absolute top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-2xl"
          style={{ background: 'rgba(6,6,20,0.97)', border: `2px solid ${clickedPlayer.color}55`, minWidth: 200 }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white"
            style={{ background: clickedPlayer.color, boxShadow: `0 0 20px ${clickedPlayer.color}88` }}>
            {clickedPlayer.name?.[0] || '?'}
          </div>
          <div className="text-white font-black text-lg">{clickedPlayer.name}</div>
          <button
            className="w-full py-2 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            onClick={() => handleAddFriend(clickedPlayer.id, clickedPlayer.name, clickedPlayer.color)}>
            👥 Arkadaş Ekle
          </button>
          <button
            className="w-full py-2 rounded-xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af' }}
            onClick={() => setClickedPlayer(null)}>
            Kapat
          </button>
        </div>
      )}

      <GameUI
        engineRef={engineRef}
        onSplit={handleSplit}
        onEject={handleEject}
        onLeave={handleLeave}
        onSpectate={handleSpectate}
        onRestart={handleRestart}
        roomId={roomId}
        mode={mode}
      />

      <ChatSystem roomId={roomId} />
    </div>
  )
}
