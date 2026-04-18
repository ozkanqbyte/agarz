import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

class SocketClient {
  constructor() {
    this._socket = null
    this._connected = false
    this._ping = 0
    this._pingInterval = null
  }

  connect() {
    if (this._socket?.connected) return Promise.resolve()
    return new Promise((resolve, reject) => {
      this._socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 6000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      })
      const timer = setTimeout(() => reject(new Error('Socket timeout')), 7000)
      this._socket.on('connect', () => {
        clearTimeout(timer)
        this._connected = true
        this._startPing()
        resolve()
      })
      this._socket.on('connect_error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
      this._socket.on('disconnect', () => { this._connected = false })
    })
  }

  _startPing() {
    this._pingInterval = setInterval(() => {
      if (!this._socket?.connected) return
      const t0 = Date.now()
      this._socket.emit('ping', (ts) => { this._ping = Date.now() - t0 })
    }, 3000)
  }

  joinRoom(data) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Join timeout')), 5000)
      this._socket.emit('room:join', data, (state) => {
        clearTimeout(timer)
        resolve(state)
      })
    })
  }

  sendMove(data) {
    if (!this._socket?.connected) return
    this._socket.volatile.emit('player:move', data)
  }

  sendInput(x, y, clientMass, cells) {
    if (!this._socket?.connected) return
    this._socket.volatile.emit('input:update', { x, y, clientMass, cells })
  }

  sendSplit(dx, dy) {
    if (!this._socket?.connected) return
    this._socket.emit('input:split', dx !== undefined ? { dx, dy } : {})
  }

  sendEject() {
    if (!this._socket?.connected) return
    this._socket.emit('input:eject')
  }

  sendSkill(skill, extra = {}) {
    if (!this._socket?.connected) return
    this._socket.emit('input:skill', { skill, ...extra })
  }

  eatFood(ids) {
    if (!this._socket?.connected) return
    this._socket.emit('food:eat', { ids: Array.isArray(ids) ? ids : [ids] })
  }

  sendChat(text, emoji = false) {
    if (!this._socket?.connected) return
    this._socket.emit('chat:send', { text, emoji })
  }

  die(data) {
    if (!this._socket?.connected) return
    this._socket.emit('player:die', data || {})
  }

  kill(victimId, victimName) {
    if (!this._socket?.connected) return
    this._socket.emit('player:kill', { victimId, victimName })
  }

  spawnVirus(x, y, type = 'normal') {
    if (!this._socket?.connected) return
    this._socket.emit('virus:spawn', { x, y, type })
  }

  emit(event, data) {
    if (!this._socket?.connected) return
    this._socket.emit(event, data)
  }

  sendVirusTouch(id, cellMass) {
    if (!this._socket?.connected) return
    this._socket.emit('virus:touch', { id, cellMass })
  }

  on(event, handler) {
    this._socket?.on(event, handler)
    return this
  }

  off(event, handler) {
    this._socket?.off(event, handler)
    return this
  }

  disconnect() {
    if (this._pingInterval) { clearInterval(this._pingInterval); this._pingInterval = null }
    this._socket?.disconnect()
    this._socket = null
    this._connected = false
  }

  get connected() { return this._connected }
  get ping() { return this._ping }
  get id() { return this._socket?.id }
}

export const socketClient = new SocketClient()
