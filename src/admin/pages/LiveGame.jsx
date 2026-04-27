import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

export default function LiveGame({ user }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [busy, setBusy] = useState({})
  const intervalRef = useRef()

  const fetch = async () => {
    try { const h = await adminApi.health(); setHealth(h); setLoading(false) } catch { setLoading(false) }
  }

  useEffect(() => {
    fetch()
    intervalRef.current = setInterval(fetch, 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const doAction = async (uid, fn, msg) => {
    setBusy(b => ({ ...b, [uid]: true }))
    try { await fn(); toast.success(msg) } catch (e) { toast.error(e.message) }
    setBusy(b => ({ ...b, [uid]: false }))
    await fetch()
  }

  const rooms = health?.roomList || []
  const displayRoom = selectedRoom ? rooms.find(r => r.id === selectedRoom) : rooms[0]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>🎮 Canlı Oyun</h1>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>{health?.rooms ?? 0} oda · {health?.totalPlayers ?? 0} aktif oyuncu</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>5s AUTO-REFRESH</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
        {/* ROOM LIST */}
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '14px', border: '1px solid rgba(99,102,241,0.1)', height: 'fit-content' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', letterSpacing: 2, marginBottom: 10 }}>ODALAR</div>
          {rooms.length === 0 ? (
            <div style={{ color: '#4b5563', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Aktif oda yok</div>
          ) : rooms.map(r => (
            <button key={r.id} onClick={() => setSelectedRoom(r.id)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${selectedRoom === r.id || (!selectedRoom && rooms[0]?.id === r.id) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`, background: selectedRoom === r.id || (!selectedRoom && rooms[0]?.id === r.id) ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', color: '#e2e8f0', cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#818cf8' }}>#{r.id?.slice(0, 8)}</div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginTop: 2 }}>{r.mode} · {r.players} oyuncu</div>
            </button>
          ))}
        </div>

        {/* PLAYER LIST */}
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '20px', border: '1px solid rgba(99,102,241,0.1)' }}>
          {!displayRoom ? (
            <div style={{ color: '#4b5563', fontSize: 14, textAlign: 'center', padding: 40 }}>Oda seçin</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#818cf8' }}>#{displayRoom.id?.slice(0, 12)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>{displayRoom.mode} Modu</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13 }}>{displayRoom.players} / 20</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                      {['Oyuncu', 'Mass', 'Pozisyon', 'Team', 'Kills', 'İşlem'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#6b7280', fontSize: 10, letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(displayRoom.playerList || []).map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#e2e8f0' }}>{p.name}</td>
                        <td style={{ padding: '10px 12px', color: '#fbbf24', fontWeight: 700 }}>{p.mass?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11 }}>{p.x}, {p.y}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {p.team && p.team !== 'none' && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: p.team === 'red' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: p.team === 'red' ? '#ef4444' : '#60a5fa', fontSize: 10, fontWeight: 800 }}>{p.team.toUpperCase()}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#ef4444', fontWeight: 700 }}>{p.kills}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button disabled={!!busy[p.id]} onClick={() => doAction(p.id, () => adminApi.kick(p.id, 'Admin kararı'), `${p.name} atıldı`)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                              👢 Kick
                            </button>
                            <button disabled={!!busy[p.id]} onClick={() => doAction(p.id, () => adminApi.freeze(p.id, true), `${p.name} donduruldu`)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                              ❄️ Dondur
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
