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
  leader:    { label: 'Lider',     color: '#f97316', power: 100, canPromote: true, canKick: true, canEdit: true },
  co_leader: { label: 'Yardımcı', color: '#a78bfa', power: 70,  canPromote: true, canKick: true, canEdit: false },
  elder:     { label: 'Yaşlı',    color: '#06b6d4', power: 50,  canPromote: false, canKick: false, canEdit: false },
  member:    { label: 'Üye',       color: '#6b7280', power: 10,  canPromote: false, canKick: false, canEdit: false },
}

const CLAN_AVATARS = ['⚔️','🐉','🦁','🔥','💎','🌌','🌊','⚡','🌙','🏆','🗡️','🛡️','👑','🌀','🧊','🍀','🦅','🐺','🌸','🎯']

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
  const [newClanAvatar, setNewClanAvatar] = useState('⚔️')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [adminTab, setAdminTab] = useState('members')
  const [editingClan, setEditingClan] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [transferTo, setTransferTo] = useState('')

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
    }, (err) => { console.warn('Clan read error:', err?.code) })
    return () => unsub()
  }, [profile?.clan])

  const myRank = myClan?.members?.[user?.uid]?.rank || 'member'
  const myRankInfo = CLAN_RANKS[myRank] || CLAN_RANKS.member
  const isLeader = myRank === 'leader'
  const canManage = myRankInfo.canPromote

  const createClan = async () => {
    if (!newClanName.trim() || !newClanTag.trim()) { toast.error('İsim ve etiket gerekli!'); return }
    if (newClanTag.length > 5) { toast.error('Etiket max 5 karakter!'); return }
    if (profile?.clan) { toast.error('Zaten bir klandasın!'); return }
    setLoading(true)
    const clanId = uuidv4().slice(0, 12)
    const clanData = {
      id: clanId,
      name: newClanName.trim(),
      tag: newClanTag.toUpperCase().trim(),
      description: newClanDesc.trim() || 'Yeni bir klan!',
      avatar: newClanAvatar,
      leader: user.uid,
      leaderName: profile?.name || 'Lider',
      members: {
        [user.uid]: { uid: user.uid, name: profile?.name || 'Player', rank: 'leader', joinedAt: Date.now() }
      },
      xp: 0, level: 1, createdAt: Date.now(), open: true, minLevel: 1
    }
    try {
      await set(ref(db, `clans/${clanId}`), clanData)
      await updateProfile({ clan: newClanTag.toUpperCase() })
      toast.success('Klan oluşturuldu!')
      setCreating(false)
    } catch (e) {
      toast.error('Klan oluşturulamadı: ' + (e?.message || 'Hata'))
    }
    setLoading(false)
  }

  const joinClan = async (clan) => {
    if (profile?.clan) { toast.error('Önce mevcut klandan ayrıl!'); return }
    setLoading(true)
    try {
      await update(ref(db, `clans/${clan.id}/members/${user.uid}`), {
        uid: user.uid, name: profile?.name || 'Player', rank: 'member', joinedAt: Date.now()
      })
      await updateProfile({ clan: clan.tag })
      toast.success(`${clan.name} klanına katıldın!`)
    } catch (e) { toast.error('Katılma başarısız: ' + (e?.message || 'Hata')) }
    setLoading(false)
  }

  const leaveClan = async () => {
    if (!myClan) return
    if (isLeader) { toast.error('Önce liderliği devret!'); return }
    try { await remove(ref(db, `clans/${myClan.id}/members/${user.uid}`)) } catch {}
    await updateProfile({ clan: null })
    setMyClan(null)
    toast.success('Klandan ayrıldın.')
  }

  const kickMember = async (memberId) => {
    if (!canManage) { toast.error('Yetki yok!'); return }
    const memberRank = myClan.members?.[memberId]?.rank
    if (memberRank === 'leader') { toast.error('Lideri atamazsın!'); return }
    if (memberRank === 'co_leader' && !isLeader) { toast.error('Yardımcıyı sadece lider atar!'); return }
    try {
      await remove(ref(db, `clans/${myClan.id}/members/${memberId}`))
      toast.success('Üye atıldı.')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const promoteRank = async (memberId, newRank) => {
    if (!canManage) { toast.error('Yetki yok!'); return }
    const memberRank = myClan.members?.[memberId]?.rank
    if (memberRank === 'leader' || newRank === 'leader') { toast.error('Lider değiştirilemez bu şekilde!'); return }
    try {
      await update(ref(db, `clans/${myClan.id}/members/${memberId}`), { rank: newRank })
      toast.success('Rütbe güncellendi!')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const transferLeadership = async () => {
    if (!transferTo || !isLeader) return
    try {
      await update(ref(db, `clans/${myClan.id}/members/${transferTo}`), { rank: 'leader' })
      await update(ref(db, `clans/${myClan.id}/members/${user.uid}`), { rank: 'co_leader' })
      await update(ref(db, `clans/${myClan.id}`), { leader: transferTo, leaderName: myClan.members?.[transferTo]?.name || '?' })
      toast.success('Liderlik devredildi!')
      setTransferTo('')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const saveEditClan = async () => {
    if (!isLeader) return
    try {
      const updates = {}
      if (editName.trim()) updates.name = editName.trim()
      if (editDesc.trim()) updates.description = editDesc.trim()
      if (editAvatar) updates.avatar = editAvatar
      await update(ref(db, `clans/${myClan.id}`), updates)
      toast.success('Klan güncellendi!')
      setEditingClan(false)
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const disbandClan = async () => {
    if (!isLeader) return
    if (!confirm('Klanı silmek istediğine emin misin? Bu işlem geri alınamaz!')) return
    try {
      const members = Object.keys(myClan.members || {})
      for (const uid of members) {
        // reset their clan in firebase
      }
      await remove(ref(db, `clans/${myClan.id}`))
      await updateProfile({ clan: null })
      setMyClan(null)
      toast.success('Klan dağıtıldı.')
    } catch (e) { toast.error('Hata: ' + e?.message) }
  }

  const filteredClans = clans.filter(c =>
    !profile?.clan &&
    (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     c.tag?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const panelStyle = { background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.uiBorder}`, color: '#fff', padding: '10px 14px', borderRadius: 10, outline: 'none', width: '100%', fontSize: 13 }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.menuBg }}>
      <div className="flex items-center gap-4 px-6 py-4 border-b" style={{ background: theme.uiBg, borderColor: theme.uiBorder }}>
        <button onClick={() => navigate('/menu')} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Menü</button>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>KLAN SİSTEMİ</span>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.uiBorder}`, background: theme.uiBg }}>
        {[{id:'my',label:'KLANIM'},{id:'browse',label:'KEŞFET'},{id:'ranks',label:'RÜTBELER'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.id ? theme.uiAccent : '#6b7280', fontWeight: 900, fontSize: 11, letterSpacing: 1.5,
              borderBottom: tab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'my' && (
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!profile?.clan ? (
              <>
                <div className="rounded-2xl p-6 text-center" style={panelStyle}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>⚔️</div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Henüz bir klana üye değilsin</div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Klan kur veya mevcut bir klana katıl</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <motion.button onClick={() => setCreating(v => !v)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                      style={{ padding: '10px 24px', borderRadius: 12, fontWeight: 900, color: '#fff', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})` }}>
                      + Klan Kur
                    </motion.button>
                    <motion.button onClick={() => setTab('browse')} whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                      style={{ padding: '10px 24px', borderRadius: 12, fontWeight: 700, border: `1px solid ${theme.uiBorder}`, color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                      Keşfet
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence>
                  {creating && (
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                      className="rounded-2xl p-5" style={panelStyle}>
                      <div style={{ fontWeight: 900, color: '#fff', marginBottom: 14, fontSize: 15 }}>Yeni Klan Oluştur</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input style={inputStyle} placeholder="Klan İsmi" value={newClanName} onChange={e=>setNewClanName(e.target.value)} />
                        <input style={inputStyle} placeholder="Etiket (max 5 harf)" value={newClanTag} onChange={e=>setNewClanTag(e.target.value.slice(0,5).toUpperCase())} />
                        <textarea style={{...inputStyle,resize:'none'}} placeholder="Açıklama (isteğe bağlı)" value={newClanDesc} onChange={e=>setNewClanDesc(e.target.value.slice(0,200))} rows={2} />
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>KLAN AVATARI</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {CLAN_AVATARS.map(av => (
                              <button key={av} onClick={() => setNewClanAvatar(av)}
                                style={{ width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer', border: newClanAvatar===av?`2px solid ${theme.uiAccent}`:'2px solid transparent', background: newClanAvatar===av?`rgba(${theme.glowColor},0.2)`:'rgba(255,255,255,0.05)', boxShadow: newClanAvatar===av?`0 0 10px rgba(${theme.glowColor},0.4)`:undefined }}>
                                {av}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <motion.button onClick={createClan} disabled={loading} whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                            style={{ flex:1,padding:'11px',borderRadius:10,fontWeight:900,color:'#fff',border:'none',cursor:'pointer',background:`linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`,opacity:loading?0.6:1 }}>
                            {loading ? '...' : 'Klan Kur'}
                          </motion.button>
                          <button onClick={() => setCreating(false)}
                            style={{ padding:'11px 16px',borderRadius:10,background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'none',cursor:'pointer',fontWeight:700 }}>İptal</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : myClan ? (
              <>
                <div className="rounded-2xl p-5" style={panelStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: `linear-gradient(135deg,${theme.gradientA},${theme.gradientB})` }}>
                      {myClan.avatar || '⚔️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{myClan.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>[{myClan.tag}] — {myClan.description}</div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                        <span style={{ color: theme.uiAccent, fontSize: 11, fontWeight: 700 }}>Seviye {myClan.level}</span>
                        <span style={{ color: '#6b7280', fontSize: 11 }}>{Object.keys(myClan.members||{}).length} üye</span>
                        <span style={{ color: '#6b7280', fontSize: 11 }}>{myClan.xp||0} XP</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 10, background: `${myRankInfo.color}20`, border: `1px solid ${myRankInfo.color}60` }}>
                      <span style={{ color: myRankInfo.color, fontWeight: 900, fontSize: 11 }}>{myRankInfo.label.toUpperCase()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', borderTop: `1px solid ${theme.uiBorder}`, marginTop: 14, paddingTop: 14 }}>
                    <div style={{ width: '100%', height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg,${theme.gradientA},${theme.gradientB})`, width: `${Math.min(100,(myClan.xp||0)%1000/10)}%` }} />
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="rounded-2xl" style={panelStyle}>
                    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.uiBorder}` }}>
                      {[{id:'members',label:'ÜYELER'},{id:'settings',label:'AYARLAR'},...(isLeader?[{id:'transfer',label:'DEVİR'}]:[])].map(t => (
                        <button key={t.id} onClick={() => setAdminTab(t.id)}
                          style={{ flex:1,padding:'10px 0',background:'none',border:'none',cursor:'pointer',
                            color:adminTab===t.id?'#fff':'#4b5563',fontWeight:900,fontSize:10,letterSpacing:1.5,
                            borderBottom:adminTab===t.id?`2px solid ${theme.uiAccent}`:'2px solid transparent' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: 14 }}>
                      {adminTab === 'members' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {Object.entries(myClan.members || {}).map(([uid, member]) => {
                            const rInfo = CLAN_RANKS[member.rank] || CLAN_RANKS.member
                            const isMe = uid === user?.uid
                            const memberIsLeader = member.rank === 'leader'
                            return (
                              <div key={uid} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,background:`${rInfo.color}18`,border:`1.5px solid ${rInfo.color}50` }}>
                                  {member.rank==='leader'?'👑':member.rank==='co_leader'?'⭐':member.rank==='elder'?'🛡️':'⚔️'}
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ color:'#fff',fontWeight:700,fontSize:13 }}>{member.name}{isMe&&' (Sen)'}</div>
                                  <div style={{ color:rInfo.color,fontSize:10,fontWeight:700,letterSpacing:0.5 }}>{rInfo.label.toUpperCase()}</div>
                                </div>
                                {!isMe && !memberIsLeader && (
                                  <div style={{ display:'flex',gap:6 }}>
                                    <select onChange={e => promoteRank(uid, e.target.value)} defaultValue={member.rank}
                                      style={{ fontSize:10,borderRadius:7,padding:'4px 8px',background:'rgba(255,255,255,0.06)',border:`1px solid ${theme.uiBorder}`,color:'#fff',cursor:'pointer',outline:'none' }}>
                                      {Object.entries(CLAN_RANKS).filter(([k]) => k !== 'leader').map(([k,v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                      ))}
                                    </select>
                                    <button onClick={() => kickMember(uid)}
                                      style={{ fontSize:10,padding:'4px 8px',borderRadius:7,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',cursor:'pointer',fontWeight:700 }}>
                                      AT
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {adminTab === 'settings' && isLeader && (
                        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                          <input style={inputStyle} placeholder="Yeni klan ismi" value={editName} onChange={e=>setEditName(e.target.value)} defaultValue={myClan.name} />
                          <textarea style={{...inputStyle,resize:'none'}} placeholder="Yeni açıklama" value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={2} defaultValue={myClan.description} />
                          <div>
                            <div style={{ fontSize:11,color:'#6b7280',marginBottom:8,fontWeight:700,letterSpacing:1 }}>AVATAR SEÇ</div>
                            <div style={{ display:'flex',flexWrap:'wrap',gap:7 }}>
                              {CLAN_AVATARS.map(av => (
                                <button key={av} onClick={() => setEditAvatar(av)}
                                  style={{ width:34,height:34,borderRadius:8,fontSize:17,cursor:'pointer',border:editAvatar===av?`2px solid ${theme.uiAccent}`:'2px solid transparent',background:editAvatar===av?`rgba(${theme.glowColor},0.2)`:'rgba(255,255,255,0.05)' }}>
                                  {av}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display:'flex',gap:8 }}>
                            <button onClick={saveEditClan}
                              style={{ flex:1,padding:'10px',borderRadius:10,background:`linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`,color:'#fff',fontWeight:900,border:'none',cursor:'pointer',fontSize:12 }}>
                              Kaydet
                            </button>
                            <button onClick={disbandClan}
                              style={{ padding:'10px 16px',borderRadius:10,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',fontWeight:700,cursor:'pointer',fontSize:11 }}>
                              Dağıt
                            </button>
                          </div>
                        </div>
                      )}

                      {adminTab === 'transfer' && isLeader && (
                        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                          <div style={{ color:'#9ca3af',fontSize:12 }}>Liderliği devretmek istediğin üyeyi seç:</div>
                          <select value={transferTo} onChange={e=>setTransferTo(e.target.value)}
                            style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">-- Üye seç --</option>
                            {Object.entries(myClan.members || {}).filter(([uid]) => uid !== user?.uid).map(([uid, m]) => (
                              <option key={uid} value={uid}>{m.name} ({m.rank})</option>
                            ))}
                          </select>
                          <button onClick={transferLeadership} disabled={!transferTo}
                            style={{ padding:'10px',borderRadius:10,background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.4)',color:'#fbbf24',fontWeight:900,cursor:'pointer',fontSize:12,opacity:!transferTo?0.5:1 }}>
                            Liderliği Devret
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!canManage && (
                  <div className="rounded-2xl p-4" style={panelStyle}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>ÜYELER</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(myClan.members || {}).map(([uid, member]) => {
                        const rInfo = CLAN_RANKS[member.rank] || CLAN_RANKS.member
                        return (
                          <div key={uid} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:8,background:'rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize:16 }}>{member.rank==='leader'?'👑':member.rank==='co_leader'?'⭐':member.rank==='elder'?'🛡️':'⚔️'}</span>
                            <span style={{ color:'#e2e8f0',fontSize:12,fontWeight:700 }}>{member.name}</span>
                            <span style={{ color:rInfo.color,fontSize:10,marginLeft:'auto',fontWeight:700 }}>{rInfo.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <button onClick={leaveClan}
                  style={{ width:'100%',padding:12,borderRadius:12,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',fontWeight:700,cursor:'pointer',fontSize:13 }}>
                  Klandan Ayrıl
                </button>
              </>
            ) : (
              <div style={{ textAlign:'center',color:'#4b5563',padding:'48px 0' }}>Klan bilgisi yükleniyor...</div>
            )}
          </div>
        )}

        {tab === 'browse' && (
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Klan ara..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              style={{ ...inputStyle, background: theme.uiBg }} />
            {profile?.clan && (
              <div style={{ borderRadius:12,padding:14,textAlign:'center',background:theme.uiBg,border:`1px solid ${theme.uiBorder}`,color:'#6b7280',fontSize:13 }}>
                Zaten bir klandasın. Önce ayrılman gerekiyor.
              </div>
            )}
            {filteredClans.length === 0 && !profile?.clan && (
              <div style={{ textAlign:'center',color:'#4b5563',padding:'40px 0',fontSize:13 }}>
                {clans.length === 0 ? 'Henüz klan yok. İlk klanı sen kur!' : 'Sonuç bulunamadı'}
              </div>
            )}
            {filteredClans.map(clan => (
              <motion.div key={clan.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                style={{ borderRadius:16,padding:14,display:'flex',alignItems:'center',gap:12,...panelStyle }}>
                <div style={{ width:52,height:52,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,background:`linear-gradient(135deg,${theme.gradientA},${theme.gradientB})`,flexShrink:0 }}>
                  {clan.avatar || '⚔️'}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ color:'#fff',fontWeight:900,fontSize:15 }}>{clan.name} <span style={{ color:'#4b5563',fontWeight:700,fontSize:12 }}>[{clan.tag}]</span></div>
                  <div style={{ color:'#6b7280',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{clan.description}</div>
                  <div style={{ display:'flex',gap:12,marginTop:4 }}>
                    <span style={{ color:theme.uiAccent,fontSize:10,fontWeight:700 }}>{Object.keys(clan.members||{}).length} üye</span>
                    <span style={{ color:'#6b7280',fontSize:10 }}>Seviye {clan.level}</span>
                  </div>
                </div>
                <motion.button onClick={() => joinClan(clan)} disabled={!!profile?.clan || loading} whileHover={{scale:1.06}} whileTap={{scale:0.94}}
                  style={{ padding:'8px 16px',borderRadius:10,fontWeight:900,fontSize:12,color:'#fff',border:'none',cursor:'pointer',background:`rgba(${theme.glowColor},0.3)`,opacity:profile?.clan?0.4:1 }}>
                  Katıl
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'ranks' && (
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ color:'#fff',fontWeight:900,fontSize:16,marginBottom:6,letterSpacing:1 }}>KLAN RÜTBELERİ</div>
            {Object.entries(CLAN_RANKS).map(([key, rank]) => (
              <div key={key} style={{ borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,...panelStyle }}>
                <div style={{ width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,background:`${rank.color}18`,border:`2px solid ${rank.color}50` }}>
                  {key==='leader'?'👑':key==='co_leader'?'⭐':key==='elder'?'🛡️':'⚔️'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:rank.color,fontWeight:900,fontSize:14 }}>{rank.label}</div>
                  <div style={{ color:'#4b5563',fontSize:11,marginTop:2 }}>
                    {rank.canEdit?'Klan ayarları':''}{rank.canPromote?' · Üye yönetimi':''}{rank.canKick?' · Üye atma':''}
                    {!rank.canPromote&&!rank.canKick?'Standart üye':''}
                  </div>
                </div>
                <div style={{ width:60 }}>
                  <div style={{ height:4,borderRadius:4,background:'rgba(255,255,255,0.06)',overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:4,background:rank.color,width:`${rank.power}%` }} />
                  </div>
                  <div style={{ color:'#4b5563',fontSize:9,marginTop:3,textAlign:'right',fontWeight:700 }}>{rank.power}/100</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
