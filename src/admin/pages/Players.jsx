import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

const PREMIUM_PACKAGES = ['free','starter','player','pro','elite','champion','master','legend','immortal']

function Badge({ children, color }) {
  return <span style={{ padding: '2px 8px', borderRadius: 6, background: color + '22', color, fontSize: 10, fontWeight: 800, border: `1px solid ${color}44` }}>{children}</span>
}

export default function Players({ user }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [coinAmount, setCoinAmount] = useState(100)
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('permanent')
  const [selectedPkg, setSelectedPkg] = useState('free')
  const [cosmeticType, setCosmeticType] = useState('frame')
  const [cosmeticId, setCosmeticId] = useState('')

  const load = async () => {
    setLoading(true)
    try { const d = await adminApi.players(); setPlayers(d.players || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.uid?.includes(search)
  )

  const action = async (fn, successMsg) => {
    setBusy(true)
    try { await fn(); toast.success(successMsg); await load(); setModal(null) }
    catch (e) { toast.error(e.message) }
    setBusy(false)
  }

  const openModal = (type, player) => { setSelected(player); setModal(type); setBanReason(''); setSelectedPkg(player.premium || 'free') }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>👥 Oyuncular</h1>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>{players.length} kayıtlı kullanıcı</p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🔄 Yenile</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim, e-posta veya UID ara..."
          style={{ width: '100%', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)', background: '#0d0d24', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
      </div>

      <div style={{ background: '#0d0d24', borderRadius: 16, border: '1px solid rgba(99,102,241,0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                {['Oyuncu','Seviye','Coin','Score','Kills','Premium','Durum','İşlemler'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#6b7280', letterSpacing: 1, fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#4b5563' }}>Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#4b5563' }}>Sonuç bulunamadı</td></tr>
              ) : filtered.map(p => (
                <tr key={p.uid} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.color || '#6366f1', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{p.name}</div>
                        <div style={{ color: '#4b5563', fontSize: 10 }}>{p.email || p.uid?.slice(0, 12)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#818cf8', fontWeight: 700 }}>Lv{p.level}</td>
                  <td style={{ padding: '12px 14px', color: '#fbbf24', fontWeight: 700 }}>{p.coins?.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>{p.highScore?.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', color: '#ef4444' }}>{p.totalKills}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <Badge color={p.premium !== 'free' ? '#fbbf24' : '#6b7280'}>{p.premium === 'free' ? 'Ücretsiz' : p.premium?.toUpperCase()}</Badge>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {p.banned ? <Badge color="#ef4444">BANLI</Badge> : <Badge color="#22c55e">AKTİF</Badge>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!p.banned
                        ? <Btn color="#ef4444" onClick={() => openModal('ban', p)}>🚫 Ban</Btn>
                        : <Btn color="#22c55e" onClick={() => action(() => adminApi.unban(p.uid, user?.uid), 'Ban kaldırıldı!')}>✓ Unban</Btn>}
                      <Btn color="#fbbf24" onClick={() => openModal('coins', p)}>💰</Btn>
                      <Btn color="#818cf8" onClick={() => openModal('premium', p)}>⭐</Btn>
                      <Btn color="#06b6d4" onClick={() => openModal('cosmetic', p)}>✨</Btn>
                      <Btn color="#f97316" onClick={() => action(() => adminApi.kick(p.uid, 'Admin'), 'Oyuncu atıldı!')}>👢</Btn>
                      <Btn color="#dc2626" onClick={() => { if (confirm(`${p.name} hesabını SİL?`)) action(() => adminApi.deletePlayer(p.uid, user?.uid), 'Hesap silindi!') }}>🗑</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {modal && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
            onClick={e => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              style={{ background: '#0d0d24', borderRadius: 20, padding: '28px', width: 380, border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#e2e8f0', marginBottom: 4 }}>
                {modal === 'ban' && '🚫 Kullanıcıyı Banla'}
                {modal === 'coins' && '💰 Coin Ver / Al'}
                {modal === 'premium' && '⭐ Premium Ver'}
                {modal === 'cosmetic' && '✨ Kozmetik Ver'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>{selected.name} · {selected.email}</div>

              {modal === 'ban' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban nedeni"
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
                  <select value={banDuration} onChange={e => setBanDuration(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: '#131330', color: '#e2e8f0', fontSize: 13 }}>
                    <option value="1h">1 Saat</option>
                    <option value="24h">1 Gün</option>
                    <option value="7d">7 Gün</option>
                    <option value="30d">30 Gün</option>
                    <option value="permanent">Kalıcı</option>
                  </select>
                  <Btn color="#ef4444" full disabled={busy} onClick={() => action(() => adminApi.ban(selected.uid, banReason, banDuration, user?.uid), `${selected.name} banlandı!`)}>
                    {busy ? 'İşleniyor...' : '🚫 Banla'}
                  </Btn>
                </div>
              )}

              {modal === 'coins' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="number" value={coinAmount} onChange={e => setCoinAmount(Number(e.target.value))} placeholder="Coin miktarı (negatif = al)"
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Mevcut: {selected.coins?.toLocaleString()} coin</div>
                  <Btn color="#fbbf24" full disabled={busy} onClick={() => action(() => adminApi.giveCoins(selected.uid, coinAmount, user?.uid), `${coinAmount > 0 ? '+' : ''}${coinAmount} coin verildi!`)}>
                    {busy ? 'İşleniyor...' : `💰 ${coinAmount > 0 ? 'Ver' : 'Al'}`}
                  </Btn>
                </div>
              )}

              {modal === 'premium' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <select value={selectedPkg} onChange={e => setSelectedPkg(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.3)', background: '#131330', color: '#e2e8f0', fontSize: 13 }}>
                    {PREMIUM_PACKAGES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                  <Btn color="#fbbf24" full disabled={busy} onClick={() => action(() => adminApi.setPremium(selected.uid, selectedPkg, user?.uid), `Premium: ${selectedPkg}`)}>
                    {busy ? 'İşleniyor...' : '⭐ Premium Ver'}
                  </Btn>
                </div>
              )}

              {modal === 'cosmetic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <select value={cosmeticType} onChange={e => setCosmeticType(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: '#131330', color: '#e2e8f0', fontSize: 13 }}>
                    <option value="frame">Çerçeve</option>
                    <option value="nameEffect">İsim Efekti</option>
                    <option value="trail">İz Efekti</option>
                    <option value="deathEffect">Ölüm Efekti</option>
                    <option value="skin">Skin</option>
                  </select>
                  <input value={cosmeticId} onChange={e => setCosmeticId(e.target.value)} placeholder="Kozmetik ID (örn: galaxy, fire...)"
                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
                  <Btn color="#818cf8" full disabled={busy || !cosmeticId} onClick={() => action(() => adminApi.addCosmetic(selected.uid, cosmeticType, cosmeticId, user?.uid), `Kozmetik eklendi!`)}>
                    {busy ? 'İşleniyor...' : '✨ Kozmetik Ver'}
                  </Btn>
                </div>
              )}

              <button onClick={() => setModal(null)} style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>İptal</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Btn({ children, color, onClick, disabled, full }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: full ? '10px 0' : '6px 8px', borderRadius: 8, border: `1px solid ${color}44`, background: color + '18', color, fontWeight: 700, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer', width: full ? '100%' : 'auto', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}
