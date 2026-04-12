import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import useAuthStore from './store/useAuthStore'
import useProgressStore from './store/useProgressStore'
import AuthScreen from './components/Auth/AuthScreen'
import MainMenu from './components/Menu/MainMenu'
import GameCanvas from './components/Game/GameCanvas'
import Lobby from './components/Lobby/Lobby'
import ClanSystem from './components/Clan/ClanSystem'
import BattlePassPage from './components/BattlePass/BattlePassPage'
import LevelUpModal from './components/Progress/LevelUpModal'
import ShopPage from './components/Shop/ShopPage'
import LandingPage from './components/Landing/LandingPage'
import ClanWarLobby from './components/ClanWar/ClanWarLobby'
import PaymentResultPage from './components/Payment/PaymentResultPage'
import ProfilePage from './components/Profile/ProfilePage'
import GlobalTopBar from './components/UI/GlobalTopBar'

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
        <div className="text-2xl font-black text-white tracking-widest">Agarix</div>
        <div className="text-gray-400 text-sm mt-2 animate-pulse">Yükleniyor...</div>
      </div>
    </div>
  )
}

export default function App() {
  const { init, loading } = useAuthStore()
  const [levelUpData, setLevelUpData] = useState(null)

  useEffect(() => {
    const unsub = init()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <GlobalTopBar />
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
        <Route path="/shop" element={
          <ProtectedRoute><ShopPage /></ProtectedRoute>
        } />
        <Route path="/clan-war" element={
          <ProtectedRoute><ClanWarLobby /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/payment/success" element={<PaymentResultPage success={true} />} />
        <Route path="/payment/fail" element={<PaymentResultPage success={false} />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
