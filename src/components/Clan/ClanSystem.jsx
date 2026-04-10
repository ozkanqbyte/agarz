import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ref, set, onValue, remove, update } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import useProgressStore from '../../store/useProgressStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

const CLAN_RANKS = {
  leader:    { label: 'Lider',     letter: 'L', color: '#f59e0b', glow: '245,158,11',   power: 100, badge: 'ALTIN',  desc: 'Klanin sahibi. Tam kontrol.',       canPromote: true,  canKick: true,  canEdit: true  },
  co_leader: { label: 'Yardimci', letter: 'Y', color: '#a78bfa', glow: '167,139,250',  power: 70,  badge: 'MOR',    desc: 'Uye yonetimi ve rutbe atama.',     canPromote: true,  canKick: true,  canEdit: false },
  elder:     { label: 'Yasli',    letter: 'V', color: '#06b6d4', glow: '6,182,212',    power: 50,  badge: 'CYAN',   desc: 'Guvenilir deneyimli uye.',         canPromote: false, canKick: false, canEdit: false },
  member:    { label: 'Uye',      letter: 'U', color: '#6b7280', glow: '107,114,128',  power: 10,  badge: 'GRI',    desc: 'Standart klan uyesi.',             canPromote: false, canKick: false, canEdit: false },
}

const CLAN_COLORS = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e',
  '#10b981','#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#6366f1',
  '#8b5cf6','#a855f7','#ec4899','#f43f5e','#64748b','#94a3b8',
]

function RankBadge({ rank, size = 'md', animated = false }) {
  const info = CLAN_RANKS[rank] || CLAN_RANKS.member
  const sizes = {
    sm: { w: 28, h: 28, fs: 11, border: 1.5, radius: 7 },
    md: { w: 40, h: 40, fs: 15, border: 2,   radius: 10 },
    lg: { w: 56, h: 56, fs: 20, border: 2.5, radius: 14 },
  }
  const s = sizes[size] || sizes.md
  return (
    <motion.div
      animate={animated ? {
        boxShadow: [
          `0 0 8px rgba(${info.glow},0.4)`,
          `0 0 22px rgba(${info.glow},0.9)`,
          `0 0 8px rgba(${info.glow},0.4)`,
        ]
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: s.w, height: s.h, borderRadius: s.radius,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, rgba(${info.glow},0.3), rgba(${info.glow},0.1))`,
        border: `${s.border}px solid rgba(${info.glow},0.7)`,
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, rgba(${info.glow},0.18) 0%, transparent 60%)`
      }} />
      <span style={{
        fontSize: s.fs, fontWeight: 900, color: info.color,
        letterSpacing: 1, lineHeight: 1, position: 'relative', zIndex: 1,
        textShadow: `0 0 8px rgba(${info.glow},0.8)`,
      }}>{info.letter}</span>
    </motion.div>
  )
}

function AvatarCircle({ name, color, size = 44 }) {
  const initial = (name || '?')[0].toUpperCase()
  const bg = color || '#4b5563'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 35% 35%, ${bg}ee, ${bg}66)`,
      border: `2px solid ${bg}99`,
      boxShadow: `0 0 14px ${bg}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 900, color: '#fff',
      textShadow: '0 2px 6px rgba(0,0,0,0.5)',
    }}>
      {initial}
    </div>
  )
}

export default function ClanSystem() {
  const { user, profile, updateProfile } = useAuthStore()
  const { currentTheme } = useGameStore()
  const { level } = useProgressStore()
  const theme = getTheme(currentTheme)
  const navigate = useNavigate()

  const [tab, setTab] = useState('my')
  const [clans, setClans] = useState([])
  const [myClan, setMyClan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newClanName, setNewClanName] = useState('')
  const [newClanTag, setNewClanTag] = useState('')
  const [newClanDesc, setNewClanDesc] = useState('')
  const [newClanColor, setNewClanColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [adminTab, setAdminTab] = useState('members')
  const [editingClan, setEditingClan] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editColor, setEditColor] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [superAdminClan, setSuperAdminClan] = useState(null)

  const isSuperAdmin = profile?.isGod === true

  useEffect(() => {
    const clansRef = ref(db, 'clans')
    const unsub = onValue(clansRef, (snap) => {
      if (!snap.exists()) { setClans([]); return }
      const data = Object.entries(snap.val()).map(([id, c]) => ({ id, ...c }))
      setClans(data)
      if (profile?.clan) {
        const found = data.find(c => c.tag === profile.clan || c.id === profile.clan)
        setMyClan(found || null)
      } else {
        setMyClan(null)
      }
    }, (err) => { console.warn('Clan read error:', err?.code) })
    return () => unsub()
  }, [profile?.clan])

  const myRank = myClan?.members?.[user?.uid]?.rank || 'member'
  const myRankInfo = CLAN_RANKS[myRank] || CLAN_RANKS.member
  const isLeader = myRank === 'leader'
  const canManage = myRankInfo.canPromote || isSuperAdmin

  const createClan = async () => {
    if (!newClanName.trim() || !newClanTag.trim()) { toast.error('Isim ve etiket gerekli!'); return }
    if (newClanTag.length > 5) { toast.error('Etiket max 5 karakter!'); return }
    if (profile?.clan) { toast.error('Zaten bir klandasin!'); return }
    setLoading(true)
    const clanId = uuidv4().slice(0, 12)
    const clanData = {
      id: clanId,
      name: newClanName.trim(),
      tag: newClanTag.toUpperCase().trim(),
      description: newClanDesc.trim() || 'Yeni bir klan!',
      color: newClanColor,
      leader: user.uid,
      leaderName: profile?.name || 'Lider',
      members: {
        [user.uid]: { uid: user.uid, name: profile?.name || 'Oyuncu', rank: 'leader', joinedAt: Date.now(), level: level || 1 }
      },
      xp: 0, level: 1, createdAt: Date.now(), open: true, minLevel: 1
    }
    try {
      await set(ref(db, `clans/${clanId}`), clanData)
      await updateProfile({ clan: newClanTag.toUpperCase() })
      toast.success('Klan olusturuldu!')
      setCreating(false)
      setNewClanName(''); setNewClanTag(''); setNewClanDesc('')
    } catch (e) { toast.error('Klan olusturulamadi: ' + (e?.message || 'Hata')) }
    setLoading(false)
  }

  const joinClan = async (clan) => {
    if (profile?.clan) { toast.error('Once mevcut klandan ayril!'); return }
    setLoading(true)
    try {
      await update(ref(db, `clans/${clan.id}/members/${user.uid}`), {
        uid: user.uid, name: profile?.name || 'Oyuncu', rank: 'member', joinedAt: Date.now(), level: level || 1
      })
      await updateProfile({ clan: clan.tag })
      toast.success(`${clan.name} klanina katildin!`)
    } catch (e) { toast.error('Katilma basarisiz: ' + (e?.message || 'Hata')) }
    setLoading(false)
  }

  const leaveClan = async () => {
    if (!myClan) return
    if (isLeader && Object.keys(myClan.members || {}).length > 1) { toast.error('Once liderligi devret!'); return }
    try {
      await remove(ref(db, `clans/${myClan.id}/members/${user.uid}`))
      if (Object.keys(myClan.members || {}).length <= 1) {
        await remove(ref(db, `clans/${myClan.id}`))
      }
    } catch {}
    await updateProfile({ clan: null })
    setMyClan(null)
    toast.success('Klandan ayrildin.')
  }

  const kickMember = async (memberId, targetClan = myClan) => {
    const memberRank = targetClan?.members?.[memberId]?.rank
    if (memberRank === 'leader' && !isSuperAdmin) { toast.error('Lideri atamazsin!'); return }
    if (memberRank === 'co_leader' && !isLeader && !isSuperAdmin) { toast.error('Yardimciyi sadece lider atar!'); return }
    try {
      await remove(ref(db, `clans/${targetClan.id}/members/${memberId}`))
      toast.success('Uye atildi.')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const promoteRank = async (memberId, newRank, targetClan = myClan) => {
    const memberRank = targetClan?.members?.[memberId]?.rank
    if (memberRank === 'leader' && !isSuperAdmin) { toast.error('Lider degistirilemez bu sekilde!'); return }
    if (newRank === 'leader' && !isSuperAdmin) { toast.error('Lider ataması icin devir kullan!'); return }
    try {
      await update(ref(db, `clans/${targetClan.id}/members/${memberId}`), { rank: newRank })
      toast.success('Rutbe guncellendi!')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const transferLeadership = async () => {
    if (!transferTo || (!isLeader && !isSuperAdmin)) return
    try {
      await update(ref(db, `clans/${myClan.id}/members/${transferTo}`), { rank: 'leader' })
      await update(ref(db, `clans/${myClan.id}/members/${user.uid}`), { rank: 'co_leader' })
      await update(ref(db, `clans/${myClan.id}`), { leader: transferTo, leaderName: myClan.members?.[transferTo]?.name || '?' })
      toast.success('Liderlik devredildi!')
      setTransferTo('')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const saveEditClan = async (targetClan = myClan) => {
    try {
      const updates = {}
      if (editName.trim()) updates.name = editName.trim()
      if (editDesc.trim()) updates.description = editDesc.trim()
      if (editColor) updates.color = editColor
      await update(ref(db, `clans/${targetClan.id}`), updates)
      toast.success('Klan guncellendi!')
      setEditingClan(false)
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const disbandClan = async (targetClan = myClan) => {
    if (!confirm('Klani silmek istedigine emin misin? Bu islem geri alinamaz!')) return
    try {
      await remove(ref(db, `clans/${targetClan.id}`))
      if (targetClan.id === myClan?.id) {
        await updateProfile({ clan: null })
        setMyClan(null)
      }
      toast.success('Klan dagirildi.')
      setSuperAdminClan(null)
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const filteredClans = clans.filter(c =>
    !profile?.clan &&
    (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     c.tag?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const panelStyle = {
    background: 'rgba(8,8,20,0.92)',
    border: `1px solid rgba(${theme.glowColor},0.2)`,
    backdropFilter: 'blur(20px)',
  }
  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid rgba(${theme.glowColor},0.25)`,
    color: '#fff', padding: '10px 14px', borderRadius: 10, outline: 'none', width: '100%', fontSize: 13
  }

  const TABS = [
    { id: 'my', label: 'KLANIM' },
    { id: 'browse', label: 'KESFET' },
    { id: 'ranks', label: 'RUTBELER' },
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'SUPER ADMIN' }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg,#050510 0%,#0d0d20 50%,#050514 100%)' }}>
      <div className="flex items-center gap-4 px-6 py-4 border-b" style={{ background: 'rgba(5,5,15,0.95)', borderColor: `rgba(${theme.glowColor},0.15)`, backdropFilter: 'blur(20px)' }}>
        <button onClick={() => navigate('/menu')} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          Geri
        </button>
        <motion.span
          animate={{ textShadow: [`0 0 10px rgba(${theme.glowColor},0.5)`, `0 0 25px rgba(${theme.glowColor},0.9)`, `0 0 10px rgba(${theme.glowColor},0.5)`] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>
          KLAN SISTEMI
        </motion.span>
        {isSuperAdmin && (
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>
            SUPER ADMIN
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid rgba(${theme.glowColor},0.12)`, background: 'rgba(5,5,15,0.8)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.id ? theme.uiAccent : '#4b5563', fontWeight: 900, fontSize: 10, letterSpacing: 1.5,
              borderBottom: tab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
              transition: 'all 0.2s',
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {tab === 'my' && (
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!profile?.clan ? (
              <>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-8 text-center" style={panelStyle}>
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
                    style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, margin: '0 auto 16px', boxShadow: `0 0 28px rgba(${theme.glowColor},0.5)` }} />
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Henuz bir klana uye degilsin</div>
                  <div style={{ color: '#4b5563', fontSize: 13, marginBottom: 20 }}>Klan kur veya mevcut bir klana katil</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <motion.button onClick={() => setCreating(v => !v)} whileHover={{ scale: 1.04, boxShadow: `0 0 25px rgba(${theme.glowColor},0.5)` }} whileTap={{ scale: 0.96 }}
                      style={{ padding: '12px 28px', borderRadius: 14, fontWeight: 900, color: '#fff', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, fontSize: 14 }}>
                      + Klan Kur
                    </motion.button>
                    <motion.button onClick={() => setTab('browse')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      style={{ padding: '12px 28px', borderRadius: 14, fontWeight: 700, border: `1px solid rgba(${theme.glowColor},0.3)`, color: '#e2e8f0', background: `rgba(${theme.glowColor},0.08)`, cursor: 'pointer', fontSize: 14 }}>
                      Kesfet
                    </motion.button>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {creating && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl p-6" style={panelStyle}>
                      <div style={{ fontWeight: 900, color: '#fff', marginBottom: 16, fontSize: 16, letterSpacing: 1 }}>YENI KLAN OLUSTUR</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input style={inputStyle} placeholder="Klan Ismi (zorunlu)" value={newClanName} onChange={e => setNewClanName(e.target.value)} />
                        <input style={inputStyle} placeholder="Etiket - max 5 harf (zorunlu)" value={newClanTag} onChange={e => setNewClanTag(e.target.value.slice(0, 5).toUpperCase())} />
                        <textarea style={{ ...inputStyle, resize: 'none' }} placeholder="Aciklama (istege bagli)" value={newClanDesc} onChange={e => setNewClanDesc(e.target.value.slice(0, 200))} rows={2} />
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>KLAN RENGI</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {CLAN_COLORS.map(c => (
                              <motion.button key={c} onClick={() => setNewClanColor(c)} whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.9 }}
                                style={{
                                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                                  background: c, border: newClanColor === c ? `3px solid #fff` : '3px solid transparent',
                                  boxShadow: newClanColor === c ? `0 0 10px ${c}` : 'none',
                                  transition: 'all 0.15s',
                                }} />
                            ))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${newClanColor}ee, ${newClanColor}66)`, border: `2px solid ${newClanColor}99`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>
                              {(newClanName || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ color: '#6b7280', fontSize: 11 }}>On izleme</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <motion.button onClick={createClan} disabled={loading} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            style={{ flex: 1, padding: '12px', borderRadius: 12, fontWeight: 900, color: '#fff', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, opacity: loading ? 0.6 : 1, fontSize: 14 }}>
                            {loading ? '...' : 'Klan Kur'}
                          </motion.button>
                          <button onClick={() => setCreating(false)}
                            style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Iptal</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : myClan ? (
              <>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5" style={panelStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <motion.div
                      animate={{ boxShadow: [`0 0 15px rgba(${theme.glowColor},0.3)`, `0 0 30px rgba(${theme.glowColor},0.6)`, `0 0 15px rgba(${theme.glowColor},0.3)`] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      style={{ width: 68, height: 68, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', background: myClan.color ? `radial-gradient(circle at 35% 35%, ${myClan.color}ee, ${myClan.color}66)` : `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, border: `2px solid ${myClan.color || theme.gradientA}99`, flexShrink: 0 }}>
                      {(myClan.name || '?')[0].toUpperCase()}
                    </motion.div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>{myClan.name}</div>
                      <div style={{ color: '#4b5563', fontSize: 12, marginTop: 3 }}>[{myClan.tag}] — {myClan.description}</div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                        <span style={{ color: theme.uiAccent, fontSize: 11, fontWeight: 700 }}>Seviye {myClan.level}</span>
                        <span style={{ color: '#6b7280', fontSize: 11 }}>{Object.keys(myClan.members || {}).length} uye</span>
                        <span style={{ color: '#6b7280', fontSize: 11 }}>{(myClan.xp || 0).toLocaleString()} XP</span>
                      </div>
                    </div>
                    <RankBadge rank={myRank} size="lg" animated />
                  </div>

                  <div style={{ marginTop: 14, padding: '10px 0', borderTop: `1px solid rgba(${theme.glowColor},0.12)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 700 }}>KL. XP</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        animate={{ width: `${Math.min(100, (myClan.xp || 0) % 1000 / 10)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg,${theme.gradientA},${theme.gradientB})`, boxShadow: `0 0 8px rgba(${theme.glowColor},0.5)` }} />
                    </div>
                    <span style={{ color: '#6b7280', fontSize: 10 }}>{(myClan.xp || 0) % 1000}/1000</span>
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: `rgba(${myRankInfo.glow},0.1)`, border: `1px solid rgba(${myRankInfo.glow},0.3)`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <RankBadge rank={myRank} size="sm" />
                      <div>
                        <div style={{ color: myRankInfo.color, fontWeight: 900, fontSize: 12 }}>{myRankInfo.label.toUpperCase()}</div>
                        <div style={{ color: '#4b5563', fontSize: 9 }}>{myRankInfo.desc}</div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>{myRankInfo.power}</div>
                      <div style={{ color: '#4b5563', fontSize: 9, fontWeight: 700 }}>GUC</div>
                    </div>
                  </div>
                </motion.div>

                {(canManage || isSuperAdmin) && (
                  <div className="rounded-2xl" style={panelStyle}>
                    <div style={{ display: 'flex', borderBottom: `1px solid rgba(${theme.glowColor},0.12)` }}>
                      {[
                        { id: 'members', label: 'UYELER' },
                        ...(isLeader || isSuperAdmin ? [{ id: 'settings', label: 'AYARLAR' }, { id: 'transfer', label: 'DEVIR' }] : []),
                      ].map(t => (
                        <button key={t.id} onClick={() => setAdminTab(t.id)}
                          style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', color: adminTab === t.id ? '#fff' : '#4b5563', fontWeight: 900, fontSize: 10, letterSpacing: 1, borderBottom: adminTab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: 16 }}>
                      {adminTab === 'members' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {Object.entries(myClan.members || {}).sort(([,a],[,b]) => {
                            const order = { leader: 0, co_leader: 1, elder: 2, member: 3 }
                            return (order[a.rank] || 3) - (order[b.rank] || 3)
                          }).map(([uid, member]) => {
                            const rInfo = CLAN_RANKS[member.rank] || CLAN_RANKS.member
                            const isMe = uid === user?.uid
                            const memberIsLeader = member.rank === 'leader'
                            return (
                              <motion.div key={uid} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: isMe ? `rgba(${theme.glowColor},0.08)` : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? `rgba(${theme.glowColor},0.25)` : 'rgba(255,255,255,0.06)'}` }}>
                                <AvatarCircle name={member.name} color={myClan.color} size={40} />
                                <RankBadge rank={member.rank} size="sm" animated={memberIsLeader} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                                    {member.name}
                                    {isMe && <span style={{ color: theme.uiAccent, fontSize: 9, marginLeft: 6, fontWeight: 900 }}>SEN</span>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <span style={{ color: rInfo.color, fontSize: 10, fontWeight: 900, letterSpacing: 0.5 }}>{rInfo.label.toUpperCase()}</span>
                                    {member.level && <span style={{ color: '#4b5563', fontSize: 9 }}>Lv.{member.level}</span>}
                                  </div>
                                </div>
                                {!isMe && (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {(isLeader || isSuperAdmin) && (
                                      <select onChange={e => promoteRank(uid, e.target.value)} value={member.rank}
                                        style={{ fontSize: 10, borderRadius: 8, padding: '4px 8px', background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(${theme.glowColor},0.25)`, color: '#fff', cursor: 'pointer', outline: 'none' }}>
                                        {Object.entries(CLAN_RANKS).filter(([k]) => isSuperAdmin || k !== 'leader').map(([k, v]) => (
                                          <option key={k} value={k}>{v.label}</option>
                                        ))}
                                      </select>
                                    )}
                                    {(myRankInfo.canKick || isSuperAdmin) && (
                                      <motion.button onClick={() => kickMember(uid)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                                        style={{ fontSize: 10, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', cursor: 'pointer', fontWeight: 900 }}>
                                        AT
                                      </motion.button>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                      )}

                      {adminTab === 'settings' && (isLeader || isSuperAdmin) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <input style={inputStyle} placeholder={`Yeni klan ismi (su an: ${myClan.name})`} value={editName} onChange={e => setEditName(e.target.value)} />
                          <textarea style={{ ...inputStyle, resize: 'none' }} placeholder={`Aciklama (su an: ${myClan.description})`} value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
                          <div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>KLAN RENGI</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {CLAN_COLORS.map(c => (
                                <motion.button key={c} onClick={() => setEditColor(c)} whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.9 }}
                                  style={{
                                    width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                                    background: c, border: (editColor || myClan.color) === c ? `3px solid #fff` : '3px solid transparent',
                                    boxShadow: (editColor || myClan.color) === c ? `0 0 10px ${c}` : 'none',
                                    transition: 'all 0.15s',
                                  }} />
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <motion.button onClick={() => saveEditClan()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              style={{ flex: 1, padding: '11px', borderRadius: 12, fontWeight: 900, color: '#fff', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, fontSize: 13 }}>
                              Kaydet
                            </motion.button>
                            <motion.button onClick={() => disbandClan()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              style={{ padding: '11px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                              Dagiril
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {adminTab === 'transfer' && (isLeader || isSuperAdmin) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.5 }}>Liderligi devretmek istedigin uyeyi sec. Mevcut lider Yardimci olacak.</div>
                          <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                            style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">-- Uye sec --</option>
                            {Object.entries(myClan.members || {}).filter(([uid]) => uid !== user?.uid).map(([uid, m]) => {
                              const rInfo = CLAN_RANKS[m.rank] || CLAN_RANKS.member
                              return <option key={uid} value={uid}>{m.name} ({rInfo.label})</option>
                            })}
                          </select>
                          <motion.button onClick={transferLeadership} disabled={!transferTo} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            style={{ padding: '11px', borderRadius: 12, background: `rgba(${theme.glowColor},0.18)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent, fontWeight: 900, cursor: 'pointer', fontSize: 13, opacity: !transferTo ? 0.45 : 1 }}>
                            Liderligi Devret
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!canManage && (
                  <div className="rounded-2xl p-5" style={panelStyle}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: 1.5, marginBottom: 14 }}>KLAN UYELERI</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(myClan.members || {}).sort(([,a],[,b]) => {
                        const order = { leader:0, co_leader:1, elder:2, member:3 }
                        return (order[a.rank]||3)-(order[b.rank]||3)
                      }).map(([uid, member]) => {
                        const rInfo = CLAN_RANKS[member.rank] || CLAN_RANKS.member
                        const isMe = uid === user?.uid
                        return (
                          <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: isMe ? `rgba(${theme.glowColor},0.06)` : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe?`rgba(${theme.glowColor},0.2)`:'rgba(255,255,255,0.05)'}` }}>
                            <AvatarCircle name={member.name} color={myClan.color} size={38} />
                            <RankBadge rank={member.rank} size="sm" animated={member.rank === 'leader'} />
                            <div style={{ flex: 1 }}>
                              <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{member.name}</span>
                              {isMe && <span style={{ color: theme.uiAccent, fontSize: 9, marginLeft: 6, fontWeight: 900 }}>SEN</span>}
                            </div>
                            <span style={{ color: rInfo.color, fontSize: 10, fontWeight: 900, letterSpacing: 0.5 }}>{rInfo.label.toUpperCase()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <motion.button onClick={leaveClan} whileHover={{ scale: 1.02, background: 'rgba(239,68,68,0.15)' }} whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer', fontSize: 13, transition: 'background 0.2s' }}>
                  Klandan Ayril
                </motion.button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px 0', fontSize: 13 }}>Klan bilgisi yukleniyor...</div>
            )}
          </div>
        )}

        {tab === 'browse' && (
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input placeholder="Klan ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, padding: '12px 16px', fontSize: 14 }} />
            {profile?.clan && (
              <div style={{ borderRadius: 12, padding: 14, textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', fontSize: 13 }}>
                Zaten bir klandasin. Once ayrilman gerekiyor.
              </div>
            )}
            {filteredClans.length === 0 && !profile?.clan && (
              <div style={{ textAlign: 'center', color: '#4b5563', padding: '48px 0', fontSize: 13 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.06)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #374151' }} />
                </div>
                {clans.length === 0 ? 'Henuz klan yok. Ilk klani sen kur!' : 'Sonuc bulunamadi'}
              </div>
            )}
            {filteredClans.map((clan, idx) => (
              <motion.div key={clan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                style={{ borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 14, ...panelStyle }}>
                <AvatarCircle name={clan.name} color={clan.color} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>
                    {clan.name} <span style={{ color: theme.uiAccent, fontWeight: 700, fontSize: 12 }}>[{clan.tag}]</span>
                  </div>
                  <div style={{ color: '#4b5563', fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clan.description}</div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                    <span style={{ color: '#6b7280', fontSize: 10 }}>{Object.keys(clan.members || {}).length} uye</span>
                    <span style={{ color: theme.uiAccent, fontSize: 10, fontWeight: 700 }}>Lv.{clan.level}</span>
                    <span style={{ color: '#6b7280', fontSize: 10 }}>{(clan.xp || 0).toLocaleString()} XP</span>
                  </div>
                </div>
                <motion.button onClick={() => joinClan(clan)} disabled={!!profile?.clan || loading} whileHover={{ scale: 1.07, boxShadow: `0 0 20px rgba(${theme.glowColor},0.4)` }} whileTap={{ scale: 0.93 }}
                  style={{ padding: '9px 18px', borderRadius: 12, fontWeight: 900, fontSize: 12, color: '#fff', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, opacity: profile?.clan ? 0.4 : 1 }}>
                  Katil
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'ranks' && (
          <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, marginBottom: 8, letterSpacing: 1 }}>KLAN RUTBELERI</div>
            {Object.entries(CLAN_RANKS).map(([key, rank], idx) => (
              <motion.div key={key}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
                whileHover={{ x: 4, boxShadow: `0 0 20px rgba(${rank.glow},0.2)` }}
                style={{ borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, ...panelStyle, transition: 'box-shadow 0.2s' }}>
                <RankBadge rank={key} size="lg" animated={key === 'leader'} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: rank.color, fontWeight: 900, fontSize: 16, marginBottom: 4 }}>{rank.label.toUpperCase()}</div>
                  <div style={{ color: '#4b5563', fontSize: 11, marginBottom: 8 }}>{rank.desc}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {rank.canEdit && <span style={{ padding: '2px 8px', borderRadius: 20, background: `rgba(${rank.glow},0.15)`, border: `1px solid rgba(${rank.glow},0.3)`, color: rank.color, fontSize: 9, fontWeight: 700 }}>Klan Duzenle</span>}
                    {rank.canPromote && <span style={{ padding: '2px 8px', borderRadius: 20, background: `rgba(${rank.glow},0.15)`, border: `1px solid rgba(${rank.glow},0.3)`, color: rank.color, fontSize: 9, fontWeight: 700 }}>Rutbe At</span>}
                    {rank.canKick && <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 9, fontWeight: 700 }}>Uye At</span>}
                    {!rank.canPromote && !rank.canKick && <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#4b5563', fontSize: 9, fontWeight: 700 }}>Standart uye</span>}
                  </div>
                </div>
                <div style={{ minWidth: 56, textAlign: 'center' }}>
                  <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 4 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${rank.power}%` }} transition={{ delay: idx * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg,${rank.color},rgba(${rank.glow},0.7))`, boxShadow: `0 0 6px rgba(${rank.glow},0.5)` }} />
                  </div>
                  <div style={{ color: rank.color, fontSize: 11, fontWeight: 900 }}>{rank.power}<span style={{ color: '#4b5563', fontSize: 8 }}>/100</span></div>
                  <div style={{ color: '#4b5563', fontSize: 8, fontWeight: 700, letterSpacing: 1 }}>GUC</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'superadmin' && isSuperAdmin && (
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 12, fontWeight: 700 }}>
              SUPER ADMIN PANELI — Tum klanlari yonetebilirsin.
            </div>
            {clans.map(clan => (
              <motion.div key={clan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl" style={panelStyle}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid rgba(${theme.glowColor},0.1)` }}>
                  <AvatarCircle name={clan.name} color={clan.color} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{clan.name} <span style={{ color: theme.uiAccent, fontSize: 11 }}>[{clan.tag}]</span></div>
                    <div style={{ color: '#4b5563', fontSize: 11 }}>Lider: {clan.leaderName} — {Object.keys(clan.members || {}).length} uye</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSuperAdminClan(superAdminClan?.id === clan.id ? null : clan)}
                      style={{ padding: '6px 12px', borderRadius: 8, background: `rgba(${theme.glowColor},0.15)`, border: `1px solid rgba(${theme.glowColor},0.3)`, color: theme.uiAccent, fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>
                      {superAdminClan?.id === clan.id ? 'Kapat' : 'Yonet'}
                    </button>
                    <button onClick={() => disbandClan(clan)}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>
                      Dagiril
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {superAdminClan?.id === clan.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>UYE YONETIMI</div>
                      {Object.entries(clan.members || {}).map(([uid, member]) => {
                        const rInfo = CLAN_RANKS[member.rank] || CLAN_RANKS.member
                        return (
                          <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <AvatarCircle name={member.name} color={clan.color} size={36} />
                            <RankBadge rank={member.rank} size="sm" />
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{member.name}</div>
                              <div style={{ color: rInfo.color, fontSize: 9, fontWeight: 900 }}>{rInfo.label.toUpperCase()}</div>
                            </div>
                            <select onChange={e => promoteRank(uid, e.target.value, clan)} value={member.rank}
                              style={{ fontSize: 10, borderRadius: 8, padding: '4px 6px', background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(${theme.glowColor},0.2)`, color: '#fff', cursor: 'pointer', outline: 'none' }}>
                              {Object.entries(CLAN_RANKS).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                            <button onClick={() => kickMember(uid, clan)}
                              style={{ fontSize: 10, padding: '4px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }}>AT</button>
                          </div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
