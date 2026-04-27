import { useState } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../firebase/adminService'
import toast from 'react-hot-toast'

const CATALOG = {
  frame: [
    { id: 'silver',  name: 'Gümüş',     icon: '⭕', rarity: 'rare',      color: '#9ca3af' },
    { id: 'gold',    name: 'Altın',      icon: '🔆', rarity: 'rare',      color: '#f59e0b' },
    { id: 'neon',    name: 'Neon',       icon: '💡', rarity: 'epic',      color: '#a78bfa' },
    { id: 'fire',    name: 'Ateş',       icon: '🔥', rarity: 'epic',      color: '#ef4444' },
    { id: 'ice',     name: 'Buz',        icon: '❄️', rarity: 'epic',      color: '#60a5fa' },
    { id: 'diamond', name: 'Elmas',      icon: '💎', rarity: 'legendary', color: '#38bdf8' },
    { id: 'rainbow', name: 'Gökkuşağı', icon: '🌈', rarity: 'legendary', color: '#ec4899' },
    { id: 'galaxy',  name: 'Galaksi',    icon: '🌌', rarity: 'legendary', color: '#818cf8' },
    { id: 'sakura',  name: 'Sakura',     icon: '🌸', rarity: 'legendary', color: '#fda4af' },
    { id: 'void',    name: 'Boşluk',     icon: '🕳️', rarity: 'mythic',    color: '#7c3aed' },
    { id: 'crown',   name: 'Taç',        icon: '👑', rarity: 'mythic',    color: '#fbbf24' },
  ],
  nameEffect: [
    { id: 'glow',     name: 'Parlaklık',  icon: '💫', rarity: 'rare',      color: '#60a5fa' },
    { id: 'sparkle',  name: 'Parıltı',    icon: '✨', rarity: 'rare',      color: '#fbbf24' },
    { id: 'fire',     name: 'Ateş',       icon: '🔥', rarity: 'epic',      color: '#ef4444' },
    { id: 'electric', name: 'Elektrik',   icon: '⚡', rarity: 'epic',      color: '#fbbf24' },
    { id: 'ice',      name: 'Buz',        icon: '❄️', rarity: 'epic',      color: '#38bdf8' },
    { id: 'rainbow',  name: 'Gökkuşağı', icon: '🌈', rarity: 'legendary', color: '#ec4899' },
    { id: 'galaxy',   name: 'Galaksi',    icon: '🌌', rarity: 'legendary', color: '#8b5cf6' },
    { id: 'aurora',   name: 'Aurora',     icon: '🌠', rarity: 'legendary', color: '#06b6d4' },
    { id: 'void',     name: 'Boşluk',     icon: '🕳️', rarity: 'mythic',    color: '#7c3aed' },
    { id: 'phantom',  name: 'Hayalet',    icon: '👻', rarity: 'mythic',    color: '#c4b5fd' },
  ],
  trail: [
    { id: 'sparkle',  name: 'Parıltı',    icon: '✨', rarity: 'rare',      color: '#fbbf24' },
    { id: 'fire',     name: 'Ateş',       icon: '🔥', rarity: 'epic',      color: '#ef4444' },
    { id: 'ice',      name: 'Buz',        icon: '❄️', rarity: 'epic',      color: '#38bdf8' },
    { id: 'electric', name: 'Elektrik',   icon: '⚡', rarity: 'epic',      color: '#fbbf24' },
    { id: 'sakura',   name: 'Sakura',     icon: '🌸', rarity: 'legendary', color: '#f9a8d4' },
    { id: 'galaxy',   name: 'Galaksi',    icon: '🌌', rarity: 'legendary', color: '#818cf8' },
    { id: 'rainbow',  name: 'Gökkuşağı', icon: '🌈', rarity: 'legendary', color: '#ec4899' },
    { id: 'void',     name: 'Boşluk',     icon: '🕳️', rarity: 'mythic',    color: '#7c3aed' },
    { id: 'aurora',   name: 'Aurora',     icon: '🌠', rarity: 'mythic',    color: '#06b6d4' },
  ],
  deathEffect: [
    { id: 'ghost',    name: 'Hayalet',    icon: '👻', rarity: 'rare',      color: '#c4b5fd' },
    { id: 'shatter',  name: 'Parçalan',   icon: '💥', rarity: 'epic',      color: '#f97316' },
    { id: 'dissolve', name: 'Erime',      icon: '💧', rarity: 'epic',      color: '#38bdf8' },
    { id: 'nova',     name: 'Süpernova',  icon: '🌟', rarity: 'legendary', color: '#fbbf24' },
    { id: 'portal',   name: 'Portal',     icon: '🌀', rarity: 'legendary', color: '#8b5cf6' },
    { id: 'void_end', name: 'Boşluğa',    icon: '🕳️', rarity: 'mythic',    color: '#7c3aed' },
  ],
  skin: [
    { id: 'default',  name: 'Varsayılan', icon: '⬤', rarity: 'common',    color: '#6b7280' },
    { id: 'fire',     name: 'Ateş',       icon: '🔥', rarity: 'epic',      color: '#ef4444' },
    { id: 'ice',      name: 'Buz',        icon: '❄️', rarity: 'epic',      color: '#38bdf8' },
    { id: 'galaxy',   name: 'Galaksi',    icon: '🌌', rarity: 'legendary', color: '#818cf8' },
    { id: 'rainbow',  name: 'Gökkuşağı', icon: '🌈', rarity: 'legendary', color: '#ec4899' },
    { id: 'ghost',    name: 'Hayalet',    icon: '👻', rarity: 'epic',      color: '#c4b5fd' },
    { id: 'gold',     name: 'Altın',      icon: '🔆', rarity: 'legendary', color: '#f59e0b' },
    { id: 'void',     name: 'Boşluk',     icon: '🕳️', rarity: 'mythic',    color: '#7c3aed' },
    { id: 'aurora',   name: 'Aurora',     icon: '🌠', rarity: 'mythic',    color: '#06b6d4' },
    { id: 'sakura',   name: 'Sakura',     icon: '🌸', rarity: 'legendary', color: '#fda4af' },
    { id: 'electric', name: 'Elektrik',   icon: '⚡', rarity: 'epic',      color: '#fbbf24' },
    { id: 'neon',     name: 'Neon',       icon: '💡', rarity: 'epic',      color: '#a78bfa' },
  ],
}

const TYPE_LABELS = {
  frame: 'Çerçeve', nameEffect: 'İsim Efekti', trail: 'İz Efekti', deathEffect: 'Ölüm Efekti', skin: 'Skin',
}

const RARITY_COLOR = {
  common: '#94a3b8', rare: '#22c55e', epic: '#818cf8', legendary: '#f59e0b', mythic: '#ec4899',
}

export default function Cosmetics({ user }) {
  const [activeTab, setActiveTab] = useState('frame')
  const [targetUid, setTargetUid] = useState('')
  const [busy, setBusy] = useState(null)

  const give = async (type, itemId, itemName) => {
    if (!targetUid.trim()) return toast.error('Önce oyuncu UID gir')
    setBusy(`${type}:${itemId}`)
    try {
      await adminApi.addCosmetic(targetUid.trim(), type, itemId, user?.uid)
      toast.success(`✨ ${itemName} verildi!`)
    } catch (e) { toast.error(e.message) }
    setBusy(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>✨ Kozmetik Kataloğu</h1>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>Tüm kozmetikleri gör ve oyunculara ver</p>
        </div>
      </div>

      <div style={{ background: '#0d0d24', borderRadius: 16, padding: '18px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', letterSpacing: 2, marginBottom: 10 }}>HEDEF OYUNCU UID</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={targetUid} onChange={e => setTargetUid(e.target.value)} placeholder="Firebase UID — kozmetik bu oyuncuya verilecek"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
          {targetUid && (
            <button onClick={() => setTargetUid('')} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>✕ Temizle</button>
          )}
        </div>
        {targetUid && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#818cf8' }}>
            Hedef: <span style={{ fontWeight: 700 }}>{targetUid.slice(0, 24)}...</span> — herhangi bir kozmetiğe tıkla ve ver
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <button key={type} onClick={() => setActiveTab(type)}
            style={{ padding: '7px 16px', borderRadius: 10, border: `1px solid ${activeTab === type ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, background: activeTab === type ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)', color: activeTab === type ? '#818cf8' : '#6b7280', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {(CATALOG[activeTab] || []).map(item => {
          const rc = RARITY_COLOR[item.rarity] || '#6b7280'
          const isBusy = busy === `${activeTab}:${item.id}`
          return (
            <motion.div key={item.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ background: '#0d0d24', borderRadius: 14, padding: '16px', border: `1px solid ${rc}22`, cursor: 'pointer', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 24, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.color + '18', borderRadius: 10, border: `1px solid ${item.color}33` }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>{item.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: rc, textTransform: 'uppercase' }}>{item.rarity}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace', marginBottom: 10, background: 'rgba(255,255,255,0.04)', padding: '3px 6px', borderRadius: 5 }}>ID: {item.id}</div>
              <button disabled={isBusy || !targetUid} onClick={() => give(activeTab, item.id, item.name)}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${targetUid ? rc + '55' : 'rgba(255,255,255,0.06)'}`, background: targetUid ? rc + '18' : 'rgba(255,255,255,0.03)', color: targetUid ? rc : '#4b5563', fontWeight: 700, fontSize: 11, cursor: targetUid && !isBusy ? 'pointer' : 'not-allowed', opacity: !targetUid ? 0.4 : 1 }}>
                {isBusy ? '⏳ Veriliyor...' : targetUid ? '🎁 Ver' : 'UID gir'}
              </button>
            </motion.div>
          )
        })}
      </div>

      <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 12, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, color: '#818cf8' }}>
        💡 Oyuncu UID'yi Oyuncular sayfasından kopyalayabilirsin. Her kozmetik otomatik olarak Firebase envanterine eklenir.
      </div>
    </div>
  )
}
