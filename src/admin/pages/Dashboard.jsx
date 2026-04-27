import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'

function StatCard({ icon, label, value, color = '#818cf8', sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#0d0d24', borderRadius: 16, padding: '20px 22px', border: `1px solid ${color}22`, boxShadow: `0 0 20px ${color}11` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color, letterSpacing: -1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>{sub}</div>}
    </motion.div>
  )
}

function MiniBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
    </div>
  )
}

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const intervalRef = useRef()

  const fetchAll = async () => {
    try {
      const [s, h] = await Promise.all([adminApi.stats(), adminApi.health()])
      setStats(s)
      setHealth(h)
      setHistory(prev => {
        const next = [...prev, { t: Date.now(), players: h.totalPlayers, rooms: h.rooms }]
        return next.slice(-20)
      })
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 8000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const uptime = health ? (() => {
    const s = health.uptime; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
    return `${h}s ${m}dk`
  })() : '—'

  const memPct = health ? Math.round(((health.memory.total - health.memory.free) / health.memory.total) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', letterSpacing: -0.5 }}>📊 Dashboard</h1>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>Gerçek zamanlı sunucu ve oyuncu istatistikleri</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: loading ? '#fbbf24' : '#22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>{loading ? 'GÜNCELLENIYOR' : 'CANLI'}</span>
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon="👥" label="Toplam Kullanıcı" value={stats?.totalUsers ?? '—'} color="#818cf8" />
        <StatCard icon="🎮" label="Aktif Oyuncu" value={health?.totalPlayers ?? 0} color="#22c55e" sub={`${health?.rooms ?? 0} oda`} />
        <StatCard icon="🏆" label="Premium Kullanıcı" value={stats?.premiumUsers ?? '—'} color="#fbbf24" />
        <StatCard icon="🚫" label="Banlı Kullanıcı" value={stats?.bannedUsers ?? '—'} color="#ef4444" />
        <StatCard icon="💰" label="Toplam Coin" value={stats?.totalCoins?.toLocaleString() ?? '—'} color="#f59e0b" />
        <StatCard icon="⏱️" label="Uptime" value={uptime} color="#06b6d4" />
      </div>

      {/* SERVER HEALTH */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '20px', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 16 }}>💻 SUNUCU SAĞLIĞI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#9ca3af' }}>RAM Kullanımı</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{health ? `${health.memory.used}MB / ${health.memory.total}MB` : '—'}</span>
              </div>
              <MiniBar value={health?.memory.used || 0} max={health?.memory.total || 1} color="#818cf8" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#9ca3af' }}>Heap Kullanımı</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{health ? `${health.memory.heap}MB` : '—'}</span>
              </div>
              <MiniBar value={health?.memory.heap || 0} max={health?.memory.used || 1} color="#22c55e" />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af' }}>
              <div>CPU Load: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{health?.cpu.load1 ?? '—'}</span></div>
              <div>Çekirdek: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{health?.cpu.cores ?? '—'}</span></div>
            </div>
          </div>
        </div>

        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '20px', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 16 }}>📈 OYUNCU TRAFİĞİ (SON 20)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
            {history.length === 0 && <div style={{ color: '#4b5563', fontSize: 12 }}>Veri toplanıyor...</div>}
            {history.map((h, i) => {
              const max = Math.max(...history.map(x => x.players), 1)
              const pct = (h.players / max) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', borderRadius: 3, background: `rgba(99,102,241,${0.3 + (pct / 100) * 0.7})`, height: `${Math.max(4, pct)}%`, transition: 'height 0.5s' }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4b5563', marginTop: 6 }}>
            <span>Geçmiş</span>
            <span>Şimdi: {health?.totalPlayers ?? 0} oyuncu</span>
          </div>
        </div>
      </div>

      {/* ACTIVE ROOMS */}
      <div style={{ background: '#0d0d24', borderRadius: 16, padding: '20px', border: '1px solid rgba(99,102,241,0.1)' }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 14 }}>🎮 AKTİF ODALAR</div>
        {!health?.roomList?.length ? (
          <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: 20 }}>Aktif oda yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {health.roomList.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#818cf8' }}>#{r.id?.slice(0, 8)}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>{r.mode}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{r.players} oyuncu</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
