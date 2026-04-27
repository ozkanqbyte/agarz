import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

const CONFIG_META = {
  MERGE_TIME:  { label: 'Birleşme Süresi', unit: 'ms', desc: 'Hücrelerin birleşmesi için gereken süre', min: 5000, max: 60000, default: 15000 },
  MERGE_FADE:  { label: 'Birleşme Animasyonu', unit: 'ms', desc: 'Birleşme animasyonunun uzunluğu', min: 100, max: 3000, default: 500 },
  SPLIT_SPEED: { label: 'Bölünme Hızı', unit: 'px/s', desc: 'Space ile bölünme fırlatma hızı', min: 200, max: 2000, default: 780 },
}

export default function ServerConfig({ user }) {
  const [config, setConfig] = useState({})
  const [pending, setPending] = useState({})
  const [busy, setBusy] = useState({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const d = await adminApi.config(); setConfig(d); setLoading(false) } catch { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async (key) => {
    if (pending[key] === undefined) return
    setBusy(b => ({ ...b, [key]: true }))
    try {
      await adminApi.setConfig(key, pending[key], user?.uid)
      setConfig(c => ({ ...c, [key]: pending[key] }))
      setPending(p => { const n = { ...p }; delete n[key]; return n })
      toast.success(`${CONFIG_META[key]?.label || key} güncellendi!`)
    } catch (e) { toast.error(e.message) }
    setBusy(b => ({ ...b, [key]: false }))
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', marginBottom: 6 }}>⚙️ Sunucu Ayarları</h1>
      <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 24 }}>Oyun parametrelerini gerçek zamanlı değiştir</p>

      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#fbbf24' }}>
        ⚠️ Değişiklikler anlık geçerli olur. Mevcut oyuncular etkilenebilir. Dikkatli ol!
      </div>

      {loading ? (
        <div style={{ color: '#4b5563', textAlign: 'center', padding: 40 }}>Yükleniyor...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(CONFIG_META).map(([key, meta]) => {
            const current = config[key] ?? meta.default
            const val = pending[key] ?? current
            const changed = pending[key] !== undefined && pending[key] !== current
            return (
              <motion.div key={key} style={{ background: '#0d0d24', borderRadius: 16, padding: '20px', border: `1px solid ${changed ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.1)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{meta.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#4b5563', textAlign: 'right' }}>
                      <div>Mevcut: <span style={{ color: '#818cf8', fontWeight: 700 }}>{current}</span></div>
                      <div style={{ fontSize: 10 }}>Varsayılan: {meta.default}</div>
                    </div>
                    {changed && (
                      <motion.button whileTap={{ scale: 0.95 }} disabled={!!busy[key]} onClick={() => save(key)}
                        style={{ padding: '7px 16px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                        {busy[key] ? '⏳' : '💾 Kaydet'}
                      </motion.button>
                    )}
                    {changed && (
                      <button onClick={() => setPending(p => { const n = { ...p }; delete n[key]; return n })}
                        style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
                        ↩ Sıfırla
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="range" min={meta.min} max={meta.max} step={key === 'SPLIT_SPEED' ? 10 : 100} value={val}
                    onChange={e => setPending(p => ({ ...p, [key]: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#6366f1' }} />
                  <input type="number" value={val} min={meta.min} max={meta.max}
                    onChange={e => setPending(p => ({ ...p, [key]: Number(e.target.value) }))}
                    style={{ width: 90, padding: '6px 10px', borderRadius: 8, border: `1px solid ${changed ? 'rgba(251,191,36,0.4)' : 'rgba(99,102,241,0.2)'}`, background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none', textAlign: 'center', fontWeight: 700 }} />
                  <span style={{ fontSize: 11, color: '#6b7280', width: 30 }}>{meta.unit}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
