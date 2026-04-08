import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import toast from 'react-hot-toast'

const PARTICLES = [...Array(30)].map((_, i) => ({
  w: 3 + (i * 7) % 8,
  h: 3 + (i * 7) % 8,
  left: ((i * 37) % 100),
  top: ((i * 53) % 100),
  color: ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'][i % 4],
  dur: 3 + (i % 4),
  delay: (i % 3)
}))

export default function AuthScreen() {
  const [mode, setMode] = useState('guest')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, loginWithGoogle, loginAsGuest, user, profile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user || profile) navigate('/menu', { replace: true })
  }, [user, profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    let result
    if (mode === 'login') {
      result = await login(email, password)
    } else {
      if (!name.trim()) { toast.error('İsim gerekli!'); setLoading(false); return }
      result = await register(email, password, name)
    }
    if (!result.success) {
      const msg = result.error || ''
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        toast.error('Email veya şifre hatalı!')
      } else if (msg.includes('email-already-in-use')) {
        toast.error('Bu email zaten kayıtlı!')
      } else if (msg.includes('weak-password')) {
        toast.error('Şifre en az 6 karakter olmalı!')
      } else if (msg.includes('invalid-api-key') || msg.includes('api-key') || msg.includes('app-not-authorized')) {
        toast.error('Firebase kurulmadı. Misafir olarak devam et!')
      } else {
        toast.error('Bağlantı hatası. Misafir modu dene!')
      }
    } else {
      toast.success(mode === 'login' ? 'Hoş geldin! 🎮' : 'Hesap oluşturuldu! 🎉')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    const result = await loginWithGoogle()
    if (!result.success) toast.error('Google girişi başarısız. Misafir modu dene!')
    else toast.success('Hoş geldin! 🎮')
    setLoading(false)
  }

  const handleGuest = async () => {
    if (!guestName.trim()) { toast.error('Bir isim gir!'); return }
    setLoading(true)
    const result = await loginAsGuest(guestName.trim())
    if (result.success) {
      toast.success(`Hoş geldin, ${guestName.trim()}! 🎮`)
    } else {
      toast.error('Hata oluştu')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)' }}>

      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{
              width: p.w, height: p.h,
              left: `${p.left}%`, top: `${p.top}%`,
              background: p.color,
              boxShadow: `0 0 10px ${p.color}`
            }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-7xl mb-4"
            style={{ filter: 'drop-shadow(0 0 30px #6366f1)' }}
          >
            ⬤
          </motion.div>
          <h1 className="text-5xl font-black tracking-widest"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AGARZ
          </h1>
          <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase">Eat. Grow. Dominate.</p>
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(20px)' }}>

          <div className="flex">
            {[
              { id: 'guest', label: '🎮 Misafir' },
              { id: 'login', label: 'Giriş' },
              { id: 'register', label: 'Kayıt' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="flex-1 py-3 font-bold text-sm uppercase tracking-wider transition-all duration-300"
                style={{
                  background: mode === m.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: mode === m.id ? '#a5b4fc' : '#6b7280',
                  borderBottom: mode === m.id ? '2px solid #6366f1' : '2px solid transparent'
                }}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">

              {mode === 'guest' && (
                <motion.div key="guest"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4">
                  <div className="text-center py-2">
                    <div className="text-4xl mb-2">🎮</div>
                    <div className="text-white font-bold">Hızlı Başla</div>
                    <div className="text-gray-400 text-xs mt-1">Kayıt olmadan oyna! Firebase gerekmez.</div>
                  </div>
                  <input
                    type="text"
                    placeholder="Oyuncu İsmin"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value.slice(0, 20))}
                    maxLength={20}
                    onKeyDown={e => { if (e.key === 'Enter') handleGuest() }}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none text-center text-lg font-bold"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(99,102,241,0.4)' }}
                  />
                  <motion.button
                    onClick={handleGuest}
                    disabled={loading || !guestName.trim()}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-xl font-black text-white text-lg uppercase tracking-widest disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.5)' }}>
                    {loading ? '⏳ Yükleniyor...' : '▶ HEMEN OYNA'}
                  </motion.button>
                  <div className="text-center text-xs text-gray-600">
                    Hesabın var mı? Üst kısımdan giriş yap
                  </div>
                </motion.div>
              )}

              {(mode === 'login' || mode === 'register') && (
                <motion.div key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === 'register' && (
                      <input
                        type="text"
                        placeholder="Oyuncu İsmi"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }}
                      />
                    )}
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }}
                    />
                    <input
                      type="password"
                      placeholder="Şifre (min 6 karakter)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }}
                    />
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl font-bold text-white uppercase tracking-widest disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                      {loading ? '⏳...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                    </motion.button>
                  </form>

                  <div className="flex items-center">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
                    <span className="px-3 text-gray-500 text-xs">veya</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
                  </div>

                  <motion.button
                    onClick={handleGoogle}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google ile Giriş
                  </motion.button>

                  <div className="rounded-xl p-3 text-center text-xs"
                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                    ⚠️ Firebase kurulmamışsa "Misafir" sekmesini kullan
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
