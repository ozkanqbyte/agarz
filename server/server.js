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
const TICK_RATE = 20
const TICK_MS = 1000 / TICK_RATE
const BROADCAST_EVERY = 2
const BASE_SPEED = 6.5
const MIN_MASS_SPLIT = 35
const EJECT_COST = 2
const EJECT_MASS = 12
const MERGE_TIME = 30000
const MAX_CELLS = 16
const SPLIT_SPEED = 22
const MIN_EAT_RATIO = 1.15
const MAX_MASS = 50000
const VIRUS_FEED_SPLIT = 5

const FOOD_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b',
  '#cc5de8','#f03e3e','#1c7ed6','#37b24d','#f59f00',
  '#e64980','#0ca678','#ae3ec9','#1971c2','#f76707',
  '#20c997','#74c0fc','#f783ac','#a9e34b','#da77f2'
]
const VIRUS_TYPES = ['normal','normal','normal','normal','super','poison','freeze']

function rnd(max) { return Math.random() * max }
function rndId() { return Math.random().toString(36).slice(2, 12) }
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function massToRadius(mass) { return Math.sqrt(mass) * 4.5 }
function speedForMass(mass) { return BASE_SPEED / Math.pow(Math.max(20, mass), 0.4) }

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
    this._tick = 0
    this._tickTimer = null
    this._foodIdMap = new Map(this.food.map(f => [f.id, f]))

    if (mode === 'battle_royale') {
      this.brZone = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: WORLD_SIZE * 0.48, active: true, shrinkTimer: 60 }
    }
    if (mode === 'rush') {
      this.rushTime = 300
    }

    this._startLoop()
  }

  _startLoop() {
    this._tickTimer = setInterval(() => this._update(), TICK_MS)
  }

  _stopLoop() {
    if (this._tickTimer) { clearInterval(this._tickTimer); this._tickTimer = null }
  }

  _genFood() {
    const food = []
    for (let i = 0; i < FOOD_COUNT; i++) {
      food.push(this._makeFood())
    }
    return food
  }

  _makeFood() {
    return {
      id: rndId(),
      x: rnd(WORLD_SIZE),
      y: rnd(WORLD_SIZE),
      color: FOOD_COLORS[(Math.random() * FOOD_COLORS.length) | 0],
      value: 5,
      radius: 5 + Math.random() * 3
    }
  }

  _genViruses() {
    const viruses = []
    for (let i = 0; i < VIRUS_COUNT; i++) {
      viruses.push(this._makeVirus())
    }
    return viruses
  }

  _makeVirus(x, y, type) {
    return {
      id: rndId(),
      x: x != null ? x : 400 + rnd(WORLD_SIZE - 800),
      y: y != null ? y : 400 + rnd(WORLD_SIZE - 800),
      type: type || VIRUS_TYPES[(Math.random() * VIRUS_TYPES.length) | 0],
      mass: 100,
      feedCount: 0
    }
  }

  _update() {
    const dt = 1 / TICK_RATE
    this._tick++

    for (const [, player] of this.players) {
      if (player.dead) continue
      this._movePlayer(player, dt)
      this._massDecay(player, dt)
      this._checkMerge(player, dt)
      if (player.frozen > 0) player.frozen -= dt
      if (player.poisoned > 0) {
        player.poisoned -= dt
        for (const c of player.cells) c.mass = Math.max(20, c.mass - c.mass * 0.04 * dt)
      }
      if (player.skillSpeedTimer > 0) player.skillSpeedTimer -= dt
      if (player.skillSlowTimer > 0) player.skillSlowTimer -= dt
      if (player.skillShieldTimer > 0) player.skillShieldTimer -= dt
    }

    this._checkFoodCollisions()
    this._checkPlayerCollisions()
    this._checkVirusCollisions()
    this._respawnFood()
    this._updateBattleRoyale(dt)

    if (this._tick % BROADCAST_EVERY === 0) {
      this._broadcast()
    }
    if (this._tick % (TICK_RATE * 10) === 0) {
      this.lastActivity = Date.now()
    }
  }

  _movePlayer(player, dt) {
    if (!player.cells.length) return
    const frozen = player.frozen > 0
    const speedMult = player.skillSpeedTimer > 0 ? 2 : 1
    for (const cell of player.cells) {
      if (frozen) continue
      const baseSpeed = speedForMass(cell.mass) * speedMult * 60
      const dx = (player.inputX || 0) - cell.x
      const dy = (player.inputY || 0) - cell.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 1) continue
      const nx = dx / d, ny = dy / d
      const move = Math.min(baseSpeed * dt, d)
      cell.x = clamp(cell.x + nx * move, cell.radius, WORLD_SIZE - cell.radius)
      cell.y = clamp(cell.y + ny * move, cell.radius, WORLD_SIZE - cell.radius)
      if (cell.splitVx) {
        cell.x += cell.splitVx * dt * 60
        cell.y += cell.splitVy * dt * 60
        cell.splitVx *= 0.86
        cell.splitVy *= 0.86
        if (Math.abs(cell.splitVx) < 0.05) { cell.splitVx = 0; cell.splitVy = 0 }
      }
    }
    const cx = player.cells.reduce((s, c) => s + c.x, 0) / player.cells.length
    const cy = player.cells.reduce((s, c) => s + c.y, 0) / player.cells.length
    player.x = cx; player.y = cy
    player.mass = player.cells.reduce((s, c) => s + c.mass, 0)
  }

  _massDecay(player, dt) {
    for (const cell of player.cells) {
      if (cell.mass > 20) cell.mass = Math.max(20, cell.mass - 2 * dt)
    }
  }

  _checkMerge(player, dt) {
    for (const cell of player.cells) {
      cell.mergeTimer = (cell.mergeTimer || 0) + dt * 1000
    }
    if (player.cells.length < 2) return
    const toMerge = []
    for (let i = 0; i < player.cells.length; i++) {
      for (let j = i + 1; j < player.cells.length; j++) {
        const a = player.cells[i], b = player.cells[j]
        if (a.mergeTimer < MERGE_TIME || b.mergeTimer < MERGE_TIME) continue
        if (dist(a, b) < massToRadius(a.mass) + massToRadius(b.mass) - 2) {
          toMerge.push([i, j])
        }
      }
    }
    const absorbed = new Set()
    for (const [i, j] of toMerge) {
      if (absorbed.has(i) || absorbed.has(j)) continue
      player.cells[i].mass += player.cells[j].mass
      absorbed.add(j)
    }
    if (absorbed.size) player.cells = player.cells.filter((_, idx) => !absorbed.has(idx))
  }

  _checkFoodCollisions() {
    const toEat = []
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        const r = massToRadius(cell.mass)
        for (const food of this.food) {
          if (dist(cell, food) < r) {
            cell.mass += food.value
            toEat.push(food.id)
          }
        }
      }
    }
    if (toEat.length) {
      const eaten = new Set(toEat)
      this.food = this.food.filter(f => !eaten.has(f.id))
      for (const id of eaten) this._foodIdMap.delete(id)
    }
  }

  _checkPlayerCollisions() {
    const players = Array.from(this.players.values()).filter(p => !p.dead)
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j]
        if (a.dead || b.dead) continue
        const sameTeam = this.mode === 'teams' && a.team === b.team && a.team !== 'none'
        for (const ac of a.cells) {
          for (const bc of b.cells) {
            const d = dist(ac, bc)
            const ra = massToRadius(ac.mass), rb = massToRadius(bc.mass)
            if (d < Math.max(ra, rb) * 0.9) {
              if (!sameTeam && ac.mass > bc.mass * MIN_EAT_RATIO) {
                ac.mass += bc.mass
                b.cells = b.cells.filter(c => c.id !== bc.id)
                if (!b.cells.length) { b.dead = true; this._notifyKill(a, b) }
              } else if (!sameTeam && bc.mass > ac.mass * MIN_EAT_RATIO) {
                bc.mass += ac.mass
                a.cells = a.cells.filter(c => c.id !== ac.id)
                if (!a.cells.length) { a.dead = true; this._notifyKill(b, a) }
              }
            }
          }
        }
      }
    }
  }

  _checkVirusCollisions() {
    const toRemove = new Set()
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        const r = massToRadius(cell.mass)
        for (const virus of this.viruses) {
          if (toRemove.has(virus.id)) continue
          if (dist(cell, virus) < r * 0.88) {
            const shield = player.skillShieldTimer > 0
            if (shield) {
              cell.mass += 300
            } else if (!player._virusFirstHit) {
              player._virusFirstHit = true
              this._explodePlayer(player, cell)
            } else if (cell.mass > 100) {
              this._explodePlayer(player, cell)
              cell.mass += 300
            } else {
              cell.mass += 300
            }
            if (virus.type === 'poison' && !shield) player.poisoned = 5
            if (virus.type === 'freeze' && !shield) player.frozen = 4
            toRemove.add(virus.id)
          }
        }
      }
    }
    if (toRemove.size) {
      this.viruses = this.viruses.filter(v => !toRemove.has(v.id))
      while (this.viruses.length < VIRUS_COUNT) this.viruses.push(this._makeVirus())
    }
  }

  _explodePlayer(player, sourceCell) {
    const splits = Math.min(MAX_CELLS - player.cells.length, Math.min(8, Math.floor(sourceCell.mass / 16)))
    if (splits <= 0) return
    const massPerPiece = sourceCell.mass / (splits + 1)
    sourceCell.mass = massPerPiece
    for (let i = 0; i < splits; i++) {
      const angle = (i / splits) * Math.PI * 2
      const newCell = {
        id: rndId(),
        x: sourceCell.x + Math.cos(angle) * 2,
        y: sourceCell.y + Math.sin(angle) * 2,
        mass: massPerPiece,
        mergeTimer: 0,
        splitVx: Math.cos(angle) * SPLIT_SPEED * 0.4,
        splitVy: Math.sin(angle) * SPLIT_SPEED * 0.4
      }
      player.cells.push(newCell)
    }
  }

  _handleEject(player) {
    if (player.frozen > 0) return
    const ejected = []
    for (const cell of player.cells) {
      if (cell.mass <= EJECT_COST + 20) continue
      cell.mass -= EJECT_COST
      const dx = (player.inputX || 0) - cell.x
      const dy = (player.inputY || 0) - cell.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const em = {
        id: rndId(),
        x: cell.x + (dx / d) * (massToRadius(cell.mass) + 8),
        y: cell.y + (dy / d) * (massToRadius(cell.mass) + 8),
        vx: (dx / d) * 20,
        vy: (dy / d) * 20,
        color: player.color,
        mass: EJECT_MASS,
        settledTimer: 0,
        settled: false
      }
      ejected.push(em)
      if (!player._ejected) player._ejected = []
      player._ejected.push(em)
      this._checkEjectedVirus(em)
    }
    if (ejected.length) io.to(this.id).emit('ejected:spawn', ejected)
  }

  _checkEjectedVirus(em) {
    for (const virus of this.viruses) {
      const dx = em.x - virus.x, dy = em.y - virus.y
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        virus.feedCount = (virus.feedCount || 0) + 1
        if (virus.feedCount % VIRUS_FEED_SPLIT === 0) {
          const angle = Math.random() * Math.PI * 2
          const nv = this._makeVirus(
            clamp(virus.x + Math.cos(angle) * 120, 200, WORLD_SIZE - 200),
            clamp(virus.y + Math.sin(angle) * 120, 200, WORLD_SIZE - 200),
            virus.type
          )
          this.viruses.push(nv)
          io.to(this.id).emit('virus:spawned', nv)
        }
        break
      }
    }
  }

  _handleSplit(player) {
    if (player.frozen > 0 || player.cells.length >= MAX_CELLS) return
    const newCells = []
    for (const cell of player.cells) {
      if (cell.mass < MIN_MASS_SPLIT * 2 || player.cells.length + newCells.length >= MAX_CELLS) continue
      const dx = (player.inputX || 0) - cell.x
      const dy = (player.inputY || 0) - cell.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      cell.mass /= 2
      newCells.push({
        id: rndId(),
        x: cell.x,
        y: cell.y,
        mass: cell.mass,
        mergeTimer: 0,
        splitVx: (dx / d) * SPLIT_SPEED,
        splitVy: (dy / d) * SPLIT_SPEED
      })
    }
    player.cells.push(...newCells)
  }

  _respawnFood() {
    if (this.food.length < FOOD_COUNT && this._tick % 2 === 0) {
      const needed = Math.min(10, FOOD_COUNT - this.food.length)
      const spawned = []
      for (let i = 0; i < needed; i++) {
        const f = this._makeFood()
        this.food.push(f)
        this._foodIdMap.set(f.id, f)
        spawned.push(f)
      }
      if (spawned.length) io.to(this.id).emit('food:spawned', spawned)
    }
  }

  _updateBattleRoyale(dt) {
    if (this.mode !== 'battle_royale' || !this.brZone) return
    this.brZone.shrinkTimer -= dt
    if (this.brZone.shrinkTimer <= 0) {
      this.brZone.radius = Math.max(500, this.brZone.radius * 0.92)
      this.brZone.shrinkTimer = 30 + Math.random() * 10
      io.to(this.id).emit('zone:update', { radius: this.brZone.radius })
    }
    for (const [, player] of this.players) {
      if (player.dead || player.skillShieldTimer > 0) continue
      for (const cell of player.cells) {
        const dz = dist(cell, this.brZone)
        if (dz > this.brZone.radius) {
          cell.mass = Math.max(20, cell.mass - 50 * dt)
        }
      }
    }
  }

  _notifyKill(killer, victim) {
    killer.kills = (killer.kills || 0) + 1
    io.to(this.id).emit('player:killed', {
      killerId: killer.id,
      victimId: victim.id,
      killerName: killer.name,
      victimName: victim.name
    })
    io.to(this.id).emit('leaderboard:update', {
      leaderboard: this.getLeaderboard(),
      playerCount: this.players.size
    })
  }

  _broadcast() {
    const players = []
    for (const [, p] of this.players) {
      if (p.dead) continue
      players.push({
        id: p.id,
        x: p.x, y: p.y,
        m: p.mass,
        cs: p.cells.map(c => ({ x: c.x, y: c.y, m: c.mass })),
        c: p.color,
        n: p.name,
        g: p.isGod ? 1 : 0,
        cl: p.clan || null,
        frozen: p.frozen > 0 ? 1 : 0,
        poisoned: p.poisoned > 0 ? 1 : 0
      })
    }
    io.to(this.id).emit('world:state', { players, tick: this._tick })
  }

  addPlayer(player) {
    this.players.set(player.id, player)
    this.lastActivity = Date.now()
    if (!this.hostId) this.hostId = player.id
  }

  removePlayer(id) {
    this.players.delete(id)
    this.lastActivity = Date.now()
    if (this.hostId === id) this.hostId = this.players.keys().next().value || null
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .filter(p => p.mass > 0 && !p.dead)
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 10)
      .map(p => ({ id: p.id, name: p.name, mass: Math.floor(p.mass), color: p.color, isGod: !!p.isGod, clan: p.clan || null }))
  }

  getPublicPlayers(excludeId) {
    return Array.from(this.players.values())
      .filter(p => p.id !== excludeId && !p.dead)
      .map(p => ({ id: p.id, x: p.x, y: p.y, mass: p.mass, cells: p.cells.map(c => ({ x: c.x, y: c.y, mass: c.mass })), name: p.name, color: p.color, isGod: !!p.isGod, clan: p.clan || null }))
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
      room._stopLoop()
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

      const spawnX = 400 + Math.random() * (WORLD_SIZE - 800)
      const spawnY = 400 + Math.random() * (WORLD_SIZE - 800)

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
        x: spawnX,
        y: spawnY,
        cells: [{ id: rndId(), x: spawnX, y: spawnY, mass: 20, mergeTimer: 0 }],
        kills: 0,
        dead: false,
        inputX: spawnX,
        inputY: spawnY,
        frozen: 0,
        poisoned: 0,
        skillSpeedTimer: 0,
        skillSlowTimer: 0,
        skillShieldTimer: 0,
        _virusFirstHit: false,
        joinedAt: Date.now()
      }

      room.addPlayer(player)
      room.lastActivity = Date.now()

      const state = {
        food: room.food,
        viruses: room.viruses,
        players: room.getPublicPlayers(playerId),
        leaderboard: room.getLeaderboard(),
        playerCount: room.players.size,
        isHost: room.hostId === playerId,
        chat: room.chat.slice(-30),
        serverAuth: true,
        spawnX, spawnY
      }

      if (typeof cb === 'function') cb(state)
      else socket.emit('room:state', state)

      socket.to(room.id).emit('player:join', {
        id: playerId, name: player.name, color: player.color,
        isGod: player.isGod, clan: player.clan, x: player.x, y: player.y, mass: player.mass
      })

      io.to(room.id).emit('leaderboard:update', {
        leaderboard: room.getLeaderboard(),
        playerCount: room.players.size
      })
    } catch (e) { console.error('room:join error', e) }
  })

  socket.on('input:update', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    if (typeof data.x === 'number') player.inputX = clamp(data.x, 0, WORLD_SIZE)
    if (typeof data.y === 'number') player.inputY = clamp(data.y, 0, WORLD_SIZE)
  })

  socket.on('input:split', () => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (player && !player.dead) room._handleSplit(player)
  })

  socket.on('input:eject', () => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (player && !player.dead) room._handleEject(player)
  })

  socket.on('input:skill', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const skill = data.skill
    if (skill === 'speed') player.skillSpeedTimer = 10
    else if (skill === 'shield') player.skillShieldTimer = 5
    else if (skill === 'slow') {
      const nearest = _findNearestEnemy(room, player)
      if (nearest) nearest.skillSlowTimer = 3
    }
  })

  socket.on('player:move', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    if (typeof data.x === 'number') player.inputX = clamp(data.x, 0, WORLD_SIZE)
    if (typeof data.y === 'number') player.inputY = clamp(data.y, 0, WORLD_SIZE)
  })

  socket.on('chat:send', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    const text = (data.text || '').trim().slice(0, 200)
    if (!text) return
    const msg = {
      id: rndId(), playerId,
      name: player?.name || 'Unknown',
      color: player?.color || '#6366f1',
      isGod: !!(player?.isGod),
      isPremium: !!(player?.isPremium),
      text, emoji: !!data.emoji, ts: Date.now()
    }
    room.chat.push(msg)
    if (room.chat.length > 100) room.chat.shift()
    io.to(room.id).emit('chat:message', msg)
  })

  socket.on('player:die', () => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (player) { player.dead = true; player.mass = 0; player.cells = [] }
    socket.to(room.id).emit('player:died', { id: playerId })
    io.to(room.id).emit('leaderboard:update', {
      leaderboard: room.getLeaderboard(),
      playerCount: room.players.size
    })
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

function _findNearestEnemy(room, player) {
  let best = null, bestDist = Infinity
  for (const [, p] of room.players) {
    if (p.id === player.id || p.dead) continue
    const d = dist(player, p)
    if (d < bestDist) { bestDist = d; best = p }
  }
  return best
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
    totalPlayers: Array.from(rooms.values()).reduce((s, r) => s + r.players.size, 0),
    uptime: Math.floor(process.uptime()),
    serverAuth: true
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
  console.log(`🎮 AGARZ Server-Authoritative running on port ${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
})
