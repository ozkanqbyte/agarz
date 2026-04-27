import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

const TYPES = [
  { id: 'info', label: 'Bilgi', color: '#60a5fa', icon: 'ℹ️' },
  { id: 'warning', label: 'Uyarı', color: '#fbbf24', icon: '⚠️' },
  { id: 'success', label: 'Başarı', color: '#22c55e', icon: '✅' },
  { id: 'event', label: 'Etkinlik', color: '#a78bfa', icon: '🎉' },
  { id: 'maintenance', label: 'Bakım', color: '#ef4444', icon: '🔧' },
]

export default function Announcements({ user }) {
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [targetUid, setTargetUid] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])

  const loadHistory = async () => {
    try { const d = await adminApi.announcements(); setHistory(d.announcements || []) } catch {}
  }

  useEffect(() => { loadHistory() }, [])

  const send = async () => {
    if (!message.trim()) return toast.error('Mesaj boş olamaz')
    setBusy(true)
    try {
      await adminApi.announce(message, targetUid || null, type, user?.uid)
      toast.success(targetUid ? 'Mesaj gönderildi!' : 'Tüm sunucuya duyuru gönderildi!')
      setMessage('')
      setTargetUid('')
      await loadHistory()
    } catch (e) { toast.error(e.message) }
    setBusy(false)
  }

  const selectedType = TYPES.find(t => t.id === type) || TYPES[0]

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', marginBottom: 6 }}>📢 Duyurular</h1>
      <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 24 }}>Oyunculara anlık sunucu mesajı gönder</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '24px', border: '1px solid rgba(99,102,241,0.1)' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 16 }}>YENİ DUYURU</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>TÜR</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${type === t.id ? t.color + '88' : 'rgba(255,255,255,0.06)'}`, background: type === t.id ? t.color + '22' : 'rgba(255,255,255,0.03)', color: type === t.id ? t.color : '#6b7280', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>HEDEF (boş = tüm sunucu)</label>
            <input value={targetUid} onChange={e => setTargetUid(e.target.value)} placeholder="Oyuncu UID (opsiyonel)"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 }}>MESAJ</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Duyuru mesajını buraya yaz..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)', color: '#e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {message && (
            <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: selectedType.color + '11', border: `1px solid ${selectedType.color}33` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: selectedType.color, marginBottom: 4 }}>{selectedType.icon} {targetUid ? `ÖZEL MESAJ → ${targetUid.slice(0, 12)}...` : 'SUNUCU DUYURUSU'}</div>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{message}</div>
            </div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !message.trim()} onClick={send}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: busy ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: busy || !message.trim() ? 'not-allowed' : 'pointer', opacity: !message.trim() ? 0.5 : 1 }}>
            {busy ? '⏳ Gönderiliyor...' : targetUid ? '📨 Özel Mesaj Gönder' : '📢 Tüm Sunucuya Gönder'}
          </motion.button>
        </div>

        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '24px', border: '1px solid rgba(99,102,241,0.1)', overflowY: 'auto', maxHeight: 500 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 16 }}>GEÇMİŞ DUYURULAR</div>
          {history.length === 0 ? (
            <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: 20 }}>Henüz duyuru gönderilmedi</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(a => {
                const t = TYPES.find(x => x.id === a.type) || TYPES[0]
                return (
                  <div key={a.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${t.color}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{t.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: t.color }}>{t.label.toUpperCase()}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4b5563' }}>{new Date(a.ts).toLocaleString('tr-TR')}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{a.message}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
