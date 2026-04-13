import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ref, set, onValue, remove, update } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function ClanWarLobby() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)

  const [joinCode, setJoinCode] = useState('')
  const [myLobbyId, setMyLobbyId] = useState(null)
  const [myLobbyData, setMyLobbyData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [joinTeam, setJoinTeam] = useState('team1')

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Oyuncu'
  const uid = user?.uid

  useEffect(() => {
    if (!myLobbyId) return
    const unsub = onValue(ref(db, `clanWarLobbies/${myLobbyId}`), snap => {
      if (!snap.exists()) { setMyLobbyId(null); setMyLobbyData(null); return }
      setMyLobbyData(snap.val())
    })
    return () => unsub()
  }, [myLobbyId])

  useEffect(() => {
    if (!myLobbyData?.status) return
    if (myLobbyData.status === 'started' && myLobbyData.roomId) {
      const isTeam1 = !!myLobbyData.team1?.members?.[uid]
      navigate(`/game?room=${myLobbyData.roomId}&mode=clan_war&name=${encodeURIComponent(displayName)}&team=${isTeam1 ? 'red' : 'blue'}`)
    }
  }, [myLobbyData?.status])

  const createLobby = async () => {
    setLoading(true)
    const lobbyId = 'cw_' + Date.now().toString(36)
    const code = genCode()
    const lobbyData = {
      id: lobbyId,
      code,
      createdBy: uid,
      createdAt: Date.now(),
      status: 'waiting',
      team1: { members: {} },
      team2: { members: {} },
    }
    lobbyData.team1.members[uid] = { name: displayName, uid, ready: false }
    await set(ref(db, `clanWarLobbies/${lobbyId}`), lobbyData)
    setMyLobbyId(lobbyId)
    setLoading(false)
    toast.success(`Lobi açıldı! Kod: ${code}`)
  }

  const joinByCode = async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length < 6) { toast.error('6 haneli kodu gir!'); return }
    setLoading(true)
    const lobbiesRef = ref(db, 'clanWarLobbies')
    onValue(lobbiesRef, async snap => {
      if (!snap.exists()) { toast.error('Lobi bulunamadı!'); setLoading(false); return }
      const all = Object.entries(snap.val())
      const found = all.find(([, l]) => l.code === code && l.status === 'waiting')
      if (!found) { toast.error('Geçersiz veya dolu lobi kodu!'); setLoading(false); return }
      const [lobbyId, lobbyData] = found
      const slot = joinTeam === 'team1' ? 'team1' : 'team2'
      if (lobbyData[slot]?.members?.[uid]) {
        setMyLobbyId(lobbyId)
        setLoading(false)
        return
      }
      await update(ref(db, `clanWarLobbies/${lobbyId}/${slot}/members/${uid}`), {
        name: displayName, uid, ready: false,
      })
      setMyLobbyId(lobbyId)
      setJoinCode('')
      setLoading(false)
      toast.success(`${joinTeam === 'team1' ? '🔴 Takım 1' : '🔵 Takım 2'} lobiye katıldın!`)
    }, { onlyOnce: true })
  }

  const setReady = async () => {
    if (!myLobbyId || !myLobbyData) return
    const isTeam1 = !!myLobbyData.team1?.members?.[uid]
    const slot = isTeam1 ? 'team1' : 'team2'
    await update(ref(db, `clanWarLobbies/${myLobbyId}/${slot}/members/${uid}`), { ready: true })
    toast.success('Hazır!')
  }

  const leaveLobby = async () => {
    if (!myLobbyId || !myLobbyData) return
    const isTeam1 = !!myLobbyData.team1?.members?.[uid]
    const slot = isTeam1 ? 'team1' : 'team2'
    await remove(ref(db, `clanWarLobbies/${myLobbyId}/${slot}/members/${uid}`))
    if (myLobbyData.createdBy === uid) {
      await remove(ref(db, `clanWarLobbies/${myLobbyId}`))
    }
    setMyLobbyId(null)
    setMyLobbyData(null)
    toast.success('Lobiden ayrıldın.')
  }

  const startGame = async () => {
    if (!myLobbyId || !myLobbyData) return
    const t1 = Object.keys(myLobbyData.team1?.members || {}).length
    const t2 = Object.keys(myLobbyData.team2?.members || {}).length
    if (t2 === 0) { toast.error('Takım 2 boş, rakip bekleniyor!'); return }
    const roomId = `cw_${myLobbyId}`
    await update(ref(db, `clanWarLobbies/${myLobbyId}`), { status: 'started', roomId })
    toast.success('Savaş başlıyor! ⚔️')
  }

  const panelStyle = {
    background: 'rgba(8,8,20,0.92)',
    border: `1px solid rgba(${theme.glowColor},0.2)`,
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
    padding: 24,
  }

  const t1members = Object.values(myLobbyData?.team1?.members || {})
  const t2members = Object.values(myLobbyData?.team2?.members || {})
  const isHost = myLobbyData?.createdBy === uid
  const isTeam1 = !!myLobbyData?.team1?.members?.[uid]
  const allReady = t1members.length > 0 && t2members.length > 0 &&
    t1members.every(m => m.ready) && t2members.every(m => m.ready)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#050510,#0a0520,#050510)', color: 'white', fontFamily: '"Exo 2",sans-serif', overflow: 'auto' }}>
      <div style={{ padding: '18px 28px', borderBottom: `1px solid rgba(${theme.glowColor},0.15)`, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(5,5,16,0.96)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/menu')}
          style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          ← Geri
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>⚔️ Klan Savaşı</div>
          <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Lobi kodu ile takımını oluştur ve savaş</div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {myLobbyData ? (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ ...panelStyle, border: `2px solid rgba(${theme.glowColor},0.4)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: '#10b981' }}>LİVE LOBİ</div>
                <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', padding: '4px 14px', borderRadius: 8 }}>
                  KOD: {myLobbyData.code}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 12, marginBottom: 20 }}>
                <TeamSlot label="🔴 TAKIM 1" members={t1members} color="#ef4444" />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#4b5563' }}>VS</div>
                <TeamSlot label="🔵 TAKIM 2" members={t2members} color="#3b82f6" />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={setReady}
                  style={{ padding: '10px 22px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                  ✅ Hazırım
                </motion.button>
                {isHost && (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={startGame}
                    disabled={!allReady}
                    style={{ padding: '10px 22px', borderRadius: 12, background: allReady ? 'linear-gradient(135deg,#10b981,#3b82f6)' : 'rgba(255,255,255,0.05)', border: 'none', color: allReady ? '#fff' : '#4b5563', fontWeight: 900, fontSize: 13, cursor: allReady ? 'pointer' : 'not-allowed' }}>
                    ⚔️ SAVAŞI BAŞLAT
                  </motion.button>
                )}
                {!isHost && <div style={{ fontSize: 12, color: '#4b5563', display: 'flex', alignItems: 'center' }}>Host başlatmayı bekle</div>}
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={leaveLobby}
                  style={{ padding: '10px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>
                  Ayrıl
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: theme.uiAccent, marginBottom: 14 }}>LOBİ OLUŞTUR</div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, fontWeight: 600 }}>Lobi aç, kodu arkadaşlarınla paylaş, hep birlikte savaş!</p>
              <motion.button whileHover={{ scale: 1.03, boxShadow: `0 0 30px rgba(${theme.glowColor},0.4)` }} whileTap={{ scale: 0.97 }}
                onClick={createLobby} disabled={loading}
                style={{ padding: '14px 32px', borderRadius: 14, background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                ⚔️ Yeni Lobi Aç
              </motion.button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: theme.uiAccent, marginBottom: 14 }}>LOBİYE KATIL</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                {['team1', 'team2'].map(t => (
                  <button key={t} onClick={() => setJoinTeam(t)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: 'none',
                      background: joinTeam === t ? (t === 'team1' ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)') : 'rgba(255,255,255,0.05)',
                      color: joinTeam === t ? (t === 'team1' ? '#ef4444' : '#3b82f6') : '#6b7280',
                      outline: joinTeam === t ? `2px solid ${t === 'team1' ? '#ef4444' : '#3b82f6'}` : 'none',
                    }}>
                    {t === 'team1' ? '🔴 Takım 1' : '🔵 Takım 2'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="LOBİ KODU (6 HANE)"
                  maxLength={6}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${theme.glowColor},0.2)`, color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: 4, outline: 'none', fontFamily: '"Exo 2",sans-serif' }}
                />
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={joinByCode} disabled={loading}
                  style={{ padding: '12px 22px', borderRadius: 12, background: `rgba(${theme.glowColor},0.2)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                  Katıl →
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}

function TeamSlot({ label, members, color }) {
  return (
    <div style={{ borderRadius: 14, padding: 14, background: `rgba(${color === '#ef4444' ? '239,68,68' : '59,130,246'},0.07)`, border: `1px solid ${color}30` }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color, marginBottom: 10 }}>{label}</div>
      {members.length === 0 ? (
        <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Boş — katılmak için kod gir</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map(m => (
            <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.ready ? '#10b981' : '#4b5563' }} />
              <span style={{ fontWeight: 700, color: m.ready ? '#e2e8f0' : '#9ca3af' }}>{m.name}</span>
              {m.ready && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 900, marginLeft: 'auto' }}>HAZIR</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
