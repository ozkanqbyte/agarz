import { useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GameEngine } from '../../game/GameEngine'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import usePremiumStore from '../../store/usePremiumStore'
import useProgressStore from '../../store/useProgressStore'
import useQuestStore from '../../store/useQuestStore'
import useBattlePassStore from '../../store/useBattlePassStore'
import { fbSaveProgress, fbSaveBattlePass, fbSaveQuests, fbUpdateLeaderboard } from '../../firebase/syncService'
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
  const { addXP, addKill, addVirus, updateHighScore, incrementGames, checkBadges, usePendingGod, pendingGodGames } = useProgressStore()
  const { updateProgress } = useQuestStore()
  const { addBPXP } = useBattlePassStore()
  const startTimeRef = useRef(Date.now())
  const splitCountRef = useRef(0)
  const sessionXPRef = useRef(0)

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
    updateProgress('kills', 1)
    checkBadges()
  }, [addKill, updateProgress, checkBadges])

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
      onScoreChange: (score) => {
        setScore(score)
        updateHighScore(score)
        updateProgress('score', score)
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
        fbSaveProgress(uid, ps).catch(() => {})
        fbSaveBattlePass(uid, bp).catch(() => {})
        fbSaveQuests(uid, qs).catch(() => {})
        fbUpdateLeaderboard(uid, {
          name: profile?.name || playerName,
          score: ps.highScore,
          level: ps.level,
          prestige: ps.prestige,
          color: profile?.color || '#6366f1',
        }).catch(() => {})
      }
    }
  }, [])

  const handleSplit = () => engineRef.current?.touchSplit()
  const handleEject = () => engineRef.current?.touchEject()
  const handleLeave = () => {
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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

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
