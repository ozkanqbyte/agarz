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

  const uid = user?.uid
  const myName = profile?.name || user?.displayName || 'Player'
  const myColor = profile?.color || '#6366f1'

  useEffect(() => {
    if (!uid || uid.startsWith('guest_')) return

    const friendsRef = ref(db, `users/${uid}/friends`)
    const reqRef = ref(db, `users/${uid}/friendRequests`)

    onValue(friendsRef, snap => {
      if (!snap.exists()) { setFriends([]); return }
      const data = snap.val()
      setFriends(Object.entries(data).map(([fid, f]) => ({ uid: fid, ...f })))
    })

    onValue(reqRef, snap => {
      if (!snap.exists()) { setRequests([]); return }
      const data = snap.val()
      const list = Object.entries(data)
        .map(([fid, r]) => ({ uid: fid, ...r }))
        .filter(r => r.status === 'pending')
      setRequests(list)
    })

    return () => {
      off(friendsRef)
      off(reqRef)
    }
  }, [uid])

  useEffect(() => {
    if (!uid || uid.startsWith('guest_')) return
    if (!myName) return
    try {
      set(ref(db, `userSearch/${uid}`), {
        name: myName,
        nameLower: myName.toLowerCase(),
        color: myColor,
        uid,
        online: true,
        updatedAt: Date.now()
      }).catch(() => {})
    } catch {}
  }, [uid, myName, myColor])

  const searchUsers = useCallback(async () => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return
    setSearching(true)
    try {
      const searchRef = ref(db, 'userSearch')
      const snap = await get(searchRef)
      if (!snap.exists()) { setSearchResults([]); setSearching(false); return }
      const data = snap.val()
      const results = Object.entries(data)
        .map(([id, u]) => ({ uid: id, ...u }))
        .filter(u => u.uid !== uid && u.nameLower?.includes(q))
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
        status: 'pending',
        sentAt: Date.now()
      })
      toast.success(`${targetName} kişisine arkadaşlık isteği gönderildi!`)
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
      toast.success(`${fromName} arkadaşlarına eklendi! 🎉`)
    } catch (e) {
      toast.error('İstek kabul edilemedi')
    }
  }

  const declineRequest = async (fromUid) => {
    if (!uid) return
    try {
      await remove(ref(db, `users/${uid}/friendRequests/${fromUid}`))
    } catch {}
  }

  const removeFriend = async (friendUid, friendName) => {
    if (!uid) return
    try {
      await Promise.all([
        remove(ref(db, `users/${uid}/friends/${friendUid}`)),
        remove(ref(db, `users/${friendUid}/friends/${uid}`))
      ])
      toast.success(`${friendName} arkadaş listesinden çıkarıldı`)
    } catch {}
  }

  const inviteFriend = (friendUid, friendName) => {
    if (onInviteToLobby) {
      onInviteToLobby(friendUid)
      toast.success(`${friendName} lobiye davet edildi!`)
    } else if (lobbyId) {
      const link = `${window.location.origin}/lobby?room=${lobbyId}`
      navigator.clipboard.writeText(link).then(() => {
        toast.success(`${friendName} için davet linki kopyalandı!`)
      }).catch(() => {
        toast.success(`Davet linki: ${link}`)
      })
    }
  }

  const isFriend = (targetUid) => friends.some(f => f.uid === targetUid)
  const hasPendingRequest = (targetUid) => requests.some(r => r.uid === targetUid)

  const panelStyle = {
    background: 'rgba(6,6,20,0.95)',
    border: `1px solid rgba(${theme.glowColor},0.25)`,
    backdropFilter: 'blur(20px)',
  }

  const tabStyle = (active) => ({
    background: active ? `rgba(${theme.glowColor},0.2)` : 'transparent',
    color: active ? theme.uiAccent : '#6b7280',
    border: active ? `1px solid rgba(${theme.glowColor},0.4)` : '1px solid transparent',
  })

  if (compact) {
    return (
      <div className="relative">
        <motion.button
          onClick={() => setOpen(!open)}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-sm"
          style={{ background: `rgba(${theme.glowColor},0.12)`, border: `1px solid rgba(${theme.glowColor},0.3)`, color: theme.uiAccent }}>
          👥 Arkadaşlar
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-black">
              {requests.length}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-80 rounded-2xl z-50 overflow-hidden"
              style={panelStyle}>
              <FriendPanel
                tab={tab} setTab={setTab}
                friends={friends} requests={requests}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                searchResults={searchResults} searching={searching}
                isFriend={isFriend} hasPendingRequest={hasPendingRequest}
                sendRequest={sendRequest} acceptRequest={acceptRequest}
                declineRequest={declineRequest} removeFriend={removeFriend}
                inviteFriend={inviteFriend}
                theme={theme} tabStyle={tabStyle} lobbyId={lobbyId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={panelStyle}>
      <FriendPanel
        tab={tab} setTab={setTab}
        friends={friends} requests={requests}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        searchResults={searchResults} searching={searching}
        isFriend={isFriend} hasPendingRequest={hasPendingRequest}
        sendRequest={sendRequest} acceptRequest={acceptRequest}
        declineRequest={declineRequest} removeFriend={removeFriend}
        inviteFriend={inviteFriend}
        theme={theme} tabStyle={tabStyle} lobbyId={lobbyId}
      />
    </div>
  )
}

function FriendPanel({ tab, setTab, friends, requests, searchQuery, setSearchQuery,
  searchResults, searching, isFriend, hasPendingRequest,
  sendRequest, acceptRequest, declineRequest, removeFriend, inviteFriend,
  theme, tabStyle, lobbyId }) {

  return (
    <div>
      <div className="flex items-center gap-1 p-3 border-b" style={{ borderColor: `rgba(${theme.glowColor},0.15)` }}>
        {[
          { id: 'friends', label: `👥 ${friends.length}`, full: 'Arkadaşlar' },
          { id: 'requests', label: `📨 ${requests.length}`, full: 'İstekler' },
          { id: 'search', label: '🔍', full: 'Ara' },
        ].map(t => (
          <motion.button key={t.id}
            onClick={() => setTab(t.id)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={tabStyle(tab === t.id)}>
            {t.label} <span className="hidden sm:inline">{t.full}</span>
          </motion.button>
        ))}
      </div>

      <div className="p-3 max-h-72 overflow-y-auto">
        {tab === 'friends' && (
          <div className="space-y-1.5">
            {friends.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-sm">
                <div className="text-3xl mb-2">👥</div>
                Henüz arkadaşın yok.<br />Aramadan ekle!
              </div>
            ) : friends.map(f => (
              <div key={f.uid} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: f.color || '#6366f1', boxShadow: `0 0 10px ${f.color || '#6366f1'}66` }}>
                  {f.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm truncate">{f.name}</div>
                </div>
                <div className="flex gap-1">
                  {lobbyId && (
                    <motion.button onClick={() => inviteFriend(f.uid, f.name)}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className="px-2 py-1 rounded-lg text-xs font-bold text-green-400"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
                      title="Lobiye Davet Et">
                      🎮
                    </motion.button>
                  )}
                  <motion.button onClick={() => removeFriend(f.uid, f.name)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="px-2 py-1 rounded-lg text-xs font-bold text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                    title="Arkadaşlıktan Çıkar">
                    ✕
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-1.5">
            {requests.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-sm">
                <div className="text-3xl mb-2">📨</div>
                Bekleyen istek yok
              </div>
            ) : requests.map(r => (
              <motion.div key={r.uid}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-2 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: r.color || '#6366f1' }}>
                  {r.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-xs truncate">{r.name}</div>
                  <div className="text-gray-500 text-xs">Arkadaşlık isteği</div>
                </div>
                <div className="flex gap-1">
                  <motion.button onClick={() => acceptRequest(r.uid, r.name, r.color)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="px-2 py-1 rounded-lg text-xs font-bold text-green-400"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    ✓
                  </motion.button>
                  <motion.button onClick={() => declineRequest(r.uid)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="px-2 py-1 rounded-lg text-xs font-bold text-red-400"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    ✕
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'search' && (
          <div className="space-y-2">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="İsim ile ara... (min 2 karakter)"
              className="w-full px-3 py-2 rounded-xl text-white text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${theme.glowColor},0.3)`, outline: 'none', color: 'white' }}
            />
            {searching && <div className="text-center text-gray-500 text-xs py-2">Aranıyor...</div>}
            <div className="space-y-1.5">
              {searchResults.map(u => (
                <div key={u.uid} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                    style={{ background: u.color || '#6366f1', boxShadow: `0 0 10px ${u.color || '#6366f1'}66` }}>
                    {u.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{u.name}</div>
                  </div>
                  {isFriend(u.uid) ? (
                    <span className="text-xs text-green-400 font-bold">✓ Arkadaş</span>
                  ) : hasPendingRequest(u.uid) ? (
                    <span className="text-xs text-yellow-400 font-bold">⏳ Bekliyor</span>
                  ) : (
                    <motion.button
                      onClick={() => sendRequest(u.uid, u.name, u.color)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: `rgba(${theme.glowColor},0.2)`, border: `1px solid rgba(${theme.glowColor},0.4)`, color: theme.uiAccent }}>
                      + Ekle
                    </motion.button>
                  )}
                </div>
              ))}
              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="text-center text-gray-600 text-xs py-3">Sonuç bulunamadı</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
