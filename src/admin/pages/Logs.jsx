import { useState, useEffect } from 'react'
import { adminApi } from '../../firebase/adminService'

const ACTION_META = {
  ban:          { icon: '🚫', color: '#ef4444', label: 'Ban' },
  unban:        { icon: '✅', color: '#22c55e', label: 'Unban' },
  delete_player:{ icon: '🗑️', color: '#dc2626', label: 'Hesap Sil' },
  give_coins:   { icon: '💰', color: '#fbbf24', label: 'Coin Ver' },
  give_coins_all:{ icon: '💰', color: '#f59e0b', label: 'Toplu Coin' },
  set_premium:  { icon: '⭐', color: '#a78bfa', label: 'Premium' },
  add_cosmetic: { icon: '✨', color: '#818cf8', label: 'Kozmetik' },
  kick:         { icon: '👢', color: '#f97316', label: 'Kick' },
  announce:     { icon: '📢', color: '#60a5fa', label: 'Duyuru' },
  config_change:{ icon: '⚙️', color: '#9ca3af', label: 'Config' },
  set_role:     { icon: '🛡️', color: '#c084fc', label: 'Rol' },
  freeze:       { icon: '❄️', color: '#38bdf8', label: 'Dondur' },
}

export default function Logs({ user }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try { const d = await adminApi.logs(); setLogs(d.logs || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>📋 Log Kayıtları</h1>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>Tüm admin işlemleri burada kayıtlıdır</p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🔄 Yenile</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <FilterBtn id="all" active={filter} setFilter={setFilter} label="Tümü" color="#6b7280" />
        {Object.entries(ACTION_META).map(([id, m]) => (
          <FilterBtn key={id} id={id} active={filter} setFilter={setFilter} label={m.label} color={m.color} />
        ))}
      </div>

      <div style={{ background: '#0d0d24', borderRadius: 16, border: '1px solid rgba(99,102,241,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4b5563' }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4b5563' }}>Log bulunamadı</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                  {['İşlem', 'Admin', 'Detay', 'Zaman'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#6b7280', fontSize: 10, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const meta = ACTION_META[log.action] || { icon: '•', color: '#6b7280', label: log.action }
                  return (
                    <tr key={log.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '3px 8px', borderRadius: 6, background: meta.color + '18', border: `1px solid ${meta.color}33`, color: meta.color, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {meta.icon} {meta.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{log.adminUid?.slice(0, 12)}...</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: 250 }}>
                        {log.details && Object.entries(log.details).map(([k, v]) => (
                          <span key={k} style={{ marginRight: 8 }}>
                            <span style={{ color: '#4b5563' }}>{k}:</span>{' '}
                            <span style={{ color: '#9ca3af' }}>{String(v).slice(0, 30)}</span>
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        {new Date(log.ts).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterBtn({ id, active, setFilter, label, color }) {
  return (
    <button onClick={() => setFilter(id)}
      style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${active === id ? color + '66' : 'rgba(255,255,255,0.06)'}`, background: active === id ? color + '18' : 'rgba(255,255,255,0.03)', color: active === id ? color : '#6b7280', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
      {label}
    </button>
  )
}
