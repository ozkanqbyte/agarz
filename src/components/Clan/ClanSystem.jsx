import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ref, set, get, push, onValue, remove, update } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

const CLAN_RANKS = {
  god: { label: '⚡ Tanrı', color: '#fbbf24', power: 100 },
  leader: { label: '👑 Lider', color: '#f97316', power: 90 },
  co_leader: { label: '⭐ Yardımcı', color: '#a78bfa', power: 70 },
  elder: { label: '🛡️ Yaşlı', color: '#06b6d4', power: 50 },
  member: { label: '⚔️ Üye', color: '#6b7280', power: 10 },
}

export default function ClanSystem() {
  const { user, profile, updateProfile } = useAuthStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)
  const navigate = useNavigate()

  const [tab, setTab] = useState('my')
  const [clans, setClans] = useState([])
  const [myClan, setMyClan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newClanName, setNewClanName] = useState('')
  const [newClanTag, setNewClanTag] = useState('')
  const [newClanDesc, setNewClanDesc] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const clansRef = ref(db, 'clans')
    const unsub = onValue(clansRef, (snap) => {
      if (!snap.exists()) { setClans([]); return }
      const data = Object.entries(snap.val()).map(([id, c]) => ({ id, ...c }))
      setClans(data)
      if (profile?.clan) {
        const found = data.find(c => c.tag === profile.clan || c.id === profile.clan)
        setMyClan(found || null)
      }
    }, (err) => {
      console.warn('Clan read error:', err?.code)
    })
    return () => unsub()
  }, [profile?.clan])

  const createClan = async () => {
    if (!newClanName.trim() || !newClanTag.trim()) { toast.error('İsim ve etiket gerekli!'); return }
    if (newClanTag.length > 5) { toast.error('Etiket max 5 karakter!'); return }
    if (profile?.clan) { toast.error('Zaten bir klanda varsın!'); return }
    setLoading(true)
    const clanId = uuidv4().slice(0, 12)
    const clanData = {
      id: clanId,
      name: newClanName.trim(),
      tag: newClanTag.toUpperCase().trim(),
      description: newClanDesc.trim() || 'Yeni bir klan!',
      leader: user.uid,
      leaderName: profile?.name || 'Lider',
      members: {
        [user.uid]: {
          uid: user.uid,
          name: profile?.name || 'Player',
          rank: 'leader',
          joinedAt: Date.now()
        }
      },
      xp: 0,
      level: 1,
      createdAt: Date.now(),
      open: true,
      minLevel: 1
    }
    try {
      await set(ref(db, `clans/${clanId}`), clanData)
      await updateProfile({ clan: newClanTag.toUpperCase() })
      toast.success('Klan oluşturuldu! ⚔️')
      setCreating(false)
    } catch (e) {
      if (e?.code === 'PERMISSION_DENIED') {
        toast.error('Firebase izni gerekli. Firebase Console → Realtime Database → Rules → Publish yapın.')
      } else {
        toast.error('Klan oluşturulamadı: ' + (e?.message || 'Hata'))
      }
    }
    setLoading(false)
  }

  const joinClan = async (clan) => {
    if (profile?.clan) { toast.error('Önce mevcut klandan ayrıl!'); return }
    setLoading(true)
    try {
      await update(ref(db, `clans/${clan.id}/members/${user.uid}`), {
        uid: user.uid,
        name: profile?.name || 'Player',
        rank: 'member',
        joinedAt: Date.now()
      })
      await updateProfile({ clan: clan.tag })
      toast.success(`${clan.name} klanına katıldın! ⚔️`)
    } catch (e) {
      toast.error('Katılma başarısız: ' + (e?.message || 'Hata'))
    }
    setLoading(false)
  }

  const leaveClan = async () => {
    if (!myClan) return
    if (myClan.leader === user.uid) {
      toast.error('Lider olarak ayrılamazsın! Önce liderliği devret.')
      return
    }
    try { await remove(ref(db, `clans/${myClan.id}/members/${user.uid}`)) } catch {}
    await updateProfile({ clan: null })
    setMyClan(null)
    toast.success('Klandan ayrıldın.')
  }

  const promoteGod = async (memberId) => {
    if (!profile?.isGod) { toast.error('Sadece Tanrılar bu yetkiye sahip!'); return }
    await update(ref(db, `clans/${myClan.id}/members/${memberId}`), { rank: 'god' })
    toast.success('God yetkisi verildi! ⚡')
  }

  const promoteMember = async (memberId, newRank) => {
    if (myClan?.leader !== user.uid && !profile?.isGod) { toast.error('Yetki yok!'); return }
    await update(ref(db, `clans/${myClan.id}/members/${memberId}`), { rank: newRank })
    toast.success('Rütbe güncellendi!')
  }

  const filteredClans = clans.filter(c =>
    !profile?.clan &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     c.tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: theme.menuBg }}>

      <div className="flex items-center gap-4 px-6 py-4 border-b"
        style={{ background: theme.uiBg, borderColor: theme.uiBorder }}>
        <button onClick={() => navigate('/menu')} className="text-gray-400 hover:text-white transition-colors">
          ← Menü
        </button>
        <h1 className="text-xl font-black text-white">⚔️ Klan Sistemi</h1>
      </div>

      <div className="flex border-b"
        style={{ background: theme.uiBg, borderColor: theme.uiBorder }}>
        {[
          { id: 'my', label: '🏠 Klanım' },
          { id: 'browse', label: '🔍 Keşfet' },
          { id: 'ranks', label: '📊 Rütbeler' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-3 text-sm font-bold transition-all"
            style={{
              color: tab === t.id ? theme.uiAccent : '#6b7280',
              borderBottom: tab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
              background: tab === t.id ? `rgba(${theme.glowColor},0.1)` : 'transparent'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'my' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {!profile?.clan ? (
              <div className="space-y-4">
                <div className="rounded-2xl p-6 text-center"
                  style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>
                  <div className="text-5xl mb-3">⚔️</div>
                  <div className="text-white font-bold text-lg">Henüz bir klana üye değilsin</div>
                  <div className="text-gray-400 text-sm mt-2">Klan kur veya mevcut bir klana katıl</div>
                  <div className="flex gap-3 justify-center mt-4">
                    <motion.button onClick={() => setCreating(true)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 rounded-xl font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                      + Klan Kur
                    </motion.button>
                    <motion.button onClick={() => setTab('browse')}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 rounded-xl font-bold"
                      style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${theme.uiBorder}`, color: theme.uiText }}>
                      Keşfet
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence>
                  {creating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl p-5 space-y-3"
                      style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>
                      <div className="font-bold text-white">Yeni Klan Oluştur</div>
                      <input
                        type="text"
                        placeholder="Klan İsmi"
                        value={newClanName}
                        onChange={e => setNewClanName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.uiBorder}` }}
                      />
                      <input
                        type="text"
                        placeholder="Klan Etiketi (max 5 harf, ör: AGARZ)"
                        value={newClanTag}
                        onChange={e => setNewClanTag(e.target.value.slice(0, 5))}
                        className="w-full px-4 py-3 rounded-xl text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.uiBorder}` }}
                      />
                      <textarea
                        placeholder="Klan Açıklaması (isteğe bağlı)"
                        value={newClanDesc}
                        onChange={e => setNewClanDesc(e.target.value.slice(0, 200))}
                        className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none"
                        rows={2}
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.uiBorder}` }}
                      />
                      <div className="flex gap-3">
                        <motion.button onClick={createClan} disabled={loading}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50"
                          style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                          {loading ? '...' : 'Klan Kur ⚔️'}
                        </motion.button>
                        <button onClick={() => setCreating(false)}
                          className="px-4 py-3 rounded-xl font-bold"
                          style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af' }}>
                          İptal
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : myClan ? (
              <div className="space-y-4">
                <div className="rounded-2xl p-5"
                  style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                      [{myClan.tag}]
                    </div>
                    <div>
                      <div className="text-white font-black text-xl">{myClan.name}</div>
                      <div className="text-gray-400 text-sm">{myClan.description}</div>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs" style={{ color: theme.uiAccent }}>⭐ Seviye {myClan.level}</span>
                        <span className="text-xs text-gray-400">{Object.keys(myClan.members || {}).length} üye</span>
                        <span className="text-xs text-gray-400">{myClan.xp || 0} XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden"
                  style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>
                  <div className="px-4 py-3 font-bold text-white border-b" style={{ borderColor: theme.uiBorder }}>
                    👥 Üyeler ({Object.keys(myClan.members || {}).length})
                  </div>
                  <div className="divide-y" style={{ borderColor: theme.uiBorder }}>
                    {Object.entries(myClan.members || {}).map(([uid, member]) => {
                      const rankInfo = CLAN_RANKS[member.rank] || CLAN_RANKS.member
                      return (
                        <div key={uid} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ background: rankInfo.color + '33', border: `1px solid ${rankInfo.color}` }}>
                            {rankInfo.label.split(' ')[0]}
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm font-bold">{member.name}</div>
                            <div className="text-xs" style={{ color: rankInfo.color }}>{rankInfo.label}</div>
                          </div>
                          {myClan.leader === user?.uid && uid !== user?.uid && (
                            <select
                              onChange={e => promoteMember(uid, e.target.value)}
                              defaultValue={member.rank}
                              className="text-xs rounded-lg px-2 py-1 outline-none"
                              style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${theme.uiBorder}`, color: 'white' }}>
                              {Object.entries(CLAN_RANKS).filter(([k]) => k !== 'god').map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          )}
                          {profile?.isGod && uid !== user?.uid && member.rank !== 'god' && (
                            <button onClick={() => promoteGod(uid)}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
                              ⚡ God
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <motion.button onClick={leaveClan}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl font-bold"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  🚪 Klandan Ayrıl
                </motion.button>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">Klan bilgisi yükleniyor...</div>
            )}
          </div>
        )}

        {tab === 'browse' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <input
              type="text"
              placeholder="Klan ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-white outline-none"
              style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}
            />
            {filteredClans.length === 0 && !profile?.clan && (
              <div className="text-center text-gray-400 py-8">
                {clans.length === 0 ? 'Henüz klan yok. İlk klana sen kur!' : 'Sonuç bulunamadı'}
              </div>
            )}
            {profile?.clan && (
              <div className="rounded-xl p-4 text-center"
                style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}`, color: '#9ca3af' }}>
                Zaten bir klandasın. Önce ayrılman gerekiyor.
              </div>
            )}
            {filteredClans.map(clan => (
              <motion.div key={clan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${theme.gradientA}, ${theme.gradientB})` }}>
                  [{clan.tag}]
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">{clan.name}</div>
                  <div className="text-gray-400 text-xs">{clan.description}</div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs" style={{ color: theme.uiAccent }}>👥 {Object.keys(clan.members || {}).length} üye</span>
                    <span className="text-xs text-gray-400">⭐ Seviye {clan.level}</span>
                  </div>
                </div>
                <motion.button onClick={() => joinClan(clan)} disabled={loading}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: `rgba(${theme.glowColor},0.3)`, border: `1px solid ${theme.uiAccent}` }}>
                  Katıl
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'ranks' && (
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="text-white font-bold text-lg mb-4">📊 Klan Rütbeleri</div>
            {Object.entries(CLAN_RANKS).map(([key, rank]) => (
              <div key={key} className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: rank.color + '22', border: `1px solid ${rank.color}` }}>
                  {rank.label.split(' ')[0]}
                </div>
                <div>
                  <div className="font-bold" style={{ color: rank.color }}>{rank.label}</div>
                  <div className="text-gray-400 text-sm">Güç: {rank.power}/100</div>
                </div>
                <div className="ml-auto">
                  <div className="w-24 h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${rank.power}%`, background: rank.color }}></div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl p-4 mt-4"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <div className="font-bold text-yellow-400">⚡ GOD Modu</div>
              <div className="text-sm text-gray-300 mt-1">
                God yetkisi sadece premium GOD paketi sahiplerine veya yöneticiler tarafından verilebilir.
                God oyuncular tüm klan ayarlarına erişebilir ve sınırsız yetki sahibidir.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
