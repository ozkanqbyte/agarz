import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'
import toast from 'react-hot-toast'

const ORBS = [
  { w: 500, h: 500, left: '-10%', top: '-10%', color: '#6366f120' },
  { w: 400, h: 400, left: '60%', top: '20%', color: '#8b5cf615' },
  { w: 350, h: 350, left: '20%', top: '60%', color: '#ec489910' },
]

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [guestName, setGuestName] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const { login, register, loginWithGoogle, loginAsGuest, user, profile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user || profile) navigate('/menu', { replace: true })
  }, [user, profile])

  const handleGuest = async () => {
    if (!guestName.trim()) { toast.error('Bir isim gir!'); return }
    setLoading(true)
    const r = await loginAsGuest(guestName.trim())
    if (r.success) toast.success(`Hoş geldin, ${guestName.trim()}!`)
    else toast.error('Hata oluştu')
    setLoading(false)
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    let result
    if (authMode === 'login') {
      result = await login(email, password)
    } else {
      if (!regName.trim()) { toast.error('İsim gerekli!'); setLoading(false); return }
      result = await register(email, password, regName)
    }
    if (!result.success) {
      const msg = result.error || ''
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) toast.error('Email veya şifre hatalı!')
      else if (msg.includes('email-already-in-use')) toast.error('Bu email zaten kayıtlı!')
      else if (msg.includes('weak-password')) toast.error('Şifre en az 6 karakter olmalı!')
      else toast.error('Bağlantı hatası. Misafir modu dene!')
    } else {
      toast.success(authMode === 'login' ? 'Hoş geldin!' : 'Hesap oluşturuldu!')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    const r = await loginWithGoogle()
    if (!r.success) toast.error('Google girişi başarısız. Misafir modu dene!')
    else toast.success('Hoş geldin!')
    setLoading(false)
  }

  return (
    <div className="min-h-screen overflow-y-auto relative"
      style={{ background: 'linear-gradient(135deg, #050510 0%, #0d0520 60%, #050a20 100%)' }}>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {ORBS.map((orb, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{ width: orb.w, height: orb.h, left: orb.left, top: orb.top, background: orb.color, filter: 'blur(80px)' }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, delay: i * 1.5 }}
          />
        ))}
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(rgba(99,102,241,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-12 px-4">

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10">
          <motion.div
            animate={{ scale: [1, 1.06, 1], filter: ['drop-shadow(0 0 30px #6366f1)', 'drop-shadow(0 0 60px #8b5cf6)', 'drop-shadow(0 0 30px #6366f1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-8xl mb-3 select-none">
            ⬤
          </motion.div>
          <h1 className="text-6xl font-black tracking-[0.15em]"
            style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Agarix
          </h1>
          <p className="text-gray-500 mt-2 text-xs tracking-[0.4em] uppercase font-medium">Eat · Grow · Dominate</p>
        </motion.div>

        <div className="w-full max-w-sm space-y-3">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.28)', backdropFilter: 'blur(24px)' }}>
            <div className="mb-4">
              <div className="text-white font-bold text-sm mb-0.5">Hızlı Başla</div>
              <div className="text-gray-500 text-xs">Kayıt olmadan hemen oyna</div>
            </div>
            <input
              type="text"
              placeholder="Oyuncu ismin..."
              value={guestName}
              onChange={e => setGuestName(e.target.value.slice(0, 20))}
              onKeyDown={e => { if (e.key === 'Enter') handleGuest() }}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none text-base font-semibold mb-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.3)' }}
            />
            <motion.button
              onClick={handleGuest}
              disabled={loading || !guestName.trim()}
              whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(99,102,241,0.5)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl font-black text-white text-base uppercase tracking-widest disabled:opacity-40 transition-shadow"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.35)' }}>
              {loading ? '...' : 'HEMEN OYNA'}
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 px-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-gray-600 text-xs tracking-widest uppercase">veya</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleGoogle}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-3 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google ile Giriş Yap
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(10,8,25,0.8)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

            <div className="flex">
              {[{ id: 'login', label: 'Giriş Yap' }, { id: 'register', label: 'Kayıt Ol' }].map(m => (
                <button key={m.id} onClick={() => setAuthMode(m.id)}
                  className="flex-1 py-3 font-bold text-sm uppercase tracking-wider transition-all duration-300"
                  style={{
                    background: authMode === m.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: authMode === m.id ? '#a5b4fc' : '#4b5563',
                    borderBottom: authMode === m.id ? '2px solid #6366f1' : '2px solid transparent'
                  }}>
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleEmail} className="p-5 space-y-3">
              <AnimatePresence mode="wait">
                {authMode === 'register' && (
                  <motion.div
                    key="rn"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                    exit={{ opacity: 0, height: 0 }}>
                    <input
                      type="text"
                      placeholder="Oyuncu İsmi"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none text-sm"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                type="email"
                placeholder="Email adresi"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <input
                type="password"
                placeholder="Şifre (min 6 karakter)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-xl font-bold text-white uppercase tracking-wider text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 20px rgba(99,102,241,0.25)' }}>
                {loading ? '...' : authMode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
              </motion.button>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
