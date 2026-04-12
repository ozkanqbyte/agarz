import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ref, set, onValue, remove, update } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

const CLAN_RANKS = {
  leader:    { label: 'Lider', icon: '👑', color: '#f59e0b' },
  co_leader: { label: 'Yardımcı', icon: '⚔️', color: '#a78bfa' },
  elder:     { label: 'Yaşlı', icon: '🛡️', color: '#06b6d4' },
  member:    { label: 'Üye', icon: '⚡', color: '#6b7280' },
}

export default function ClanWarLobby() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)

  const [lobbies, setLobbies] = useState([])
  const [myLobby, setMyLobby] = useState(null)
  const [myLobbyData, setMyLobbyData] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [clans, setClans] = useState({})

  const myClan = profile?.clan
  const myRank = myLobbyData?.clans?.[myClan]?.members?.[user?.uid]?.rank || 'member'
  const isLeader = myRank === 'leader' || myRank === 'co_leader'

  const panelStyle = {
    background: 'rgba(10,10,25,0.9)',
    border: `1px solid rgba(${theme.glowColor},0.25)`,
    backdropFilter: 'blur(20px)',
  }

  useEffect(() => {
    const lobbiesRef = ref(db, 'clanWarLobbies')
    const unsub = onValue(lobbiesRef, (snap) => {
      if (!snap.exists()) { setLobbies([]); return }
      const data = Object.entries(snap.val()).map(([id, l]) => ({ id, ...l }))
      setLobbies(data)
      if (myClan) {
        const found = data.find(l => l.clan1?.tag === myClan || l.clan2?.tag === myClan)
        if (found) {
          setMyLobby(found.id)
          setMyLobbyData(found)
        } else {
          setMyLobby(null)
          setMyLobbyData(null)
        }
      }
    })
    return () => unsub()
  }, [myClan])

  useEffect(() => {
    const clansRef = ref(db, 'clans')
    const unsub = onValue(clansRef, (snap) => {
      if (!snap.exists()) return
      const data = {}
      Object.entries(snap.val()).forEach(([id, c]) => { data[c.tag] = { id, ...c } })
      setClans(data)
    })
    return () => unsub()
  }, [])

  const clanData = clans[myClan]
  const memberCount = clanData ? Object.keys(clanData.members || {}).length : 0

  const createLobby = async () => {
    if (!myClan) { toast.error('Bir klana üye olmalısın!'); return }
    if (!isLeader) { toast.error('Sadece Lider veya Yardımcı lobi açabilir!'); return }
    if (myLobby) { toast.error('Zaten bir lobidesin!'); return }
    setLoading(true)
    const lobbyId = 'cw_' + uuidv4().slice(0, 8)
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    await set(ref(db, `clanWarLobbies/${lobbyId}`), {
      id: lobbyId,
      code,
      createdAt: Date.now(),
      createdBy: user.uid,
      status: 'waiting',
      clan1: {
        tag: myClan,
        name: clanData?.name || myClan,
        avatar: clanData?.avatar || '⚔️',
        members: {},
        ready: false,
      },
      clan2: null,
    })
    await update(ref(db, `clanWarLobbies/${lobbyId}/clan1/members/${user.uid}`), {
      name: profile?.name || 'Player',
      uid: user.uid,
      rank: myRank,
      ready: false,
    })
    setLoading(false)
    toast.success(`Lobi açıldı! Kod: ${code}`)
  }

  const joinLobby = async (lobbyId, lobbyData) => {
    if (!myClan) { toast.error('Bir klana üye olmalısın!'); return }
    if (myLobby) { toast.error('Zaten bir lobidesin!'); return }
    const realClanData = clans[myClan]
    if (!realClanData || !realClanData.members?.[user?.uid]) {
      toast.error('Bu klana üye değilsin veya klan verisi yüklenemedi!'); return
    }
    setLoading(true)
    const isClan1 = lobbyData.clan1?.tag === myClan
    const isClan2 = lobbyData.clan2?.tag === myClan
    if (!isClan1 && !isClan2) {
      if (lobbyData.clan2) { toast.error('Lobi dolu! İki klan zaten var.'); setLoading(false); return }
      await update(ref(db, `clanWarLobbies/${lobbyId}`), {
        clan2: {
          tag: myClan,
          name: clanData?.name || myClan,
          avatar: clanData?.avatar || '⚔️',
          ready: false,
        }
      })
    }
    const slot = (isClan1 || !lobbyData.clan2) ? 'clan1' : 'clan2'
    const memberRank = realClanData.members[user.uid]?.rank || 'member'
    await update(ref(db, `clanWarLobbies/${lobbyId}/${slot}/members/${user.uid}`), {
      name: profile?.name || 'Oyuncu',
      uid: user.uid,
      rank: memberRank,
      ready: false,
    })
    setLoading(false)
    toast.success('Lobiye katıldın!')
  }

  const joinByCode = async () => {
    if (!joinCode.trim()) return
    if (!myClan) { toast.error('Bir klana üye olmalısın!'); return }
    const realClanData = clans[myClan]
    if (!realClanData || !realClanData.members?.[user?.uid]) {
      toast.error('Klan üyeliğin doğrulanamadı!'); return
    }
    const lobby = lobbies.find(l => l.code === joinCode.toUpperCase())
    if (!lobby) { toast.error('Geçersiz kod!'); return }
    if (lobby.clan1?.tag === myClan || lobby.clan2?.tag === myClan) {
      await joinLobby(lobby.id, lobby)
    } else if (!lobby.clan2) {
      await joinLobby(lobby.id, lobby)
    } else {
      toast.error('Bu lobiye klanın davet edilmedi!')
    }
    setJoinCode('')
  }

  const setReady = async () => {
    if (!myLobby || !myLobbyData) return
    const isClan1 = myLobbyData.clan1?.tag === myClan
    const slot = isClan1 ? 'clan1' : 'clan2'
    await update(ref(db, `clanWarLobbies/${myLobby}/${slot}/members/${user.uid}`), { ready: true })
    const allReady1 = Object.values(myLobbyData.clan1?.members || {}).every(m => m.ready)
    const allReady2 = myLobbyData.clan2 ? Object.values(myLobbyData.clan2?.members || {}).every(m => m.ready) : false
    if (allReady1 && allReady2) {
      await update(ref(db, `clanWarLobbies/${myLobby}`), { status: 'starting' })
    }
    toast.success('Hazır işaretlendi!')
  }

  const leaveLobby = async () => {
    if (!myLobby || !myLobbyData) return
    const isClan1 = myLobbyData.clan1?.tag === myClan
    const slot = isClan1 ? 'clan1' : 'clan2'
    await remove(ref(db, `clanWarLobbies/${myLobby}/${slot}/members/${user.uid}`))
    toast.success('Lobiden ayrıldın.')
  }

  const startGame = async () => {
    if (!myLobby || !myLobbyData) return
    if (!myLobbyData.clan2) { toast.error('İkinci klan bekleniyor!'); return }
    const roomId = `cw_${myLobby}`
    await update(ref(db, `clanWarLobbies/${myLobby}`), { status: 'started', roomId })
    navigate(`/game?room=${roomId}&mode=clan_war&name=${encodeURIComponent(profile?.name || 'Player')}&team=red`)
    toast.success('Savaş başlıyor! 🏰')
  }

  useEffect(() => {
    if (myLobbyData?.status === 'started' && myLobbyData?.roomId) {
      const isClan1 = myLobbyData.clan1?.tag === myClan
      navigate(`/game?room=${myLobbyData.roomId}&mode=clan_war&name=${encodeURIComponent(profile?.name || 'Player')}&team=${isClan1 ? 'red' : 'blue'}`)
    }
  }, [myLobbyData?.status])

  const openLobbies = lobbies.filter(l =>
    l.status === 'waiting' &&
    myClan &&
    (l.clan1?.tag === myClan || l.clan2?.tag === myClan)
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050510', color: 'white', fontFamily: '"Exo 2", sans-serif', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: `1px solid rgba(${theme.glowColor},0.15)`, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(5,5,16,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/menu')}
          style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
          ← Geri
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>🏰 Klan Savaşı Lobisi</div>
          <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Klan lideri lobi açar, üyeler katılır</div>
        </div>
        {myClan && (
          <div style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, background: `rgba(${theme.glowColor},0.15)`, border: `1px solid rgba(${theme.glowColor},0.35)`, fontSize: 13, fontWeight: 900, color: theme.uiAccent }}>
            ⚔️ {myClan}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* My lobby / current status */}
        {myLobbyData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius: 20, padding: 24, ...panelStyle, border: `2px solid rgba(16,185,129,0.4)` }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: '#10b981', marginBottom: 16 }}>SENİN LOBİN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              {/* Clan 1 */}
              <ClanSlot clan={myLobbyData.clan1} color="#ef4444" label="TAKIM 1 🔴" />
              <div style={{ fontSize: 28, fontWeight: 900, color: '#4b5563' }}>VS</div>
              {/* Clan 2 */}
              {myLobbyData.clan2
                ? <ClanSlot clan={myLobbyData.clan2} color="#3b82f6" label="TAKIM 2 🔵" />
                : <div style={{ borderRadius: 16, padding: '20px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.1)', color: '#4b5563' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Rakip Klan Bekleniyor</div>
                    <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>Kod: <span style={{ color: '#10b981', fontWeight: 900 }}>{myLobbyData.code}</span></div>
                  </div>
              }
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={setReady}
                style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', color: '#10b981', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
                ✅ Hazırım
              </motion.button>
              {isLeader && myLobbyData.clan2 && (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={startGame}
                  style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#06b6d4)', border: 'none', color: 'white', fontWeight: 900, fontSize: 13, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
                  🏰 SAVAŞI BAŞLAT
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={leaveLobby}
                style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
                Ayrıl
              </motion.button>
            </div>
          </motion.div>
        )}

        {!myLobbyData && (
          <>
            {/* Create lobby */}
            <div style={{ borderRadius: 20, padding: 24, ...panelStyle }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: theme.uiAccent, marginBottom: 12 }}>LOBİ OL</div>
              {!myClan ? (
                <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
                  Klan Savaşı oynamak için önce bir klana katılman gerekiyor.
                  <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/clan')}
                    style={{ marginLeft: 12, padding: '6px 16px', borderRadius: 8, background: `rgba(${theme.glowColor},0.15)`, border: `1px solid rgba(${theme.glowColor},0.3)`, color: theme.uiAccent, fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
                    Klan Sistemi →
                  </motion.button>
                </div>
              ) : !isLeader ? (
                <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>Lobi açmak için Lider veya Yardımcı rütbesi gerekli. Klan liderinden kod al.</div>
              ) : (
                <motion.button whileHover={{ scale: 1.03, boxShadow: `0 0 30px rgba(${theme.glowColor},0.4)` }} whileTap={{ scale: 0.97 }}
                  onClick={createLobby} disabled={loading}
                  style={{ padding: '14px 32px', borderRadius: 14, background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`, border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif', opacity: loading ? 0.6 : 1 }}>
                  🏰 Klan Savaşı Lobisi Aç
                </motion.button>
              )}
            </div>

            {/* Join by code */}
            <div style={{ borderRadius: 20, padding: 24, ...panelStyle }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: theme.uiAccent, marginBottom: 12 }}>KODA GÖRE KATIL</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="LOBİ KODU GİR..."
                  maxLength={6}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${theme.glowColor},0.2)`, color: 'white', fontFamily: '"Exo 2", sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: 4, outline: 'none' }}
                />
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={joinByCode} disabled={loading}
                  style={{ padding: '12px 24px', borderRadius: 12, background: `rgba(${theme.glowColor},0.2)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent, fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
                  Katıl →
                </motion.button>
              </div>
            </div>

            {/* Open lobbies */}
            <div style={{ borderRadius: 20, padding: 24, ...panelStyle }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: theme.uiAccent, marginBottom: 16 }}>AÇIK LOBİLER ({openLobbies.length})</div>
              {openLobbies.length === 0 ? (
                <div style={{ color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>Henüz açık lobi yok. İlk lobi açan sen ol!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence>
                    {openLobbies.map(lobby => (
                      <motion.div
                        key={lobby.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}
                      >
                        <div style={{ fontSize: 28 }}>{lobby.clan1?.avatar || '⚔️'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900, fontSize: 14, color: '#e2e8f0' }}>{lobby.clan1?.name || lobby.clan1?.tag}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>
                            {lobby.clan2 ? `vs ${lobby.clan2.name || lobby.clan2.tag}` : 'Rakip bekleniyor...'}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#6b7280', letterSpacing: 1 }}>
                          {Object.keys(lobby.clan1?.members || {}).length} oyuncu
                        </div>
                        {myClan !== lobby.clan1?.tag && myClan !== lobby.clan2?.tag && (
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => joinLobby(lobby.id, lobby)}
                            style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', fontWeight: 900, fontSize: 12, cursor: 'pointer', fontFamily: '"Exo 2", sans-serif' }}>
                            Katıl
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ClanSlot({ clan, color, label }) {
  const members = Object.values(clan?.members || {})
  return (
    <div style={{ borderRadius: 16, padding: 16, background: `rgba(${color === '#ef4444' ? '239,68,68' : '59,130,246'},0.08)`, border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2, color, marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{clan?.avatar || '⚔️'}</div>
      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 10 }}>{clan?.name || clan?.tag}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {members.map(m => (
          <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span>{CLAN_RANKS[m.rank]?.icon || '⚡'}</span>
            <span style={{ color: m.ready ? '#10b981' : '#9ca3af', fontWeight: 700 }}>{m.name}</span>
            {m.ready && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 900 }}>✓</span>}
          </div>
        ))}
        {members.length === 0 && <div style={{ fontSize: 11, color: '#4b5563' }}>Üye bekleniyor...</div>}
      </div>
    </div>
  )
}
