const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling']
})

const WORLD_SIZE = 6000
const FOOD_COUNT = 1000
const VIRUS_COUNT = 40
const FOOD_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b',
  '#cc5de8','#f03e3e','#1c7ed6','#37b24d','#f59f00',
  '#e64980','#0ca678','#ae3ec9','#1971c2','#f76707'
]
const VIRUS_TYPES = ['normal','normal','normal','normal','super','poison','freeze']

function rnd(max) { return Math.random() * max }
function rndId() { return Math.random().toString(36).slice(2, 12) }

class GameRoom {
  constructor(id, mode) {
    this.id = id
    this.mode = mode || 'ffa'
    this.players = new Map()
    this.food = this._genFood()
    this.viruses = this._genViruses()
    this.chat = []
    this.lastActivity = Date.now()
    this.hostId = null
    this.createdAt = Date.now()

    if (mode === 'battle_royale') {
      this.brZone = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: WORLD_SIZE * 0.48, active: true }
      this.brTimer = 0
    }
    if (mode === 'rush') {
      this.rushTime = 300
    }
  }

  _genFood() {
    const food = []
    for (let i = 0; i < FOOD_COUNT; i++) {
      food.push({
        id: rndId(),
        x: rnd(WORLD_SIZE),
        y: rnd(WORLD_SIZE),
        color: FOOD_COLORS[(Math.random() * FOOD_COLORS.length) | 0],
        value: 1,
        radius: 8 + Math.random() * 4
      })
    }
    return food
  }

  _genViruses() {
    const viruses = []
    for (let i = 0; i < VIRUS_COUNT; i++) {
      viruses.push({
        id: rndId(),
        x: 300 + rnd(WORLD_SIZE - 600),
        y: 300 + rnd(WORLD_SIZE - 600),
        type: VIRUS_TYPES[(Math.random() * VIRUS_TYPES.length) | 0]
      })
    }
    return viruses
  }

  spawnFood(count = 1) {
    const spawned = []
    for (let i = 0; i < count; i++) {
      const f = {
        id: rndId(),
        x: rnd(WORLD_SIZE),
        y: rnd(WORLD_SIZE),
        color: FOOD_COLORS[(Math.random() * FOOD_COLORS.length) | 0],
        value: 1,
        radius: 8 + Math.random() * 4
      }
      this.food.push(f)
      spawned.push(f)
    }
    return spawned
  }

  eatFood(foodIds) {
    const idSet = new Set(foodIds)
    const removed = []
    this.food = this.food.filter(f => {
      if (idSet.has(f.id)) { removed.push(f.id); return false }
      return true
    })
    const spawned = this.spawnFood(removed.length)
    return { removed, spawned }
  }

  addPlayer(player) {
    this.players.set(player.id, player)
    this.lastActivity = Date.now()
    if (!this.hostId) this.hostId = player.id
  }

  removePlayer(id) {
    this.players.delete(id)
    this.lastActivity = Date.now()
    if (this.hostId === id) {
      this.hostId = this.players.keys().next().value || null
    }
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .filter(p => p.mass > 0)
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 10)
      .map(p => ({ id: p.id, name: p.name, mass: p.mass, color: p.color, isGod: !!p.isGod, clan: p.clan || null }))
  }

  getPublicPlayers(excludeId) {
    return Array.from(this.players.values())
      .filter(p => p.id !== excludeId)
      .map(p => ({
        id: p.id, x: p.x, y: p.y, mass: p.mass,
        cells: p.cells || [], name: p.name, color: p.color,
        isGod: !!p.isGod, clan: p.clan || null
      }))
  }
}

const rooms = new Map()

function getRoom(roomId, mode) {
  if (!rooms.has(roomId)) rooms.set(roomId, new GameRoom(roomId, mode))
  return rooms.get(roomId)
}

setInterval(() => {
  const now = Date.now()
  for (const [id, room] of rooms) {
    if (room.players.size === 0 && now - room.lastActivity > 5 * 60 * 1000) {
      rooms.delete(id)
    }
  }
}, 2 * 60 * 1000)

io.on('connection', (socket) => {
  let room = null
  let playerId = null

  socket.on('room:join', (data, cb) => {
    try {
      playerId = data.playerId || socket.id
      room = getRoom(data.roomId || 'main_ffa', data.mode || 'ffa')

      socket.join(room.id)
      room.lastActivity = Date.now()

      const player = {
        id: playerId,
        socketId: socket.id,
        name: (data.name || 'Player').slice(0, 24),
        color: data.color || '#6366f1',
        isGod: !!data.isGod,
        clan: data.clan || null,
        isPremium: !!data.isPremium,
        team: data.team || 'none',
        mass: 20,
        x: 400 + Math.random() * (WORLD_SIZE - 800),
        y: 400 + Math.random() * (WORLD_SIZE - 800),
        cells: [],
        kills: 0,
        joinedAt: Date.now()
      }

      room.addPlayer(player)

      const state = {
        food: room.food,
        viruses: room.viruses,
        players: room.getPublicPlayers(playerId),
        leaderboard: room.getLeaderboard(),
        playerCount: room.players.size,
        isHost: room.hostId === playerId,
        chat: room.chat.slice(-30)
      }

      if (typeof cb === 'function') cb(state)
      else socket.emit('room:state', state)

      socket.to(room.id).emit('player:join', {
        id: playerId, name: player.name, color: player.color,
        isGod: player.isGod, clan: player.clan,
        x: player.x, y: player.y, mass: player.mass
      })

      io.to(room.id).emit('leaderboard:update', {
        leaderboard: room.getLeaderboard(),
        playerCount: room.players.size
      })
    } catch (e) {
      console.error('room:join error', e)
    }
  })

  socket.on('player:move', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player) return

    player.x = data.x || player.x
    player.y = data.y || player.y
    player.mass = data.m || data.mass || player.mass
    player.cells = data.cs || data.cells || player.cells
    room.lastActivity = Date.now()

    socket.volatile.to(room.id).emit('player:update', {
      id: playerId,
      x: player.x, y: player.y,
      m: player.mass,
      cs: player.cells,
      c: player.color,
      n: player.name,
      g: player.isGod ? 1 : 0,
      cl: player.clan || null
    })
  })

  socket.on('food:eat', (data) => {
    if (!room) return
    const ids = Array.isArray(data.ids) ? data.ids : [data.foodId].filter(Boolean)
    if (!ids.length) return
    const result = room.eatFood(ids)
    io.to(room.id).emit('food:update', result)
  })

  socket.on('player:kill', (data) => {
    if (!room || !playerId) return
    const killer = room.players.get(playerId)
    if (killer) killer.kills = (killer.kills || 0) + 1
    io.to(room.id).emit('player:killed', {
      killerId: playerId,
      victimId: data.victimId,
      killerName: killer?.name || 'Unknown',
      victimName: data.victimName || 'Unknown'
    })
    io.to(room.id).emit('leaderboard:update', {
      leaderboard: room.getLeaderboard(),
      playerCount: room.players.size
    })
  })

  socket.on('player:die', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (player) player.mass = 0
    socket.to(room.id).emit('player:died', {
      id: playerId,
      killerId: data?.killerId,
      killerName: data?.killerName
    })
    io.to(room.id).emit('leaderboard:update', {
      leaderboard: room.getLeaderboard(),
      playerCount: room.players.size
    })
  })

  socket.on('chat:send', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    const text = (data.text || '').trim().slice(0, 200)
    if (!text) return

    const msg = {
      id: rndId(),
      playerId,
      name: player?.name || 'Unknown',
      color: player?.color || '#6366f1',
      isGod: !!(player?.isGod),
      isPremium: !!(player?.isPremium),
      text,
      emoji: !!data.emoji,
      ts: Date.now()
    }
    room.chat.push(msg)
    if (room.chat.length > 100) room.chat.shift()
    io.to(room.id).emit('chat:message', msg)
  })

  socket.on('virus:spawn', (data) => {
    if (!room || room.hostId !== playerId) return
    const v = { id: rndId(), x: data.x, y: data.y, type: data.type || 'normal' }
    room.viruses.push(v)
    io.to(room.id).emit('virus:spawned', v)
  })

  socket.on('ping', (cb) => { if (typeof cb === 'function') cb(Date.now()) })

  socket.on('disconnect', () => {
    if (!room || !playerId) return
    room.removePlayer(playerId)
    io.to(room.id).emit('player:leave', { id: playerId })
    io.to(room.id).emit('leaderboard:update', {
      leaderboard: room.getLeaderboard(),
      playerCount: room.players.size
    })
  })
})

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
    totalPlayers: Array.from(rooms.values()).reduce((s, r) => s + r.players.size, 0),
    uptime: Math.floor(process.uptime())
  })
})

app.get('/rooms', (req, res) => {
  const list = Array.from(rooms.entries()).map(([id, r]) => ({
    id, mode: r.mode, players: r.players.size
  }))
  res.json(list)
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`🎮 AGARZ Server running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
})
