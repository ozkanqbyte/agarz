import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import useAuthStore from './store/useAuthStore'
import usePremiumStore from './store/usePremiumStore'
import useProgressStore from './store/useProgressStore'
import AuthScreen from './components/Auth/AuthScreen'
import MainMenu from './components/Menu/MainMenu'
import GameCanvas from './components/Game/GameCanvas'
import Lobby from './components/Lobby/Lobby'
import ClanSystem from './components/Clan/ClanSystem'
import PremiumShop from './components/Premium/PremiumShop'
import BattlePassPage from './components/BattlePass/BattlePassPage'
import LootBoxModal from './components/LootBox/LootBoxModal'
import LevelUpModal from './components/Progress/LevelUpModal'

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user && !profile) return <Navigate to="/auth" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#0a0a1a' }}>
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">⬤</div>
        <div className="text-2xl font-black text-white tracking-widest">AGARZ</div>
        <div className="text-gray-400 text-sm mt-2 animate-pulse">Yükleniyor...</div>
      </div>
    </div>
  )
}

export default function App() {
  const { init, loading } = useAuthStore()
  const { showShop } = usePremiumStore()
  const { pendingLootBoxes } = useProgressStore()
  const [showLootBox, setShowLootBox] = useState(false)
  const [levelUpData, setLevelUpData] = useState(null)

  useEffect(() => {
    const unsub = init()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [])

  useEffect(() => {
    if (pendingLootBoxes > 0 && !showLootBox) {
      setShowLootBox(true)
    }
  }, [pendingLootBoxes])

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(15,15,30,0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(99,102,241,0.3)',
            backdropFilter: 'blur(10px)',
            fontFamily: '"Exo 2", sans-serif',
            fontWeight: 600
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />

      {showShop && <PremiumShop />}

      <AnimatePresence>
        {showLootBox && pendingLootBoxes > 0 && (
          <LootBoxModal
            key="lootbox"
            onClose={() => setShowLootBox(false)}
            onRewardEarned={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {levelUpData && (
          <LevelUpModal
            key="levelup"
            level={levelUpData.level}
            prestige={levelUpData.prestige}
            rewards={levelUpData.rewards}
            onClose={() => setLevelUpData(null)}
          />
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/menu" element={
          <ProtectedRoute><MainMenu /></ProtectedRoute>
        } />
        <Route path="/game" element={
          <ProtectedRoute><GameCanvas onLevelUp={(data) => setLevelUpData(data)} /></ProtectedRoute>
        } />
        <Route path="/lobby" element={
          <ProtectedRoute><Lobby /></ProtectedRoute>
        } />
        <Route path="/lobby/:mode" element={
          <ProtectedRoute><Lobby /></ProtectedRoute>
        } />
        <Route path="/clan" element={
          <ProtectedRoute><ClanSystem /></ProtectedRoute>
        } />
        <Route path="/battlepass" element={
          <ProtectedRoute><BattlePassPage /></ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
