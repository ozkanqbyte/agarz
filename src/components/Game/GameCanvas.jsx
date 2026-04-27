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
import { db } from '../../firebase/config'
import GameUI from './GameUI'
import ChatSystem from '../Chat/ChatSystem'
import InGameProfilePopup from './InGameProfilePopup'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function GameCanvas({ onLevelUp }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuthStore()
  const { setScore, setPlayerMass, setRank, setTotalPlayers, setLeaderboard, setPlaying, currentTheme, gameMode } = useGameStore()
  const { ownedPackage } = usePremiumStore()
  const { addXP, addKill, addVirus, updateHighScore, incrementGames, checkBadges, usePendingGod, pendingGodGames, addGoldForFood, addGoldForKill, addGoldForGame, activeNameEffect, activeFrame, ownedSkills, activeDeathEffect, activeTrailEffect } = useProgressStore()
  const { updateProgress } = useQuestStore()
  const { addBPXP } = useBattlePassStore()
  const startTimeRef = useRef(Date.now())
  const splitCountRef = useRef(0)
  const sessionXPRef = useRef(0)
  const [profilePopup, setProfilePopup] = useState(null)

  const roomId = searchParams.get('room') || 'main_ffa'
  const rawName = searchParams.get('name')
  const playerName = (profile?.name && profile.name.trim() && profile.name !== 'Player')
    ? profile.name.trim()
    : (rawName && rawName !== 'Player' && rawName !== 'undefined' ? decodeURIComponent(rawName) : (profile?.name || 'Oyuncu'))
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
      deathEffect: activeDeathEffect,
      trailEffect: activeTrailEffect,
      onScoreChange: (score) => {
        setScore(score)
        updateHighScore(score)
        updateProgress('score', score)
        if (score > 0 && score % 100 === 0) addGoldForFood()
      },
      onMassChange: (mass) => {
        setPlayerMass(mass)
      },
      onDeath: handleDeath,
      onLeaderboardChange: (lb) => setLeaderboard(lb),
      onPlayerCountChange: (n) => setTotalPlayers(n),
      onTimerChange: () => {},
      onXPGain: handleXPGain,
      onKill: handleKill,
      onPlayerDoubleClick: (playerData) => setProfilePopup(playerData),
      onKicked: (reason) => {
        toast.error(`🚫 ${reason}`, { duration: 6000 })
        setTimeout(() => navigate('/menu'), 3000)
      },
      onAnnouncement: (d) => {
        const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', event: '🎉', maintenance: '🔧' }
        const icon = icons[d.type] || 'ℹ️'
        toast(`${icon} ${d.message}`, { duration: 8000, style: { background: 'rgba(15,15,30,0.97)', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.4)' } })
      },
      onPremiumUpdated: (d) => {
        usePremiumStore.setState({ ownedPackage: d.ownedPackage })
        toast.success(`⭐ Premium güncellendi: ${d.ownedPackage?.toUpperCase()}`, { duration: 5000, style: { background: 'rgba(15,15,30,0.97)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' } })
      },
      onCoinUpdated: (d) => {
        useProgressStore.setState({ coins: d.coins })
        toast.success(`💰 Admin coin verdi! Bakiye: ${d.coins?.toLocaleString()}`, { duration: 5000, style: { background: 'rgba(15,15,30,0.97)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' } })
      },
      onCosmeticAdded: (d) => {
        if (d.type === 'frame') useProgressStore.setState(s => ({ ownedFrames: [...new Set([...(s.ownedFrames||[]), d.itemId])] }))
        else if (d.type === 'nameEffect') useProgressStore.setState(s => ({ ownedNameEffects: [...new Set([...(s.ownedNameEffects||[]), d.itemId])] }))
        else if (d.type === 'trail') useProgressStore.setState(s => ({ ownedTrailEffects: [...new Set([...(s.ownedTrailEffects||[]), d.itemId])] }))
        else if (d.type === 'deathEffect') useProgressStore.setState(s => ({ ownedDeathEffects: [...new Set([...(s.ownedDeathEffects||[]), d.itemId])] }))
        else if (d.type === 'skin') usePremiumStore.setState(s => ({ ownedSkins: [...new Set([...(s.ownedSkins||[]), d.itemId])] }))
        toast.success(`✨ Yeni kozmetik kazandın: ${d.itemId}`, { duration: 5000, style: { background: 'rgba(15,15,30,0.97)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.4)' } })
      },
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
          ownedDeathEffects: ps.ownedDeathEffects || [],
          ownedTrailEffects: ps.ownedTrailEffects || [],
          activeDeathEffect: ps.activeDeathEffect || null,
          activeTrailEffect: ps.activeTrailEffect || null,
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

  useEffect(() => {
    if (engineRef.current && profile?.name && profile.name !== 'Player') {
      engineRef.current.playerName = profile.name.trim()
    }
  }, [profile?.name])

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
    engineRef.current.onStatusChange?.({ spectating: true })
  }
  const handleRestart = (teamCode) => {
    if (!engineRef.current) return
    engineRef.current.spectating = false
    engineRef.current.dead = false
    engineRef.current.cells = []
    if (teamCode) engineRef.current.playerTeam = teamCode
    engineRef.current.onStatusChange?.({ spectating: false })
    engineRef.current.init()
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <AnimatePresence>
        {profilePopup && (
          <InGameProfilePopup
            player={profilePopup}
            onClose={() => setProfilePopup(null)}
          />
        )}
      </AnimatePresence>

      <GameUI
        engineRef={engineRef}
        onSplit={handleSplit}
        onEject={handleEject}
        onLeave={handleLeave}
        onSpectate={handleSpectate}
        onRestart={handleRestart}
        roomId={roomId}
        mode={mode}
        onPlayerProfileClick={(p) => setProfilePopup(p)}
      />

      <ChatSystem roomId={roomId} />
    </div>
  )
}
