import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/useAuthStore'

const FEATURES = [
  { icon: '⚔️', title: 'Klan Sistemi', desc: 'Klan kur, üye topla, klan savaşlarında rakipleri ez. Liderlik için savaş!' },
  { icon: '🏆', title: 'Sıralama & Lig', desc: 'Gerçek zamanlı global sıralama. Zirveye tırman, efsane ol.' },
  { icon: '🎨', title: 'Kozmetikler', desc: 'Ölüm efektleri, iz efektleri, özel isim animasyonları. Haritada fark yarat.' },
  { icon: '🎯', title: '7 Oyun Modu', desc: 'FFA, Takım, Klan Savaşı, Battle Royale, Rush ve daha fazlası.' },
  { icon: '⚡', title: 'Özel Yetenekler', desc: 'Hız, yavaşlatma, kalkan. Doğru yetenekle rakibini alt et.' },
  { icon: '🎁', title: 'Battle Pass', desc: 'Sezonluk ödüller, görevler, loot box\'lar. Her gün yeni sürpriz.' },
]

const STATS = [
  { value: '10,000+', label: 'Aktif Oyuncu' },
  { value: '7', label: 'Oyun Modu' },
  { value: '%100', label: 'Ücretsiz' },
  { value: '4.8★', label: 'Puan' },
]

const FLOATING_CELLS = [
  { size: 80, color: '#6366f1', x: '8%', y: '20%', delay: 0 },
  { size: 50, color: '#ec4899', x: '85%', y: '15%', delay: 0.5 },
  { size: 120, color: '#06b6d4', x: '75%', y: '60%', delay: 1 },
  { size: 35, color: '#fbbf24', x: '15%', y: '70%', delay: 1.5 },
  { size: 65, color: '#a855f7', x: '50%', y: '80%', delay: 0.8 },
  { size: 45, color: '#10b981', x: '90%', y: '85%', delay: 0.3 },
  { size: 30, color: '#f97316', x: '5%', y: '50%', delay: 1.2 },
  { size: 90, color: '#3b82f6', x: '40%', y: '10%', delay: 0.6 },
]

function FloatingCell({ size, color, x, y, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0.15, 0.35, 0.15],
        scale: [1, 1.15, 1],
        y: [0, -20, 0],
      }}
      transition={{
        duration: 4 + Math.random() * 3,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}44)`,
        boxShadow: `0 0 ${size * 0.4}px ${color}55`,
        pointerEvents: 'none',
      }}
    />
  )
}

function CountUp({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''))
        const startTime = performance.now()
        const tick = (now) => {
          const progress = Math.min((now - startTime) / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(ease * numericTarget))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  const display = target.includes(',') ? count.toLocaleString() : count
  return <span ref={ref}>{display}{suffix}</span>
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [particles, setParticles] = useState([])
  const containerRef = useRef(null)
  const { scrollY } = useScroll({ container: containerRef })
  const heroY = useTransform(scrollY, [0, 500], [0, -120])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])

  useEffect(() => {
    const ps = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 4,
    }))
    setParticles(ps)
  }, [])

  const handlePlay = () => {
    if (user) navigate('/menu')
    else navigate('/auth')
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw', height: '100vh', overflowY: 'auto', overflowX: 'hidden',
        background: '#050510', color: 'white', fontFamily: '"Exo 2", sans-serif',
        scrollBehavior: 'smooth',
      }}
    >
      {/* HERO SECTION */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

        {/* Background gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.12) 0%, transparent 60%), #050510', pointerEvents: 'none' }} />

        {/* Star particles */}
        {particles.map(p => (
          <motion.div
            key={p.id}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              borderRadius: '50%',
              background: '#fff',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Floating cells */}
        {FLOATING_CELLS.map((c, i) => <FloatingCell key={i} {...c} />)}

        {/* Navbar */}
        <motion.nav
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 40px',
            background: 'rgba(5,5,16,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⬤ AGARIX
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="#features" style={{ color: '#9ca3af', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: 1 }}>ÖZELLİKLER</a>
            <a href="#how" style={{ color: '#9ca3af', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: 1 }}>NASIL OYNANIR</a>
            <a href="#modes" style={{ color: '#9ca3af', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: 1 }}>MODLAR</a>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handlePlay}
              style={{
                padding: '8px 22px', borderRadius: 50, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#6366f1,#ec4899)',
                color: 'white', fontWeight: 900, fontSize: 13, letterSpacing: 1,
                fontFamily: '"Exo 2", sans-serif',
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              }}
            >
              OYNA
            </motion.button>
          </div>
        </motion.nav>

        {/* Hero content */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity, position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px', marginTop: 60 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, color: '#6366f1', marginBottom: 16, textTransform: 'uppercase' }}>
              🎮 Türkiye'nin #1 io Oyunu
            </div>
            <h1 style={{
              fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 900, lineHeight: 1.05,
              background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 40%, #ec4899 80%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: -2, marginBottom: 20,
            }}>
              Büyü.<br />Yut.<br />Hükmet.
            </h1>
            <p style={{ fontSize: 'clamp(14px, 2vw, 20px)', color: '#94a3b8', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7, fontWeight: 500 }}>
              Agarix — hücrenle haritada büyü, rakipleri yut, sıralamada zirveye tırman.
              Klan kur, arkadaşlarınla takım ol. <strong style={{ color: '#a5b4fc' }}>%100 ücretsiz, tarayıcıdan oyna.</strong>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.button
              whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(99,102,241,0.6)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlay}
              style={{
                padding: '18px 48px', borderRadius: 60, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
                color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: 1,
                fontFamily: '"Exo 2", sans-serif',
                boxShadow: '0 0 30px rgba(99,102,241,0.5)',
              }}
            >
              🎮 HEMEN OYNA — ÜCRETSİZ
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '18px 36px', borderRadius: 60,
                border: '1.5px solid rgba(99,102,241,0.4)',
                background: 'rgba(99,102,241,0.08)',
                color: '#a5b4fc', fontWeight: 800, fontSize: 16,
                cursor: 'pointer', fontFamily: '"Exo 2", sans-serif',
              }}
            >
              Daha Fazla ↓
            </motion.button>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}
          >
            {['✅ Kayıt gerekmez', '🚀 Anında oyna', '📱 Mobil uyumlu', '🔒 Güvenli'].map(b => (
              <div key={b} style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, letterSpacing: 0.5 }}>{b}</div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', color: '#374151', fontSize: 20 }}
        >
          ↓
        </motion.div>
      </section>

      {/* STATS */}
      <section style={{ padding: '60px 40px', background: 'rgba(99,102,241,0.05)', borderTop: '1px solid rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, textAlign: 'center' }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div style={{ fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, letterSpacing: 2, marginTop: 6 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#6366f1', marginBottom: 12 }}>ÖZELLİKLER</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, lineHeight: 1.2 }}>
            Neden <span style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Agarix?</span>
          </h2>
          <p style={{ color: '#6b7280', marginTop: 16, fontSize: 16, maxWidth: 500, margin: '16px auto 0' }}>
            Diğer io oyunlarından fark yaratan özellikler
          </p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(99,102,241,0.15)' }}
              style={{
                padding: '32px 28px', borderRadius: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(99,102,241,0.12)',
                transition: 'box-shadow 0.3s',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10, color: '#e2e8f0' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW TO PLAY */}
      <section id="how" style={{ padding: '80px 40px', background: 'rgba(99,102,241,0.04)', borderTop: '1px solid rgba(99,102,241,0.08)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 56 }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#6366f1', marginBottom: 12 }}>NASIL OYNANIR</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900 }}>3 Adımda Başla</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { step: '01', icon: '👤', title: 'Hesap Oluştur', desc: 'Google ile 10 saniyede ücretsiz kayıt ol. Kart bilgisi yok.' },
              { step: '02', icon: '🎮', title: 'Mod Seç', desc: 'FFA, Takım Savaşı, Battle Royale veya Klan Savaşı. Senin seçimin.' },
              { step: '03', icon: '🏆', title: 'Hükmet', desc: 'Hücrenle büyü, rakipleri yut, sıralamada zirveye çık!' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: '#4b5563', letterSpacing: 2, marginBottom: 12 }}>ADIM {s.step}</div>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GAME MODES */}
      <section id="modes" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, color: '#6366f1', marginBottom: 12 }}>OYUN MODLARI</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900 }}>Her Oyuncuya Bir Mod</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '⚔️', name: 'Free For All', desc: 'Herkese karşı tek başına. En büyük kazanır.', color: '#6366f1', rule: '🏆 En yüksek kütle' },
            { icon: '🛡️', name: 'Takım Savaşı', desc: 'Kırmızı vs Mavi. Koordineli saldır.', color: '#06b6d4', rule: '🤝 Takım bazlı' },
            { icon: '💥', name: 'Battle Royale', desc: 'Alan küçülüyor! Son kalan kazanır.', color: '#ef4444', rule: '☠️ Son hayatta kalan' },
            { icon: '⚡', name: 'Rush Mode', desc: '5 dakika, en çok öldürme kazanır!', color: '#f59e0b', rule: '⚡ En çok kill' },
            { icon: '🏰', name: 'Klan Savaşı', desc: 'Klan lobisi aç, üyelerini topla, savaş!', color: '#10b981', rule: '🏰 Klan vs Klan' },
          ].map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04, borderColor: m.color }}
              style={{
                padding: '24px 20px', borderRadius: 16, textAlign: 'center',
                background: `rgba(${m.color === '#6366f1' ? '99,102,241' : m.color === '#10b981' ? '16,185,129' : m.color === '#06b6d4' ? '6,182,212' : m.color === '#ef4444' ? '239,68,68' : m.color === '#f59e0b' ? '245,158,11' : '249,115,22'},0.07)`,
                border: `1px solid ${m.color}22`,
                transition: 'border-color 0.2s, transform 0.2s',
                cursor: 'pointer',
              }}
              onClick={handlePlay}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 14, color: '#e2e8f0', marginBottom: 6 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{m.desc}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: m.color, background: `${m.color}15`, padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>{m.rule}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h2 style={{ fontSize: 'clamp(30px,5vw,56px)', fontWeight: 900, marginBottom: 20, lineHeight: 1.2 }}>
            Hazır mısın?<br />
            <span style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Hükmetmeye Başla.
            </span>
          </h2>
          <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 40, maxWidth: 440, margin: '0 auto 40px' }}>
            Binlerce oyuncu seni bekliyor. Ücretsiz, anında, tarayıcıdan.
          </p>
          <motion.button
            whileHover={{ scale: 1.06, boxShadow: '0 0 60px rgba(99,102,241,0.7)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlay}
            style={{
              padding: '20px 60px', borderRadius: 60, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
              color: 'white', fontWeight: 900, fontSize: 20,
              fontFamily: '"Exo 2", sans-serif',
              boxShadow: '0 0 40px rgba(99,102,241,0.5)',
              letterSpacing: 1,
            }}
          >
            🎮 HEMEN OYNA
          </motion.button>
          <div style={{ marginTop: 20, fontSize: 12, color: '#374151', fontWeight: 700 }}>
            ✅ Kayıt gerekmez &nbsp;•&nbsp; 🆓 Tamamen ücretsiz &nbsp;•&nbsp; ⚡ Anında başla
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⬤ AGARIX
        </div>
        <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          © 2025 Agarix · <a href="https://agarix.com.tr" style={{ color: '#6366f1', textDecoration: 'none' }}>agarix.com.tr</a>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['io oyunu', 'online oyun', 'multiplayer', 'ücretsiz oyun'].map(t => (
            <span key={t} style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </footer>
    </div>
  )
}
