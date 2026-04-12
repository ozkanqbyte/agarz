import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, set, remove, onValue, off, get } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import { getTheme } from '../../themes/themes'
import useGameStore from '../../store/useGameStore'
import toast from 'react-hot-toast'

export default function FriendSystem({ onInviteToLobby, lobbyId, compact = false }) {
  const { user, profile } = useAuthStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)

  const [tab, setTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const uid = user?.uid
  const myName = profile?.name || user?.displayName || 'Player'
  const myColor = profile?.color || '#6366f1'
  const myProfileId = profile?.profileId || ''

  useEffect(() => {
    if (!uid || uid.startsWith('guest_')) return

    const friendsRef = ref(db, `users/${uid}/friends`)
    const reqRef = ref(db, `users/${uid}/friendRequests`)

    onValue(friendsRef, snap => {
      if (!snap.exists()) { setFriends([]); return }
      setFriends(Object.entries(snap.val()).map(([fid, f]) => ({ uid: fid, ...f })))
    })

    onValue(reqRef, snap => {
      if (!snap.exists()) { setRequests([]); return }
      const list = Object.entries(snap.val())
        .map(([fid, r]) => ({ uid: fid, ...r }))
        .filter(r => r.status === 'pending')
      setRequests(list)
    })

    return () => { off(friendsRef); off(reqRef) }
  }, [uid])

  useEffect(() => {
    if (!uid || uid.startsWith('guest_') || !myName) return
    try {
      set(ref(db, `userSearch/${uid}`), {
        name: myName,
        nameLower: myName.toLowerCase(),
        profileId: myProfileId,
        profileIdLower: myProfileId.toLowerCase(),
        color: myColor,
        uid,
        online: true,
        updatedAt: Date.now()
      }).catch(() => {})
    } catch {}
  }, [uid, myName, myColor, myProfileId])

  const searchUsers = useCallback(async () => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return
    setSearching(true)
    try {
      const searchRef = ref(db, 'userSearch')
      const snap = await get(searchRef)
      if (!snap.exists()) { setSearchResults([]); setSearching(false); return }
      const data = snap.val()
      const isProfileId = q.startsWith('agarix#') || q.startsWith('agarz#') || q.match(/^[a-z0-9]{4,8}$/)
      const results = Object.entries(data)
        .map(([id, u]) => ({ uid: id, ...u }))
        .filter(u => {
          if (u.uid === uid) return false
          if (isProfileId) {
            return u.profileIdLower?.includes(q) || u.nameLower?.includes(q)
          }
          return u.nameLower?.includes(q) || u.profileIdLower?.includes(q)
        })
        .slice(0, 10)
      setSearchResults(results)
    } catch { setSearchResults([]) }
    setSearching(false)
  }, [searchQuery, uid])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const t = setTimeout(searchUsers, 400)
      return () => clearTimeout(t)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, searchUsers])

  const sendRequest = async (targetUid, targetName, targetColor) => {
    if (!uid || uid.startsWith('guest_')) {
      toast.error('Arkadaş eklemek için giriş yapmalısın')
      return
    }
    try {
      await set(ref(db, `users/${targetUid}/friendRequests/${uid}`), {
        name: myName,
        color: myColor,
        profileId: myProfileId,
        status: 'pending',
        sentAt: Date.now()
      })
      toast.success(`${targetName} kişisine istek gönderildi`)
    } catch (e) {
      toast.error('İstek gönderilemedi: ' + (e?.code || 'Hata'))
    }
  }

  const acceptRequest = async (fromUid, fromName, fromColor) => {
    if (!uid) return
    try {
      await Promise.all([
        set(ref(db, `users/${uid}/friends/${fromUid}`), { name: fromName, color: fromColor, addedAt: Date.now() }),
        set(ref(db, `users/${fromUid}/friends/${uid}`), { name: myName, color: myColor, addedAt: Date.now() }),
        remove(ref(db, `users/${uid}/friendRequests/${fromUid}`))
      ])
      toast.success(`${fromName} arkadaşlarına eklendi`)
    } catch { toast.error('İstek kabul edilemedi') }
  }

  const declineRequest = async (fromUid) => {
    if (!uid) return
    try { await remove(ref(db, `users/${uid}/friendRequests/${fromUid}`)) } catch {}
  }

  const removeFriend = async (friendUid, friendName) => {
    if (!uid) return
    try {
      await Promise.all([
        remove(ref(db, `users/${uid}/friends/${friendUid}`)),
        remove(ref(db, `users/${friendUid}/friends/${uid}`))
      ])
      toast.success(`${friendName} listeden çıkarıldı`)
    } catch {}
  }

  const blockUser = async (targetUid, targetName) => {
    if (!uid) return
    try {
      await set(ref(db, `users/${uid}/blocked/${targetUid}`), { name: targetName, blockedAt: Date.now() })
      await removeFriend(targetUid, targetName)
      toast.success(`${targetName} engellendi`)
    } catch {}
  }

  const inviteFriend = (friendUid, friendName) => {
    if (onInviteToLobby) {
      onInviteToLobby(friendUid)
      toast.success(`${friendName} lobiye davet edildi`)
    } else if (lobbyId) {
      const link = `${window.location.origin}/lobby?room=${lobbyId}`
      navigator.clipboard.writeText(link).then(() => {
        toast.success(`Davet linki kopyalandı`)
      }).catch(() => toast.success(`Davet linki: ${link}`))
    }
  }

  const copyProfileId = () => {
    if (!myProfileId) return
    navigator.clipboard.writeText(myProfileId).then(() => {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }).catch(() => {})
  }

  const isFriend = (targetUid) => friends.some(f => f.uid === targetUid)
  const hasPendingRequest = (targetUid) => requests.some(r => r.uid === targetUid)

  const panelStyle = {
    background: 'rgba(6,6,20,0.97)',
    border: `1px solid rgba(${theme.glowColor},0.25)`,
    backdropFilter: 'blur(24px)',
  }

  const content = (
    <div>
      {myProfileId && (
        <div style={{
          padding: '10px 14px',
          background: `rgba(${theme.glowColor},0.06)`,
          borderBottom: `1px solid rgba(${theme.glowColor},0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: '#4b5563', fontSize: 9, fontWeight: 800, letterSpacing: 2 }}>PROFIL ID</div>
            <div style={{ color: theme.uiAccent, fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>{myProfileId}</div>
          </div>
          <motion.button onClick={copyProfileId}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              padding: '4px 12px', borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer',
              background: copiedId ? 'rgba(34,197,94,0.2)' : `rgba(${theme.glowColor},0.15)`,
              border: `1px solid rgba(${theme.glowColor},0.3)`,
              color: copiedId ? '#4ade80' : theme.uiAccent,
            }}>
            {copiedId ? 'Kopyalandi' : 'Kopyala'}
          </motion.button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, padding: '10px 10px 0', borderBottom: `1px solid rgba(${theme.glowColor},0.12)` }}>
        {[
          { id: 'friends', label: `Arkadaslar (${friends.length})` },
          { id: 'requests', label: `İstekler${requests.length > 0 ? ` (${requests.length})` : ''}` },
          { id: 'search', label: 'Kullanici Ara' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.id ? '#fff' : '#4b5563',
              fontWeight: 800, fontSize: 10, letterSpacing: 0.5,
              borderBottom: tab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 10, maxHeight: 320, overflowY: 'auto' }}>
        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#4b5563', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                Henüz arkadaşın yok
              </div>
            ) : friends.map(f => (
              <div key={f.uid} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: f.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 14, color: '#fff', boxShadow: `0 0 12px ${f.color || '#6366f1'}66`,
                }}>
                  {f.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{f.name}</div>
                  <div style={{ color: '#4b5563', fontSize: 10 }}>Arkadasin</div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {lobbyId && (
                    <motion.button onClick={() => inviteFriend(f.uid, f.name)}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      style={{ padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                      Davet
                    </motion.button>
                  )}
                  <motion.button onClick={() => removeFriend(f.uid, f.name)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    style={{ padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    X
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#4b5563', fontSize: 13 }}>Bekleyen istek yok</div>
            ) : requests.map(r => (
              <motion.div key={r.uid}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12,
                  background: `rgba(${theme.glowColor},0.07)`, border: `1px solid rgba(${theme.glowColor},0.2)`,
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: r.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 14, color: '#fff',
                }}>
                  {r.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{r.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 10 }}>{r.profileId || 'Arkadaslik istegi'}</div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <motion.button onClick={() => acceptRequest(r.uid, r.name, r.color)}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
                    Kabul
                  </motion.button>
                  <motion.button onClick={() => declineRequest(r.uid)}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    style={{ padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    Red
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="İsim veya AGARIX#ID ile ara..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid rgba(${theme.glowColor},0.3)`,
                  color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searching && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', fontSize: 11 }}>
                  Aranıyor...
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#374151', textAlign: 'center' }}>
              İsim ile veya tam Profil ID ile ara (orn: AGARIX#AB3X)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchResults.map(u => (
                <motion.div key={u.uid}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: u.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 14, color: '#fff', boxShadow: `0 0 12px ${u.color || '#6366f1'}66`,
                  }}>
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{u.name}</div>
                    <div style={{ color: '#4b5563', fontSize: 10 }}>{u.profileId || ''}</div>
                  </div>
                  {isFriend(u.uid) ? (
                    <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 800 }}>Arkadas</span>
                  ) : hasPendingRequest(u.uid) ? (
                    <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800 }}>Bekliyor</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <motion.button
                        onClick={() => sendRequest(u.uid, u.name, u.color)}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                          background: `rgba(${theme.glowColor},0.2)`,
                          border: `1px solid rgba(${theme.glowColor},0.4)`,
                          color: theme.uiAccent,
                        }}>
                        + Ekle
                      </motion.button>
                      <motion.button
                        onClick={() => blockUser(u.uid, u.name)}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        style={{
                          padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5',
                        }}>
                        Engelle
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              ))}
              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', color: '#4b5563', fontSize: 12, padding: '16px 0' }}>Kullanici bulunamadi</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (compact) {
    return (
      <>
        <motion.button
          onClick={() => setOpen(!open)}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: `rgba(${theme.glowColor},0.12)`,
            border: `1px solid rgba(${theme.glowColor},0.3)`,
            color: theme.uiAccent,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Arkadaslar
          {friends.filter(f => f.online).length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#4ade80',
              background: 'rgba(34,197,94,0.15)', padding: '1px 6px', borderRadius: 8,
              border: '1px solid rgba(34,197,94,0.3)',
            }}>
              {friends.filter(f => f.online).length} çevrimiçi
            </span>
          )}
          {requests.length > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, borderRadius: '50%', background: '#ef4444',
              color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
            }}>
              {requests.length}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                  zIndex: 200, backdropFilter: 'blur(3px)',
                }}
              />
              <motion.div
                initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                style={{
                  position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
                  zIndex: 201, overflowY: 'auto',
                  background: 'rgba(6,6,20,0.98)',
                  borderLeft: `1px solid rgba(${theme.glowColor},0.22)`,
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                }}>
                <div style={{
                  padding: '16px 14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', position: 'sticky', top: 0,
                  background: 'rgba(6,6,20,0.98)', zIndex: 1,
                  borderBottom: `1px solid rgba(${theme.glowColor},0.15)`,
                }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>👥 Arkadaşlar</div>
                  <motion.button
                    onClick={() => setOpen(false)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    style={{
                      width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#9ca3af', fontSize: 16, cursor: 'pointer',
                    }}>
                    ×
                  </motion.button>
                </div>
                {content}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', ...panelStyle }}>
      {content}
    </div>
  )
}
