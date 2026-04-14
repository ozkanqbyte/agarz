import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, push, onValue, off, query, orderByChild, limitToLast } from 'firebase/database'
import { db } from '../../firebase/config'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import { getTheme } from '../../themes/themes'
import { socketClient } from '../../game/SocketClient'

const MAX_MESSAGES = 50
const CHAT_CHANNELS = ['room', 'global', 'clan']
const CHANNEL_LABELS = { global: '🌍 Global', room: '🏠 Oda', clan: '⚔️ Klan' }
const QUICK_EMOJIS = ['👋', '😂', '🔥', '💀', '❤️', '👑', '⚔️', '🛡️', '😈', '🤣']

const SPAM_WINDOW_MS = 10000
const SPAM_LIMIT = 3
const MUTE_DURATION_MS = 30000

export default function ChatSystem({ roomId }) {
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState('room')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const [showEmoji, setShowEmoji] = useState(false)
  const [warnMsg, setWarnMsg] = useState('')
  const [mutedUntil, setMutedUntil] = useState(0)
  const [muteCountdown, setMuteCountdown] = useState(0)

  const messagesEndRef = useRef(null)
  const msgTimestamps = useRef([])
  const lastSentText = useRef('')
  const warnTimer = useRef(null)
  const muteInterval = useRef(null)

  const { user, profile } = useAuthStore()
  const { currentTheme } = useGameStore()
  const theme = getTheme(currentTheme)

  const safeRoomId = (roomId || 'main').replace(/[.#$[\]/\s:?&=]/g, '_').slice(0, 80)

  const showWarn = useCallback((msg) => {
    setWarnMsg(msg)
    clearTimeout(warnTimer.current)
    warnTimer.current = setTimeout(() => setWarnMsg(''), 2500)
  }, [])

  useEffect(() => {
    clearInterval(muteInterval.current)
    if (mutedUntil > Date.now()) {
      muteInterval.current = setInterval(() => {
        const remaining = Math.ceil((mutedUntil - Date.now()) / 1000)
        if (remaining <= 0) { setMuteCountdown(0); clearInterval(muteInterval.current) }
        else setMuteCountdown(remaining)
      }, 500)
    } else {
      setMuteCountdown(0)
    }
    return () => clearInterval(muteInterval.current)
  }, [mutedUntil])

  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id))
      if (msg.id && seen.has(msg.id)) return prev
      const next = [...prev, msg]
      return next.slice(-MAX_MESSAGES)
    })
    if (!open) setUnread(u => u + 1)
  }, [open])

  useEffect(() => {
    setMessages([])
    let path
    if (channel === 'room') path = `chat/rooms/${safeRoomId}`
    else if (channel === 'global') path = 'chat/global'
    else path = `chat/clan/${profile?.clan || 'none'}`

    const chatRef = query(ref(db, path), orderByChild('ts'), limitToLast(MAX_MESSAGES))
    const unsub = onValue(chatRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return }
      const data = snap.val()
      const msgs = Object.entries(data)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      setMessages(msgs)
    }, (err) => { console.warn('Chat listen error:', err) })
    return () => off(chatRef)
  }, [channel, safeRoomId, profile?.clan])

  useEffect(() => {
    if (channel !== 'room') return
    const onMsg = (msg) => {
      const msgWithId = { ...msg, id: msg.id || (msg.ts + '_' + msg.playerId) }
      addMessage(msgWithId)
    }
    socketClient.on('chat:message', onMsg)
    return () => socketClient.off('chat:message', onMsg)
  }, [channel, addMessage])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, messages.length])

  const handlePaste = (e) => {
    e.preventDefault()
    showWarn('🚫 Yapıştırma engellendi! Mesajı kendin yaz.')
  }

  const handleInputKeyDown = (e) => {
    e.stopPropagation()
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault()
      showWarn('🚫 Yapıştırma engellendi! Mesajı kendin yaz.')
    }
  }

  const isMuted = Date.now() < mutedUntil

  const sendMessage = async (e, emojiText) => {
    e?.preventDefault()
    const text = (emojiText || input).trim()
    if (!text) return

    const now = Date.now()

    if (now < mutedUntil) {
      showWarn(`🔇 ${Math.ceil((mutedUntil - now) / 1000)}sn sessizsiniz!`)
      return
    }

    const meaningful = text.replace(/[\s\u200B-\u200D\uFEFF]/g, '')
    if (meaningful.length < 2) {
      showWarn('⚠️ Çok kısa mesaj! (min. 2 karakter)')
      return
    }

    if (text === lastSentText.current) {
      showWarn('⚠️ Aynı mesajı tekrar gönderemezsiniz!')
      return
    }

    msgTimestamps.current = msgTimestamps.current.filter(t => now - t < SPAM_WINDOW_MS)
    if (msgTimestamps.current.length >= SPAM_LIMIT) {
      setMutedUntil(now + MUTE_DURATION_MS)
      showWarn('🔇 Çok hızlı mesaj! 30sn sessizleştirildiniz.')
      return
    }

    msgTimestamps.current.push(now)
    lastSentText.current = text

    const msg = {
      text: text.slice(0, 200),
      name: profile?.name || user?.displayName || 'Player',
      uid: user?.uid || 'guest',
      color: profile?.color || '#6366f1',
      isGod: profile?.isGod || false,
      isPremium: !!(profile?.premium && profile.premium !== 'free'),
      ts: Date.now()
    }

    if (channel === 'room') {
      if (socketClient.connected) {
        socketClient.sendChat(text, !!emojiText)
      }
      const path = `chat/rooms/${safeRoomId}`
      try {
        await push(ref(db, path), msg)
      } catch {}
    } else {
      const path = channel === 'global' ? 'chat/global' : `chat/clan/${profile?.clan || 'none'}`
      try {
        await push(ref(db, path), msg)
      } catch {}
    }

    if (!emojiText) setInput('')
    setShowEmoji(false)
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute bottom-6 left-4 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
        style={{ zIndex: 30, background: theme.uiBg, border: `1px solid ${theme.uiBorder}`, color: theme.uiAccent }}>
        💬
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-20 left-4 w-80 rounded-2xl overflow-hidden flex flex-col"
            style={{ zIndex: 30, background: theme.uiBg, border: `1px solid ${theme.uiBorder}`, backdropFilter: 'blur(20px)', maxHeight: '420px' }}>

            <div className="flex items-center justify-between px-4 py-2.5 border-b"
              style={{ borderColor: theme.uiBorder }}>
              <span className="font-bold text-white text-sm">💬 Sohbet</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"/>
                  {socketClient.connected ? `${socketClient.ping}ms` : 'Firebase'}
                </span>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
            </div>

            <div className="flex border-b" style={{ borderColor: theme.uiBorder }}>
              {CHAT_CHANNELS.filter(c => c !== 'clan' || profile?.clan).map(ch => (
                <button key={ch} onClick={() => { setChannel(ch); setMessages([]) }}
                  className="flex-1 py-2 text-xs font-bold transition-all"
                  style={{
                    color: channel === ch ? theme.uiAccent : '#6b7280',
                    borderBottom: channel === ch ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
                    background: channel === ch ? `rgba(${theme.glowColor},0.1)` : 'transparent'
                  }}>
                  {CHANNEL_LABELS[ch]}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ minHeight: '180px', maxHeight: '260px' }}>
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-xs py-6">Henüz mesaj yok</div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={msg.id || i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm leading-snug">
                  <span className="font-bold" style={{ color: msg.color || theme.uiAccent }}>
                    {msg.isGod ? '👑 ' : msg.isPremium ? '💎 ' : ''}{msg.name}:
                  </span>
                  <span className="text-gray-200 ml-1 break-words">{msg.text}</span>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="flex flex-wrap gap-1 px-3 py-2 border-t overflow-hidden"
                  style={{ borderColor: theme.uiBorder }}>
                  {QUICK_EMOJIS.map(em => (
                    <button key={em} onClick={() => sendMessage(null, em)}
                      className="text-xl hover:scale-125 transition-transform">{em}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {warnMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-1.5 text-xs font-bold text-center"
                  style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5', borderTop: '1px solid rgba(239,68,68,0.3)' }}>
                  {warnMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {isMuted && muteCountdown > 0 && !warnMsg && (
              <div className="px-3 py-1 text-xs text-center font-bold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                🔇 Sessizlik biter: {muteCountdown}sn
              </div>
            )}

            <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t" style={{ borderColor: theme.uiBorder }}>
              <button type="button" onClick={() => setShowEmoji(s => !s)}
                className="text-lg flex-shrink-0 hover:scale-110 transition-transform">😊</button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleInputKeyDown}
                placeholder={isMuted ? `🔇 ${muteCountdown}sn sessizsiniz` : 'Mesaj yaz...'}
                disabled={isMuted}
                maxLength={200}
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
                style={{
                  background: isMuted ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${isMuted ? 'rgba(239,68,68,0.4)' : theme.uiBorder}`,
                  cursor: isMuted ? 'not-allowed' : 'text',
                  opacity: isMuted ? 0.6 : 1
                }}
              />
              <motion.button type="submit"
                whileHover={{ scale: isMuted ? 1 : 1.1 }} whileTap={{ scale: isMuted ? 1 : 0.9 }}
                disabled={isMuted}
                className="px-3 py-2 rounded-lg font-bold text-white text-sm flex-shrink-0"
                style={{
                  background: `rgba(${theme.glowColor},${isMuted ? 0.15 : 0.4})`,
                  border: `1px solid ${isMuted ? '#4b5563' : theme.uiAccent}`,
                  cursor: isMuted ? 'not-allowed' : 'pointer'
                }}>
                ➤
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
