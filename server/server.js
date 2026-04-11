const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())
app.get('/health', (_, res) => res.json({ ok: true }))

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling']
})

const WORLD_SIZE = 6000
const FOOD_COUNT = 1000
const VIRUS_COUNT = 50
const VIRUS_MIN_MASS = 300
const TICK_RATE = 30
const TICK_MS = 1000 / TICK_RATE
const BROADCAST_EVERY = 1
const BASE_SPEED = 9
const MIN_MASS_SPLIT = 35
const EJECT_COST = 14
const EJECT_MASS = 12
const MERGE_TIME = 10000
const MAX_CELLS = 16
const SPLIT_SPEED = 14
const MIN_EAT_RATIO = 1.05
const MAX_MASS = 50000
const VIRUS_FEED_SPLIT = 5

const FOOD_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b',
  '#cc5de8','#f03e3e','#1c7ed6','#37b24d','#f59f00',
  '#e64980','#0ca678','#ae3ec9','#1971c2','#f76707',
  '#20c997','#74c0fc','#f783ac','#a9e34b','#da77f2'
]
const VIRUS_TYPES = ['normal']

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
    this.ejectedMasses = []
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
    if (mode === 'king_of_hill') {
      this.koth = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 500, timer: 420, moveTimer: 120, ended: false }
      this.kothScores = new Map()
    }
    if (mode === 'infection') {
      this.infectionStartTimer = 8
      this.zombies = new Set()
      this.infectionEnded = false
      this.infectionStarted = false
    }
    if (mode === 'crystal_hunt') {
      this.crystals = []
      this.crystalRespawnTimer = 5
      this.glowingPlayers = new Map()
      this.crystalHuntTimer = 600
      this.crystalHuntEnded = false
      this.crystalScores = new Map()
      this._spawnCrystal()
      this._spawnCrystal()
      this._spawnCrystal()
    }
    if (mode === 'shrink_survival') {
      this.shrinkEnded = false
    }
    if (mode === 'boss_fight') {
      this.boss = null
      this.bossRespawnTimer = 5
      this.bossDamagers = new Map()
      this.bossDefeated = false
    }
    if (mode === 'teams') {
      this.teamScores = { red: 0, blue: 0 }
      this.teamEnded = false
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
      radius: 7 + Math.random() * 3
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
    let vx = x != null ? x : 400 + rnd(WORLD_SIZE - 800)
    let vy = y != null ? y : 400 + rnd(WORLD_SIZE - 800)
    if (x != null && y != null && this.viruses && this.viruses.length > 0) {
      let attempts = 0
      const MIN_VIRUS_DIST = 220
      while (attempts < 15) {
        let tooClose = false
        for (const v of this.viruses) {
          const dx = vx - v.x, dy = vy - v.y
          if (Math.sqrt(dx*dx + dy*dy) < MIN_VIRUS_DIST) { tooClose = true; break }
        }
        if (!tooClose) break
        const angle = Math.random() * Math.PI * 2
        vx = clamp(x + Math.cos(angle) * (MIN_VIRUS_DIST + Math.random() * 150), 200, WORLD_SIZE - 200)
        vy = clamp(y + Math.sin(angle) * (MIN_VIRUS_DIST + Math.random() * 150), 200, WORLD_SIZE - 200)
        attempts++
      }
    }
    return {
      id: rndId(),
      x: vx,
      y: vy,
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
      if (player.skillMagnetTimer > 0) {
        player.skillMagnetTimer -= dt
        for (const food of room.food) {
          const dx = player.x - food.x, dy = player.y - food.y
          const d = Math.sqrt(dx*dx+dy*dy)
          if (d < 600 && d > 1) { food.x += (dx/d)*4; food.y += (dy/d)*4 }
        }
      }
      if (player.skillGhostTimer > 0) player.skillGhostTimer -= dt
    }

    this._updateEjectedMasses(dt)
    this._checkFoodCollisions()
    this._checkPlayerCollisions()
    this._checkEjectedCollisions()
    this._checkCrystalCollisions()
    this._checkBossCollisions()
    this._respawnFood()
    this._updateBattleRoyale(dt)
    this._updateRush(dt)
    this._updateKingOfHill(dt)
    this._updateInfection(dt)
    this._updateCrystalHunt(dt)
    this._updateShrinkSurvival(dt)
    this._updateBossFight(dt)
    this._updateTeams(dt)

    if (this._tick % BROADCAST_EVERY === 0) {
      this._broadcast()
    }
    if (this._tick % (TICK_RATE * 2) === 0) {
      io.to(this.id).emit('leaderboard:update', { leaderboard: this.getLeaderboard(), playerCount: this.players.size })
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
      const r = massToRadius(cell.mass)
      if (cell.splitVx) {
        cell.x = clamp(cell.x + cell.splitVx * dt * 60, r, WORLD_SIZE - r)
        cell.y = clamp(cell.y + cell.splitVy * dt * 60, r, WORLD_SIZE - r)
        cell.splitVx *= 0.86
        cell.splitVy *= 0.86
        if (Math.abs(cell.splitVx) < 0.05) { cell.splitVx = 0; cell.splitVy = 0 }
      } else if (!frozen) {
        const baseSpeed = speedForMass(cell.mass) * speedMult * 60
        const dx = (player.inputX || 0) - cell.x
        const dy = (player.inputY || 0) - cell.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d >= 1) {
          const nx = dx / d, ny = dy / d
          const move = Math.min(baseSpeed * dt, d)
          cell.x = clamp(cell.x + nx * move, r, WORLD_SIZE - r)
          cell.y = clamp(cell.y + ny * move, r, WORLD_SIZE - r)
        }
      }
      cell.x = clamp(cell.x, r, WORLD_SIZE - r)
      cell.y = clamp(cell.y, r, WORLD_SIZE - r)
    }
    const cx = player.cells.reduce((s, c) => s + c.x, 0) / player.cells.length
    const cy = player.cells.reduce((s, c) => s + c.y, 0) / player.cells.length
    player.x = cx; player.y = cy
    player.mass = player.cells.reduce((s, c) => s + c.mass, 0)
  }

  _massDecay(player, dt) {
    for (const cell of player.cells) {
      if (cell.mass <= 200) continue
      let rate
      if (cell.mass < 1000) rate = cell.mass * 0.00004
      else if (cell.mass < 5000) rate = cell.mass * 0.00008
      else rate = cell.mass * 0.00015
      cell.mass = Math.max(20, cell.mass - rate * dt)
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
    const eatQueue = []
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j]
        if (a.dead || b.dead) continue
        if (a.skillGhostTimer > 0 || b.skillGhostTimer > 0) continue
        const sameTeam = this.mode === 'teams' && a.team === b.team && a.team !== 'none'
        if (sameTeam) continue
        for (const ac of a.cells) {
          for (const bc of b.cells) {
            const dx = ac.x - bc.x, dy = ac.y - bc.y
            const d = Math.sqrt(dx*dx + dy*dy)
            const ra = massToRadius(ac.mass), rb = massToRadius(bc.mass)
            if (ac.mass > bc.mass * MIN_EAT_RATIO && d < ra + rb * 0.5) {
              eatQueue.push({ eater: a, eaterCell: ac, eaten: b, eatenCell: bc })
            } else if (bc.mass > ac.mass * MIN_EAT_RATIO && d < rb + ra * 0.5) {
              eatQueue.push({ eater: b, eaterCell: bc, eaten: a, eatenCell: ac })
            }
          }
        }
      }
    }
    const deadCells = new Set()
    for (const { eater, eaterCell, eaten, eatenCell } of eatQueue) {
      if (eater.dead || eaten.dead) continue
      if (deadCells.has(eatenCell.id)) continue
      if (this.mode === 'infection' && this.zombies.has(eater.id) && this.zombies.has(eaten.id)) continue
      const gained = eatenCell.mass
      eaterCell.mass += gained
      deadCells.add(eatenCell.id)
      eaten.cells = eaten.cells.filter(c => c.id !== eatenCell.id)
      if (eater.socketId) io.to(eater.socketId).emit('player:mass_gain', { gain: Math.floor(gained), x: eatenCell.x, y: eatenCell.y })
      if (eaten.socketId) io.to(eaten.socketId).emit('cell:eaten', { cellId: eatenCell.id, x: eatenCell.x, y: eatenCell.y })
      if (!eaten.cells.length) {
        if (this.mode === 'infection' && this.zombies.has(eater.id) && !this.zombies.has(eaten.id)) {
          eaten.dead = false
          eaten.cells = [{ id: rndId(), x: eaten.x, y: eaten.y, mass: 30, mergeTimer: 0 }]
          eaten.mass = 30; eaten.color = '#7cfc00'; eaten.isZombie = true
          this.zombies.add(eaten.id)
          io.to(this.id).emit('infection:converted', { id: eaten.id })
        } else {
          eaten.dead = true; this._notifyKill(eater, eaten)
        }
      }
    }
  }

  _checkVirusCollisions() {
    const toRemove = new Map()
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        if (cell.mass < VIRUS_MIN_MASS) continue
        const r = massToRadius(cell.mass)
        for (const virus of this.viruses) {
          if (toRemove.has(virus.id)) continue
          const virusR = massToRadius(virus.mass)
          if (dist(cell, virus) >= virusR + r * 0.8) continue

          const shield = player.skillShieldTimer > 0
          const preMass = cell.mass

          if (shield) {
            cell.mass = preMass + 300
          } else {
            player._virusEatCount = (player._virusEatCount || 0) + 1
            cell.mass = preMass * 1.25
            const shouldSplit = player._virusEatCount % 6 === 0
            if (shouldSplit) {
              this._explodePlayer(player, cell)
            }
          }

          if (virus.type === 'poison' && !shield) player.poisoned = 5
          if (virus.type === 'freeze' && !shield) player.frozen = 4

          const gainAmount = Math.floor(cell.mass - preMass)
          toRemove.set(virus.id, { socketId: player.socketId, gain: gainAmount })
        }
      }
    }
    if (toRemove.size) {
      for (const [vid, info] of toRemove) {
        io.to(this.id).emit('virus:eaten', { id: vid })
        if (info.socketId) io.to(info.socketId).emit('virus:mass_gain', { amount: info.gain })
      }
      this.viruses = this.viruses.filter(v => !toRemove.has(v.id))
      while (this.viruses.length < VIRUS_COUNT) {
        const nv = this._makeVirus()
        this.viruses.push(nv)
        io.to(this.id).emit('virus:spawned', nv)
      }
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
        ownerId: player.id,
        x: cell.x + (dx / d) * (massToRadius(cell.mass) + 10),
        y: cell.y + (dy / d) * (massToRadius(cell.mass) + 10),
        vx: (dx / d) * 22,
        vy: (dy / d) * 22,
        color: player.color,
        mass: EJECT_MASS,
        age: 0
      }
      ejected.push(em)
      this.ejectedMasses.push(em)
      this._checkEjectedVirus(em)
    }
    if (ejected.length) io.to(this.id).emit('ejected:spawn', ejected)
  }

  _updateEjectedMasses(dt) {
    const toRemove = []
    for (const em of this.ejectedMasses) {
      em.age = (em.age || 0) + dt
      em.vx *= 0.88
      em.vy *= 0.88
      em.x = clamp(em.x + em.vx * dt * 60, 5, WORLD_SIZE - 5)
      em.y = clamp(em.y + em.vy * dt * 60, 5, WORLD_SIZE - 5)
      if (em.age > 30) toRemove.push(em.id)
      const speed2 = em.vx * em.vx + em.vy * em.vy
      if (speed2 > 1) this._checkEjectedVirus(em)
    }
    if (toRemove.length) {
      const s = new Set(toRemove)
      this.ejectedMasses = this.ejectedMasses.filter(e => !s.has(e.id))
      io.to(this.id).emit('ejected:remove', toRemove)
    }
  }

  _checkEjectedCollisions() {
    if (!this.ejectedMasses.length) return
    const eaten = []
    const eatenSet = new Set()
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        const r = massToRadius(cell.mass)
        for (const em of this.ejectedMasses) {
          if (eatenSet.has(em.id)) continue
          if (em.ownerId === player.id && em.age < 0.5) continue
          const dx = cell.x - em.x, dy = cell.y - em.y
          const d = Math.sqrt(dx*dx + dy*dy)
          const er = massToRadius(em.mass)
          if (d < r + er * 0.5) {
            cell.mass += em.mass
            eatenSet.add(em.id)
            eaten.push(em.id)
            if (player.socketId) io.to(player.socketId).emit('player:mass_gain', { gain: em.mass, x: em.x, y: em.y })
          }
        }
      }
    }
    if (eaten.length) {
      const s = new Set(eaten)
      this.ejectedMasses = this.ejectedMasses.filter(e => !s.has(e.id))
      io.to(this.id).emit('ejected:remove', eaten)
    }
  }

  _checkEjectedVirus(em) {
    for (const virus of this.viruses) {
      const dx = em.x - virus.x, dy = em.y - virus.y
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        virus.feedCount = (virus.feedCount || 0) + 1
        if (virus.feedCount % VIRUS_FEED_SPLIT === 0) {
          const ejectD = Math.sqrt(em.vx * em.vx + em.vy * em.vy) || 1
          const nx = em.vx / ejectD, ny = em.vy / ejectD
          const scatter = (Math.random() - 0.5) * 0.5
          const finalAngle = Math.atan2(ny, nx) + scatter
          const dist2 = 220 + Math.random() * 120
          const nv = this._makeVirus(
            clamp(virus.x + Math.cos(finalAngle) * dist2, 200, WORLD_SIZE - 200),
            clamp(virus.y + Math.sin(finalAngle) * dist2, 200, WORLD_SIZE - 200),
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
      if (cell.mass < MIN_MASS_SPLIT || player.cells.length + newCells.length >= MAX_CELLS) continue
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

  _checkCrystalCollisions() {
    if (this.mode !== 'crystal_hunt' || !this.crystals?.length) return
    const toEat = []
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        const r = massToRadius(cell.mass)
        for (const crystal of this.crystals) {
          if (dist(cell, crystal) < r + 40) {
            cell.mass += crystal.mass
            player.mass += crystal.mass
            toEat.push(crystal.id)
            this.glowingPlayers.set(player.id, Date.now() + 30000)
            const prevScore = this.crystalScores.get(player.id) || 0
            this.crystalScores.set(player.id, prevScore + 1)
            io.to(this.id).emit('crystal:eaten', { playerId: player.id, crystalId: crystal.id })
          }
        }
      }
    }
    if (toEat.length) {
      const eaten = new Set(toEat)
      this.crystals = this.crystals.filter(c => !eaten.has(c.id))
    }
  }

  _checkBossCollisions() {
    if (this.mode !== 'boss_fight' || !this.boss) return
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        const r = massToRadius(cell.mass)
        const bd = dist(cell, this.boss)
        if (bd < r + massToRadius(this.boss.mass) * 0.85) {
          const dmg = Math.max(1, cell.mass * 0.08)
          this.boss.mass -= dmg
          cell.mass = Math.max(20, cell.mass - dmg * 0.2)
          const prev = this.bossDamagers.get(player.id) || 0
          this.bossDamagers.set(player.id, prev + dmg)
          if (this.boss.mass <= 200) {
            this._bossDefeated()
          }
        }
      }
    }
  }

  _spawnCrystal() {
    const c = {
      id: rndId(),
      x: 600 + rnd(WORLD_SIZE - 1200),
      y: 600 + rnd(WORLD_SIZE - 1200),
      mass: 400 + Math.random() * 300,
      color: '#00e5ff'
    }
    this.crystals = this.crystals || []
    this.crystals.push(c)
    io.to(this.id).emit('crystal:spawned', c)
  }

  _spawnBoss() {
    const alivePlayers = Array.from(this.players.values()).filter(p => !p.dead)
    const target = alivePlayers.length > 0 ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)] : null
    const bx = target ? clamp(target.x + (Math.random() - 0.5) * 600, 400, WORLD_SIZE - 400) : WORLD_SIZE / 2
    const by = target ? clamp(target.y + (Math.random() - 0.5) * 600, 400, WORLD_SIZE - 400) : WORLD_SIZE / 2
    this.boss = {
      id: 'boss_' + rndId(),
      x: bx, y: by,
      mass: 5000,
      vx: 0, vy: 0,
      attackTimer: 8,
      color: '#ff0040',
      name: 'BOSS'
    }
    this.bossDamagers = new Map()
    io.to(this.id).emit('boss:spawned', this.boss)
  }

  _bossDefeated() {
    if (!this.boss) return
    const topDamager = Array.from(this.bossDamagers.entries()).sort((a, b) => b[1] - a[1])[0]
    io.to(this.id).emit('boss:defeated', {
      topDamagerId: topDamager?.[0] || null,
      topDamagerName: this.players.get(topDamager?.[0])?.name || '?'
    })
    for (const [, player] of this.players) {
      if (!player.dead) io.to(player.socketId).emit('boss:reward', { xp: 500, gold: 100 })
    }
    this.boss = null
    this.bossRespawnTimer = 30
  }

  _updateKingOfHill(dt) {
    if (this.mode !== 'king_of_hill' || !this.koth || this.koth.ended) return
    this.koth.timer -= dt
    this.koth.moveTimer -= dt
    if (this.koth.moveTimer <= 0) {
      this.koth.moveTimer = 120
      this.koth.x = 800 + Math.random() * (WORLD_SIZE - 1600)
      this.koth.y = 800 + Math.random() * (WORLD_SIZE - 1600)
      io.to(this.id).emit('koth:moved', { x: this.koth.x, y: this.koth.y, radius: this.koth.radius })
    }
    for (const [, player] of this.players) {
      if (player.dead) continue
      const inZone = dist(player, this.koth) < this.koth.radius
      if (inZone) {
        const prev = this.kothScores.get(player.id) || 0
        this.kothScores.set(player.id, prev + 5 * dt)
      } else {
        for (const cell of player.cells) {
          if (cell.mass > 20) cell.mass = Math.max(20, cell.mass - cell.mass * 0.008 * dt)
        }
      }
    }
    if (this._tick % TICK_RATE === 0) {
      const scores = Array.from(this.kothScores.entries()).map(([id, score]) => {
        const p = this.players.get(id)
        return { id, name: p?.name || '?', score: Math.floor(score) }
      }).sort((a, b) => b.score - a.score)
      io.to(this.id).emit('koth:update', { scores, timeLeft: Math.ceil(Math.max(0, this.koth.timer)), zone: { x: this.koth.x, y: this.koth.y, radius: this.koth.radius } })
    }
    if (this.koth.timer <= 0) {
      this.koth.ended = true
      const sorted = Array.from(this.kothScores.entries()).sort((a, b) => b[1] - a[1])
      const winnerId = sorted[0]?.[0]
      const winner = this.players.get(winnerId)
      io.to(this.id).emit('koth:ended', { winner: winner ? { id: winner.id, name: winner.name } : null })
    }
  }

  _updateInfection(dt) {
    if (this.mode !== 'infection' || this.infectionEnded) return
    if (!this.infectionStarted) {
      this.infectionStartTimer -= dt
      if (this.infectionStartTimer <= 0 && this.players.size > 0) {
        this.infectionStarted = true
        const pArr = Array.from(this.players.values()).filter(p => !p.dead)
        if (pArr.length > 0) {
          const zombie = pArr[Math.floor(Math.random() * pArr.length)]
          this.zombies.add(zombie.id)
          zombie.color = '#7cfc00'
          zombie.isZombie = true
          io.to(this.id).emit('infection:start', { zombieId: zombie.id })
        }
      }
    }
    const humans = Array.from(this.players.values()).filter(p => !p.dead && !this.zombies.has(p.id))
    if (this.infectionStarted && humans.length === 0 && this.players.size > 0) {
      this.infectionEnded = true
      const winner = Array.from(this.zombies).map(id => this.players.get(id)).filter(Boolean).sort((a, b) => b.mass - a.mass)[0]
      io.to(this.id).emit('infection:ended', { winner: winner ? { id: winner.id, name: winner.name } : null, reason: 'all_infected' })
    } else if (this.infectionStarted && this.zombies.size > 0) {
      if (humans.length === 1) {
        io.to(this.id).emit('infection:lastHuman', { id: humans[0].id, name: humans[0].name })
      }
    }
  }

  _updateCrystalHunt(dt) {
    if (this.mode !== 'crystal_hunt' || this.crystalHuntEnded) return
    this.crystalHuntTimer -= dt
    this.crystalRespawnTimer -= dt
    if (this.crystalRespawnTimer <= 0 && this.crystals.length < 8) {
      this._spawnCrystal()
      this.crystalRespawnTimer = 45
    }
    for (const [pid, endTime] of this.glowingPlayers) {
      if (Date.now() > endTime) this.glowingPlayers.delete(pid)
    }
    if (this.crystalHuntTimer <= 0) {
      this.crystalHuntEnded = true
      const sorted = Array.from(this.crystalScores.entries()).sort((a, b) => b[1] - a[1])
      const winnerId = sorted[0]?.[0]
      const winner = this.players.get(winnerId)
      io.to(this.id).emit('crystal:ended', { winner: winner ? { id: winner.id, name: winner.name, crystals: sorted[0][1] } : null })
    }
  }

  _updateShrinkSurvival(dt) {
    if (this.mode !== 'shrink_survival' || this.shrinkEnded) return
    for (const [, player] of this.players) {
      if (player.dead) continue
      for (const cell of player.cells) {
        const decayRate = cell.mass < 100 ? 0.004 : cell.mass < 500 ? 0.010 : cell.mass < 2000 ? 0.018 : 0.028
        cell.mass = Math.max(20, cell.mass - cell.mass * decayRate * dt)
      }
      player.mass = player.cells.reduce((s, c) => s + c.mass, 0)
    }
    const alive = Array.from(this.players.values()).filter(p => !p.dead && p.mass > 20)
    if (alive.length === 1) {
      this.shrinkEnded = true
      io.to(this.id).emit('shrink:ended', { winner: { id: alive[0].id, name: alive[0].name } })
    } else if (alive.length === 0) {
      this.shrinkEnded = true
      io.to(this.id).emit('shrink:ended', { winner: null })
    }
  }

  _updateBossFight(dt) {
    if (this.mode !== 'boss_fight') return
    if (!this.boss && this.bossRespawnTimer > 0) {
      this.bossRespawnTimer -= dt
      if (this.bossRespawnTimer <= 0) this._spawnBoss()
      return
    }
    if (!this.boss) return
    this.boss.attackTimer -= dt
    const bossSpeed = 180 + Math.random() * 60
    const nearestPlayer = _findNearestEnemy({ players: this.players }, { id: 'boss', x: this.boss.x, y: this.boss.y })
    if (nearestPlayer) {
      const dx = nearestPlayer.x - this.boss.x, dy = nearestPlayer.y - this.boss.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      this.boss.x = clamp(this.boss.x + (dx / d) * bossSpeed * dt, 200, WORLD_SIZE - 200)
      this.boss.y = clamp(this.boss.y + (dy / d) * bossSpeed * dt, 200, WORLD_SIZE - 200)
    }
    if (this.boss.attackTimer <= 0) {
      this.boss.attackTimer = 8
      const blastRadius = massToRadius(this.boss.mass) * 2.5 + 400
      for (const [, player] of this.players) {
        if (player.dead) continue
        if (dist(player, this.boss) < blastRadius) {
          this._explodePlayer(player, player.cells[0])
          io.to(player.socketId).emit('boss:blast', { damage: 50 })
        }
      }
      io.to(this.id).emit('boss:attack', { x: this.boss.x, y: this.boss.y, radius: blastRadius })
    }
    if (this._tick % TICK_RATE === 0) {
      io.to(this.id).emit('boss:state', { x: this.boss.x, y: this.boss.y, mass: Math.floor(this.boss.mass), attackTimer: this.boss.attackTimer })
    }
  }

  _updateTeams(dt) {
    if (this.mode !== 'teams' || this.teamEnded) return
    const redPlayers = Array.from(this.players.values()).filter(p => !p.dead && p.team === 'red')
    const bluePlayers = Array.from(this.players.values()).filter(p => !p.dead && p.team === 'blue')
    if (this.players.size > 1 && (redPlayers.length === 0 || bluePlayers.length === 0)) {
      this.teamEnded = true
      const winner = redPlayers.length > 0 ? 'red' : 'blue'
      io.to(this.id).emit('teams:ended', { winner })
    }
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

  _updateRush(dt) {
    if (this.mode !== 'rush' || this._rushEnded) return
    this.rushTime = (this.rushTime || 300) - dt
    if (this._tick % TICK_RATE === 0) {
      io.to(this.id).emit('rush:tick', { timeLeft: Math.max(0, Math.ceil(this.rushTime)) })
    }
    if (this.rushTime <= 0) {
      this._rushEnded = true
      const winner = Array.from(this.players.values())
        .filter(p => !p.dead && p.mass > 0)
        .sort((a, b) => b.mass - a.mass)[0]
      io.to(this.id).emit('rush:ended', {
        winner: winner ? { id: winner.id, name: winner.name, mass: Math.floor(winner.mass) } : null
      })
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
    if (victim.socketId) {
      io.to(victim.socketId).emit('player:died', { id: victim.id, killedBy: killer.name })
    }
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
        cs: p.cells.map(c => ({ i: c.id, x: Math.round(c.x), y: Math.round(c.y), m: Math.round(c.mass) })),
        c: p.color,
        n: p.name,
        g: p.isGod ? 1 : 0,
        cl: p.clan || null,
        frozen: p.frozen > 0 ? 1 : 0,
        poisoned: p.poisoned > 0 ? 1 : 0,
        ghost: p.skillGhostTimer > 0 ? 1 : 0,
        pk: p.ownedPackage || 'free'
      })
    }
    const modeData = {}
    if (this.mode === 'crystal_hunt' && this.crystals?.length) {
      modeData.crystals = this.crystals
      modeData.glowingPlayers = Array.from(this.glowingPlayers.keys())
    }
    if (this.mode === 'boss_fight' && this.boss) {
      modeData.boss = { x: this.boss.x, y: this.boss.y, mass: Math.floor(this.boss.mass), attackTimer: Math.ceil(this.boss.attackTimer) }
    }
    if (this.mode === 'king_of_hill' && this.koth) {
      modeData.koth = { x: this.koth.x, y: this.koth.y, radius: this.koth.radius }
    }
    if (this.mode === 'infection') {
      modeData.zombies = Array.from(this.zombies)
    }
    io.to(this.id).emit('world:state', { players, tick: this._tick, mode: this.mode, modeData })
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
      .filter(p => !p.dead && p.mass > 0)
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 10)
      .map(p => ({ id: p.id, name: p.name, mass: Math.floor(p.mass), color: p.color, isGod: !!p.isGod, clan: p.clan || null }))
  }

  getPublicPlayers(excludeId) {
    return Array.from(this.players.values())
      .filter(p => p.id !== excludeId && !p.dead)
      .map(p => ({ id: p.id, x: p.x, y: p.y, mass: p.mass, cells: p.cells.map(c => ({ id: c.id, x: c.x, y: c.y, mass: c.mass })), name: p.name, color: p.color, isGod: !!p.isGod, clan: p.clan || null }))
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

      const VALID_PACKAGES = ['free','trial','starter','player','pro','elite','champion','master','legend','apex','immortal']
      const ownedPackage = VALID_PACKAGES.includes(data.ownedPackage) ? data.ownedPackage : 'free'

      const spawnMass = room.mode === 'shrink_survival' ? 500 : 300
      const assignedTeam = room.mode === 'teams'
        ? (Array.from(room.players.values()).filter(p => p.team === 'red').length <= Array.from(room.players.values()).filter(p => p.team === 'blue').length ? 'red' : 'blue')
        : (data.team || 'none')

      const player = {
        id: playerId,
        socketId: socket.id,
        name: (data.name || 'Player').slice(0, 24),
        color: data.color || '#6366f1',
        isGod: false,
        clan: data.clan || null,
        isPremium: !!data.isPremium,
        ownedPackage,
        team: assignedTeam,
        mass: spawnMass,
        x: spawnX,
        y: spawnY,
        cells: [{ id: rndId(), x: spawnX, y: spawnY, mass: spawnMass, mergeTimer: 0 }],
        kills: 0,
        dead: false,
        inputX: spawnX,
        inputY: spawnY,
        frozen: 0,
        poisoned: 0,
        skillSpeedTimer: 0,
        skillSlowTimer: 0,
        skillShieldTimer: 0,
        skillMagnetTimer: 0,
        skillGhostTimer: 0,
        joinedAt: Date.now(),
        _skillCooldowns: {},
        _skillUseCount: {},
        _skillRateWindow: {},
        _lastSplit: 0,
        _splitCount5s: 0,
        _splitWindow: Date.now(),
        _lastEject: 0,
        _ejectCount5s: 0,
        _ejectWindow: Date.now(),
        _virusEatCount: 0
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
        spawnX, spawnY, spawnMass,
        mode: room.mode,
        crystals: room.crystals || [],
        boss: room.boss || null,
        koth: room.koth || null,
        zombies: room.zombies ? Array.from(room.zombies) : [],
        assignedTeam
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
    if (typeof data.clientMass === 'number' && data.clientMass > 0 && data.clientMass < 500000) {
      player.reportedMass = data.clientMass
    }
    if (Array.isArray(data.cells) && data.cells.length > 0 && data.cells.length <= MAX_CELLS) {
      for (let i = 0; i < Math.min(data.cells.length, player.cells.length); i++) {
        const cc = data.cells[i]
        const sc = player.cells[i]
        if (typeof cc.x !== 'number' || typeof cc.y !== 'number') continue
        const cx = clamp(cc.x, 0, WORLD_SIZE), cy = clamp(cc.y, 0, WORLD_SIZE)
        const maxMove = speedForMass(sc.mass || 20) * 60 * 0.5
        const dx = cx - sc.x, dy = cy - sc.y
        const d = Math.sqrt(dx*dx + dy*dy)
        if (d < maxMove) { sc.x = cx; sc.y = cy }
      }
      const cx = player.cells.reduce((s,c)=>s+c.x,0)/player.cells.length
      const cy = player.cells.reduce((s,c)=>s+c.y,0)/player.cells.length
      player.x = cx; player.y = cy
    }
  })

  socket.on('input:split', () => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const now = Date.now()
    if (!player._lastSplit) player._lastSplit = 0
    if (!player._splitCount5s) player._splitCount5s = 0
    if (!player._splitWindow) player._splitWindow = now
    if (now - player._splitWindow > 5000) { player._splitCount5s = 0; player._splitWindow = now }
    player._splitCount5s++
    if (player._splitCount5s > 60) {
      socket.emit('anticheat:warn', { reason: 'split_spam' })
      player.dead = true
      return
    }
    if (now - player._lastSplit < 80) return
    player._lastSplit = now
    room._handleSplit(player)
  })

  socket.on('input:eject', () => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const now = Date.now()
    if (!player._lastEject) player._lastEject = 0
    if (!player._ejectCount5s) player._ejectCount5s = 0
    if (!player._ejectWindow) player._ejectWindow = now
    if (now - player._ejectWindow > 5000) { player._ejectCount5s = 0; player._ejectWindow = now }
    player._ejectCount5s++
    if (player._ejectCount5s > 80) {
      socket.emit('anticheat:warn', { reason: 'eject_spam' })
      player.dead = true
      return
    }
    if (now - player._lastEject < 25) return
    player._lastEject = now
    room._handleEject(player)
  })

  socket.on('input:skill', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const skill = data.skill
    const VALID_SKILLS = ['speed', 'shield', 'slow', 'magnet', 'ghost', 'teleport']
    if (!VALID_SKILLS.includes(skill)) return

    const tier = player.ownedPackage || 'free'
    const TIER_ORDER = ['free','trial','starter','player','pro','elite','champion','master','legend','apex','immortal']
    const tierIdx = TIER_ORDER.indexOf(tier)
    const LEGEND_SKILLS = ['speed','slow','shield','magnet','ghost','teleport']
    if (LEGEND_SKILLS.includes(skill) && !player.isGod) {
      const minTier = TIER_ORDER.indexOf('legend')
      if (tierIdx < minTier) {
        socket.emit('skill:denied', { skill, reason: 'package_required', remaining: 0 })
        return
      }
    }

    const now = Date.now()
    if (!player._skillCooldowns) player._skillCooldowns = {}
    if (!player._skillUseCount) player._skillUseCount = {}
    if (!player._skillRateWindow) player._skillRateWindow = {}

    const COOLDOWNS = { speed: 20000, shield: 15000, slow: 12000, magnet: 25000, ghost: 35000, teleport: 45000 }
    const PREMIUM_COOLDOWNS = { speed: 12000, shield: 9000, slow: 7000, magnet: 16000, ghost: 22000, teleport: 28000 }
    const cooldownMs = player.isPremium ? PREMIUM_COOLDOWNS[skill] : COOLDOWNS[skill]

    if (now - (player._skillCooldowns[skill] || 0) < cooldownMs) {
      socket.emit('skill:denied', { skill, remaining: Math.ceil((cooldownMs - (now - player._skillCooldowns[skill])) / 1000) })
      return
    }

    const window5s = player._skillRateWindow[skill] || 0
    if (now - window5s > 5000) {
      player._skillUseCount[skill] = 0
      player._skillRateWindow[skill] = now
    }
    player._skillUseCount[skill] = (player._skillUseCount[skill] || 0) + 1
    if (player._skillUseCount[skill] > 3) {
      socket.emit('anticheat:warn', { reason: 'skill_spam' })
      player.dead = true
      return
    }

    player._skillCooldowns[skill] = now

    if (skill === 'speed') {
      player.skillSpeedTimer = player.isPremium ? 14 : 10
    } else if (skill === 'shield') {
      player.skillShieldTimer = player.isPremium ? 8 : 5
    } else if (skill === 'slow') {
      const nearest = _findNearestEnemy(room, player)
      if (nearest) nearest.skillSlowTimer = player.isPremium ? 5 : 3
    } else if (skill === 'magnet') {
      player.skillMagnetTimer = player.isPremium ? 12 : 8
    } else if (skill === 'ghost') {
      player.skillGhostTimer = player.isPremium ? 6 : 4
    } else if (skill === 'teleport') {
      const angle = Math.random() * Math.PI * 2
      const dist_t = 800 + Math.random() * 400
      for (const cell of player.cells) {
        cell.x = clamp(cell.x + Math.cos(angle) * dist_t, 200, WORLD_SIZE - 200)
        cell.y = clamp(cell.y + Math.sin(angle) * dist_t, 200, WORLD_SIZE - 200)
      }
      const cx = player.cells.reduce((s,c)=>s+c.x,0)/player.cells.length
      const cy = player.cells.reduce((s,c)=>s+c.y,0)/player.cells.length
      player.x = cx; player.y = cy
      player.inputX = cx; player.inputY = cy
    }

    socket.emit('skill:activated', { skill, cooldown: cooldownMs })
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

  socket.on('virus:touch', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const virusId = data.id
    const virusIdx = room.viruses.findIndex(v => v.id === virusId)
    if (virusIdx === -1) return
    io.to(room.id).emit('virus:eaten', { id: virusId })
    room.viruses.splice(virusIdx, 1)
    while (room.viruses.length < VIRUS_COUNT) {
      const nv = room._makeVirus()
      room.viruses.push(nv)
      io.to(room.id).emit('virus:spawned', nv)
    }
  })

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
