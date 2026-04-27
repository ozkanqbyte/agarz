import { useState } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

export default function Economy({ user }) {
  const [bulkAmount, setBulkAmount] = useState(100)
  const [singleUid, setSingleUid] = useState('')
  const [singleAmount, setSingleAmount] = useState(500)
  const [busy, setBusy] = useState(false)

  const doAction = async (fn, msg) => {
    setBusy(true)
    try { await fn(); toast.success(msg) } catch (e) { toast.error(e.message) }
    setBusy(false)
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', marginBottom: 6 }}>💰 Ekonomi Yönetimi</h1>
      <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 24 }}>Oyuncu coin sistemini yönet</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* BULK COINS */}
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '24px', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#fbbf24', marginBottom: 4 }}>🌍 Tüm Oyunculara Coin Ver</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 18 }}>Sisteme kayıtlı tüm oyunculara eşit miktarda coin gönder</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="number" value={bulkAmount} onChange={e => setBulkAmount(Number(e.target.value))}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[50, 100, 250, 500, 1000].map(v => (
                <button key={v} onClick={() => setBulkAmount(v)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${bulkAmount === v ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.08)'}`, background: bulkAmount === v ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', color: bulkAmount === v ? '#fbbf24' : '#6b7280', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                  {v}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} disabled={busy}
              onClick={() => { if (confirm(`Tüm oyunculara ${bulkAmount} coin verilecek. Onaylıyor musun?`)) doAction(() => adminApi.giveCoinsAll(bulkAmount, user?.uid), `Tüm oyunculara ${bulkAmount} coin verildi!`) }}
              style={{ padding: '11px', borderRadius: 12, border: 'none', background: busy ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.25)', color: '#fbbf24', fontWeight: 800, fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer', border: '1px solid rgba(251,191,36,0.3)' }}>
              {busy ? '⏳ İşleniyor...' : `💰 ${bulkAmount} Coin Herkese Ver`}
            </motion.button>
          </div>
        </div>

        {/* SINGLE PLAYER COINS */}
        <div style={{ background: '#0d0d24', borderRadius: 16, padding: '24px', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#818cf8', marginBottom: 4 }}>👤 Tek Oyuncuya Coin Ver</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 18 }}>Belirli bir oyuncunun coin miktarını değiştir (negatif = al)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={singleUid} onChange={e => setSingleUid(e.target.value)} placeholder="Oyuncu UID"
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
            <input type="number" value={singleAmount} onChange={e => setSingleAmount(Number(e.target.value))
            } placeholder="Miktar"
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
            <motion.button whileTap={{ scale: 0.97 }} disabled={busy || !singleUid}
              onClick={() => doAction(() => adminApi.giveCoins(singleUid, singleAmount, user?.uid), `${singleAmount > 0 ? '+' : ''}${singleAmount} coin!`)}
              style={{ padding: '11px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 800, fontSize: 13, cursor: busy || !singleUid ? 'not-allowed' : 'pointer', opacity: !singleUid ? 0.5 : 1 }}>
              {busy ? '⏳ İşleniyor...' : singleAmount >= 0 ? '💰 Coin Ver' : '💸 Coin Al'}
            </motion.button>
          </div>
        </div>

        {/* ECONOMY INFO */}
        <div style={{ gridColumn: '1/-1', background: '#0d0d24', borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#6b7280', letterSpacing: 2, marginBottom: 14 }}>💡 EKONOMİ NOTLARI</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12, color: '#9ca3af' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>Coin Kazanma Yolları</div>
              Yemek yemek (+1), Düşman yemek (+10), Virus (+5), Sandık (30-2000), BP ödülleri
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 4 }}>Coin Harcama Yolları</div>
              Sandık açma (50-1000), Kozmetik satın alma (150-4000), İsim efekti (150-2500)
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>Güvenli Aralık</div>
              Tek seferde tüm oyunculara max 500 coin ver. Enflasyon yaratmamak için dikkatli ol.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
