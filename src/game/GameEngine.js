import { ref, set, update as fbUpdate, onValue, remove, push, off, get } from 'firebase/database'
import { db } from '../firebase/config'
import { getTheme } from '../themes/themes'
import { v4 as uuidv4 } from 'uuid'
import { soundSystem } from './SoundSystem'
import { socketClient } from './SocketClient'

const WORLD_SIZE = 6000
const FOOD_COUNT = 1000
const VIRUS_COUNT = 40
const BASE_SPEED = 6.5
const SPLIT_SPEED = 24
const MERGE_TIME = 30000
const MAX_CELLS = 16
const MIN_MASS_SPLIT = 35
const EJECT_MASS_SM = 12
const EJECT_MASS_MD = 12
const EJECT_MASS_LG = 12
const EJECT_COST = 2
const MIN_EAT_RATIO = 1.15
const GOLD_PER_CELL_EAT = 5
const GOLD_BUY_A_COST = 10
const GOLD_BUY_A_MASS = 60
const GOLD_BUY_S_COST = 50
const GOLD_BUY_S_MASS = 350

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }
function scoreMultiplierForMass(mass) {
  if (mass >= 2000) return 3
  if (mass >= 500) return 2
  if (mass >= 100) return 1.5
  return 1
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function massToRadius(mass) { return Math.sqrt(mass) * 4.5 }
function lerp(a, b, t) { return a + (b - a) * t }
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 100, g: 100, b: 100 }
  const clean = hex.replace('#', '').slice(0, 6)
  if (clean.length < 6) return { r: 100, g: 100, b: 100 }
  const n = parseInt(clean, 16)
  if (isNaN(n)) return { r: 100, g: 100, b: 100 }
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 }
}
function lighten(hex, amt, alpha = 1) {
  const {r,g,b} = hexToRgb(hex)
  return `rgba(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)},${alpha})`
}
function darken(hex, amt, alpha = 1) {
  const {r,g,b} = hexToRgb(hex)
  return `rgba(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)},${alpha})`
}
function hexAlpha(hex, alpha) {
  const {r,g,b} = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}
function safeColor(color) {
  if (!color || typeof color !== 'string') return '#6366f1'
  if (color.startsWith('#')) return color.slice(0, 7)
  if (color.startsWith('rgb')) return color
  return '#6366f1'
}

const VIRUS_TYPES = {
  normal:   { color: '#22c55e', border: '#15803d', mass: 100, label: '🌿', glowColor: '34,197,94' },
  super:    { color: '#16a34a', border: '#14532d', mass: 200, label: '💢', glowColor: '22,163,74' },
  poison:   { color: '#a855f7', border: '#7e22ce', mass: 100, label: '☠️', glowColor: '168,85,247' },
  freeze:   { color: '#38bdf8', border: '#0284c7', mass: 100, label: '❄️', glowColor: '56,189,248' }
}

class Cell {
  constructor(x, y, mass, color) {
    this.x = x; this.y = y; this.mass = mass; this.color = color
    this.vx = 0; this.vy = 0
    this.mergeTimer = 0
    this.id = uuidv4()
    this.poisoned = 0
    this.frozen = 0
    this.eatPulse = 0
  }
  get radius() { return massToRadius(this.mass) }
}

class Food {
  constructor(x, y, color, value = 5) {
    this.x = x; this.y = y; this.color = color; this.value = value
    this.radius = 6 + Math.random() * 3
    this.pulse = Math.random() * Math.PI * 2
    this.id = uuidv4()
    this.poison = false
  }
}

class Virus {
  constructor(x, y, type = 'normal') {
    this.x = x; this.y = y
    this.type = type
    this.mass = 100
    this.id = uuidv4()
    this.pulse = Math.random() * Math.PI * 2
    this.rotAngle = 0
    this.dead = false
    this.spawnX = x; this.spawnY = y
    this.feedCount = 0
    this.age = 0
    this.vx = (Math.random() - 0.5) * 0.8
    this.vy = (Math.random() - 0.5) * 0.8
    this.moveTimer = 3 + Math.random() * 4
  }
  get radius() { return massToRadius(this.mass) }
}

const GOLD_BUY_A_COST_NEW = 10
const GOLD_BUY_A_MASS_NEW = 50
const GOLD_BUY_S_COST_NEW = 100
const GOLD_BUY_S_MASS_NEW = 250
const GAME_DURATION = 3600
const RUSH_DURATION = 300
const GOLD_EARN_THRESHOLD = 1000
const VIRUS_FEED_GROW = 25
const VIRUS_SPLIT_THRESHOLD = 280
const SKILL_SPEED_DURATION = 10
const SKILL_SPEED_COOLDOWN = 30
const SKILL_SLOW_DURATION = 5
const SKILL_SLOW_COOLDOWN = 15
const SKILL_SHIELD_DURATION = 5
const SKILL_SHIELD_COOLDOWN = 20
const BOT_NAMES = ['Zephyr','NeonBlob','CellKing','AgarPro','BlobZilla','MassHunter','VirusKing','StarEater','CyberCell','NightCrawler','ShadowCell','PhantomBlob','IronCore','ThunderMass','VoidEater','SilverFang','GoldenCell','DarkMatter','CrimsonBlob','AzureCell','VenomBlob','FrostKing','PlasmaCore','UltraCell','OmegaBlob','TitanMass','HyperBlob','MegaCell','SuperNova','InfiniteCell']
const BOT_COLORS = ['#6366f1','#ec4899','#f59e0b','#06b6d4','#10b981','#8b5cf6','#ef4444','#38bdf8','#a855f7','#22c55e','#f97316','#14b8a6','#e11d48','#7c3aed','#0ea5e9','#16a34a','#dc2626','#2563eb','#9333ea','#0d9488','#b45309','#7e22ce','#0284c7','#15803d','#991b1b','#1d4ed8','#6b21a8','#0e7490','#92400e','#3b0764']

class EjectedMass {
  constructor(x, y, vx, vy, color, mass = EJECT_MASS_SM) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy
    this.color = color; this.mass = mass
    this.id = uuidv4(); this.life = 1.0
    this.settled = false
    this.settledTimer = 0
    this.dirAngle = Math.atan2(vy, vx)
  }
  get radius() { return 5 }
}

class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize
    this.buckets = new Map()
  }
  _key(x, y) { return ((x / this.cellSize) | 0) + ',' + ((y / this.cellSize) | 0) }
  clear() { this.buckets.clear() }
  insert(item) {
    const k = this._key(item.x, item.y)
    let b = this.buckets.get(k)
    if (!b) { b = []; this.buckets.set(k, b) }
    b.push(item)
  }
  query(cx, cy, radius) {
    const out = []
    const cr = Math.ceil(radius / this.cellSize)
    const gx = (cx / this.cellSize) | 0
    const gy = (cy / this.cellSize) | 0
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dy = -cr; dy <= cr; dy++) {
        const b = this.buckets.get((gx + dx) + ',' + (gy + dy))
        if (b) for (const it of b) out.push(it)
      }
    }
    return out
  }
}

class Bot {
  constructor(x, y, color, name, difficulty = 'medium') {
    this.x = x; this.y = y
    this.mass = 20 + Math.random() * 60
    this.color = color; this.name = name; this.difficulty = difficulty
    this.id = 'bot_' + uuidv4().slice(0, 8)
    this.vx = 0; this.vy = 0
    this.targetX = x; this.targetY = y
    this.thinkTimer = 0; this.splitTimer = 0
    this.cells = [{ x, y, mass: this.mass }]
    this.isGod = false; this.dead = false; this.respawnTimer = 0
  }
  get radius() { return massToRadius(this.mass) }
}

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.options = options
    this.theme = getTheme(options.theme || 'cyberpunk')

    this.playerId = options.playerId || uuidv4()
    this.playerName = options.playerName || 'Player'
    this.playerColor = options.color || '#6366f1'
    this.roomId = options.roomId || 'default'
    this.gameMode = options.gameMode || 'ffa'
    this.isGod = options.isGod || false

    this.cells = []
    this.otherPlayers = {}
    this.food = []
    this.viruses = []
    this.ejected = []
    this.particles = []
    this.floatingTexts = []

    this.mouse = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 }
    this.camera = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 }

    this.score = 0
    this._bestScore = 0
    this.gold = 0
    this.dead = false
    this.running = false
    this.offline = false
    this.frameId = null
    this.lastTime = 0
    this.syncInterval = null
    this.isHost = false

    this.autoMove = false
    this.autoMoveTarget = null
    this.spectating = false
    this.spectateTargets = []
    this.spectateIndex = 0

    this.keys = {}
    this.lastEjectTime = 0
    this.lastGoldBuy = 0
    this.lastMacroZ = 0
    this.lastMacroX = 0
    this._splitCount = 0
    this._splitResetTimer = 0
    this._soundUnlocked = false

    this.leaderboard = []
    this.totalPlayers = 0
    this.kills = 0
    this.bots = []
    this.goldTimer = 0
    this.gameTime = GAME_DURATION
    this.bgTime = 0
    this.skills = {
      speed: { active: false, timer: 0, cooldown: 0 },
      slow: { active: false, timer: 0, cooldown: 0, targetId: null },
      shield: { active: false, timer: 0, cooldown: 0 }
    }
    this.slowedEntities = {}
    this.clickTarget = null
    this.deathParticles = []
    this.screenFlash = 0
    this._boundClick = this._onClick.bind(this)

    this.premiumEffects = []
    this.absorbParticles = []
    this._particlePool = []
    this._fpsHistory = []
    this._lastFpsTime = performance.now()
    this.qualityLevel = 'high'
    this.lastEatTime = Date.now()
    this.virusSpawnTimer = 8 + Math.random() * 7
    this._lastValidMass = 20
    this._scoreHistory = []
    this.deathStats = null

    this.playerTeam = options.team || 'none'
    this.brZone = { x: WORLD_SIZE/2, y: WORLD_SIZE/2, radius: WORLD_SIZE*0.48, shrinkTimer: 40, active: false }
    this.rushTime = RUSH_DURATION
    this.modeMessage = null
    this.modeMessageTimer = 0

    this._virusAutoTimer = 7
    this.onScoreChange = options.onScoreChange || (() => {})
    this.onDeath = options.onDeath || (() => {})
    this.onLeaderboardChange = options.onLeaderboardChange || (() => {})
    this.onPlayerCountChange = options.onPlayerCountChange || (() => {})
    this.onGoldChange = options.onGoldChange || (() => {})
    this.onStatusChange = options.onStatusChange || (() => {})
    this.onTimerChange = options.onTimerChange || (() => {})
    this.onSkillChange = options.onSkillChange || (() => {})
    this.onXPGain = options.onXPGain || (() => {})
    this.onKill = options.onKill || (() => {})
    this.onChatMessage = options.onChatMessage || null
    this.foodTrapCooldown = 0
    this._frameCount = 0
    this._foodGrid = new SpatialGrid(200)
    this._virusGrid = new SpatialGrid(300)
    this._foodQueue = { remove: [], add: [] }
    this._foodQueueTimer = 0
    this._botSlot = 0
    this._useSocket = false
    this._pendingFoodEat = []
    this._foodEatTimer = 0

    this._zoomFactor = 1
    this._lastMoveX = 0; this._lastMoveY = 0; this._isMoving = false
    this._boundKeyDown = this._onKeyDown.bind(this)
    this._boundKeyUp = this._onKeyUp.bind(this)
    this._boundMouseMove = this._onMouseMove.bind(this)
    this._boundWheel = this._onWheel.bind(this)
    this._boundResize = this._onResize.bind(this)

    this.spawnX = 400 + Math.random() * (WORLD_SIZE - 800)
    this.spawnY = 400 + Math.random() * (WORLD_SIZE - 800)
    this._virusFirstHit = false
  }

  async init() {
    this._setupEvents()
    this._onResize()
    const inheritMass = this._bestScore > 0 ? Math.max(0, Math.floor(this._bestScore * 0.25 / scoreMultiplierForMass(this._bestScore))) : 0
    const startMass = Math.max(this.options.comeback ? 24 : 20, Math.min(inheritMass, 80))
    this.cells = [new Cell(this.spawnX, this.spawnY, startMass, this.playerColor)]
    if (this.options.comeback) {
      setTimeout(() => this._showFloat('+20% COMEBACK! 🔥', '#fbbf24'), 500)
    }
    if (inheritMass > 20) {
      setTimeout(() => this._showFloat(`🏆 Miras: +${Math.floor(startMass - 20)} kütle`, '#a855f7'), 600)
    }
    this.camera.x = this.spawnX
    this.camera.y = this.spawnY
    this._initOffline()
    this._initBots()
    this.running = true
    this.lastTime = performance.now()
    this.frameId = requestAnimationFrame(this._loop.bind(this))

    try {
      await socketClient.connect()
      await this._initSocket()
    } catch (_socketErr) {
      try {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
        await Promise.race([this._initFirebase(), timeout])
        if (this.running) { this.offline = false }
      } catch (_) {}
    }
  }

  _initOffline() {
    this.offline = true
    this.isHost = true
    if (this.gameMode === 'battle_royale') this.brZone.active = true
    if (this.gameMode === 'rush') this.gameTime = RUSH_DURATION
    const colors = this.theme.foodColors
    for (let i = 0; i < FOOD_COUNT; i++) {
      this.food.push(new Food(
        Math.random() * WORLD_SIZE,
        Math.random() * WORLD_SIZE,
        colors[Math.floor(Math.random() * colors.length)],
        5
      ))
    }
    const virusTypes = ['normal', 'normal', 'normal', 'normal', 'super', 'poison', 'freeze']
    for (let i = 0; i < VIRUS_COUNT; i++) {
      const t = virusTypes[Math.floor(Math.random() * virusTypes.length)]
      this.viruses.push(new Virus(
        600 + Math.random() * (WORLD_SIZE - 1200),
        600 + Math.random() * (WORLD_SIZE - 1200),
        t
      ))
    }
    this.onPlayerCountChange(1)
    this.onLeaderboardChange([{ id: this.playerId, name: this.playerName, mass: 20, color: this.playerColor, isGod: this.isGod }])
  }

  async _initSocket() {
    this._useSocket = true
    this.offline = false

    const state = await socketClient.joinRoom({
      playerId: this.playerId,
      roomId: this.roomId,
      mode: this.gameMode,
      name: this.playerName,
      color: this.playerColor,
      isGod: this.isGod,
      clan: this.options.clan || null,
      isPremium: this.options.isPremium || false,
      team: this.playerTeam
    })

    if (state?.food?.length) {
      this.food = state.food.map(f => {
        const o = new Food(f.x, f.y, f.color, f.value || 1)
        o.id = f.id; o.radius = f.radius || 10; return o
      })
    }
    if (state?.viruses?.length) {
      this.viruses = state.viruses.map(v => {
        const o = new Virus(v.x, v.y, v.type || 'normal')
        o.id = v.id; return o
      })
    }
    if (state?.players?.length) {
      for (const p of state.players) {
        this.otherPlayers[p.id] = { x: p.x, y: p.y, targetX: p.x, targetY: p.y, mass: p.mass || 20, cells: p.cells || [], name: p.name, color: p.color, isGod: !!p.isGod, clan: p.clan || null }
      }
    }
    if (state?.leaderboard) { this.leaderboard = state.leaderboard; this.onLeaderboardChange(state.leaderboard) }
    if (state?.playerCount) { this.totalPlayers = state.playerCount; this.onPlayerCountChange(state.playerCount) }
    if (state?.chat?.length && this.onChatMessage) {
      for (const msg of state.chat) this.onChatMessage(msg)
    }

    socketClient
      .on('player:update', (p) => {
        if (p.id === this.playerId) return
        if (this.otherPlayers[p.id]) {
          Object.assign(this.otherPlayers[p.id], { targetX: p.x, targetY: p.y, mass: p.m || p.mass || 20, cells: p.cs || p.cells || [], name: p.n || p.name, color: p.c || p.color, isGod: !!p.g, clan: p.cl || null })
        } else {
          this.otherPlayers[p.id] = { x: p.x, y: p.y, targetX: p.x, targetY: p.y, mass: p.m || 20, cells: p.cs || [], name: p.n || '?', color: p.c || '#6366f1', isGod: !!p.g, clan: p.cl || null }
        }
      })
      .on('player:join', (p) => {
        if (p.id === this.playerId) return
        this.otherPlayers[p.id] = { x: p.x, y: p.y, targetX: p.x, targetY: p.y, mass: p.mass || 20, cells: [], name: p.name, color: p.color, isGod: !!p.isGod, clan: p.clan || null }
        this._showFloat(`👋 ${p.name} katıldı!`, '#4ade80')
      })
      .on('player:leave', (d) => {
        delete this.otherPlayers[d.id]
      })
      .on('player:died', (d) => {
        if (d.id !== this.playerId) delete this.otherPlayers[d.id]
      })
      .on('player:killed', (d) => {
        if (d.killerId === this.playerId) {
          this._showFloat(`💀 ${d.victimName || '?'} yenildi!`, '#fbbf24')
        }
      })
      .on('food:update', (d) => {
        if (d.removed?.length) {
          const rmSet = new Set(d.removed)
          this.food = this.food.filter(f => !rmSet.has(f.id))
        }
        if (d.spawned?.length) {
          for (const f of d.spawned) {
            const o = new Food(f.x, f.y, f.color, f.value || 1)
            o.id = f.id; o.radius = f.radius || 10
            this.food.push(o)
          }
        }
      })
      .on('leaderboard:update', (d) => {
        if (d.leaderboard) { this.leaderboard = d.leaderboard; this.onLeaderboardChange(d.leaderboard) }
        if (d.playerCount != null) { this.totalPlayers = d.playerCount; this.onPlayerCountChange(d.playerCount) }
      })
      .on('chat:message', (msg) => {
        if (this.onChatMessage) this.onChatMessage(msg)
      })
      .on('virus:spawned', (v) => {
        const o = new Virus(v.x, v.y, v.type || 'normal')
        o.id = v.id
        this.viruses.push(o)
      })
      .on('anticheat:warn', (d) => {
        console.warn('[AntiCheat]', d.reason)
        this._showFloat('⛔ Hile Tespit! Bağlantı Kesildi.', '#ef4444')
        this.screenFlash = 1
        setTimeout(() => {
          this.dead = true
          this.onDeath && this.onDeath()
          socketClient.disconnect()
        }, 1500)
      })
      .on('world:state', (data) => {
        if (!data?.players) return
        const activeIds = new Set()
        for (const p of data.players) {
          if (p.id === this.playerId) {
            if (p.cs && p.cs.length) {
              const validCs = p.cs.filter(c => isFinite(c.x) && isFinite(c.y) && isFinite(c.m) && c.m > 0)
              if (!validCs.length) break
              if (this.cells.length === validCs.length) {
                for (let i = 0; i < this.cells.length; i++) {
                  this.cells[i].x = lerp(this.cells[i].x, validCs[i].x, 0.25)
                  this.cells[i].y = lerp(this.cells[i].y, validCs[i].y, 0.25)
                  this.cells[i].mass = lerp(this.cells[i].mass, validCs[i].m, 0.3)
                }
              } else {
                const newCells = validCs.map((c, i) => {
                  const existing = this.cells[i]
                  if (existing) {
                    existing.mass = c.m
                    return existing
                  }
                  const cell = new Cell(c.x, c.y, c.m, this.playerColor)
                  cell.id = uuidv4()
                  return cell
                })
                this.cells = newCells
              }
            }
            if (p.frozen) this._showFloat('❄️ Donduruldu!', '#38bdf8')
            if (p.poisoned) this._showFloat('☠️ Zehirlendi!', '#a855f7')
          } else {
            activeIds.add(p.id)
            const cells = p.cs ? p.cs.map(c => ({ x: c.x, y: c.y, mass: c.m })) : []
            if (this.otherPlayers[p.id]) {
              const op = this.otherPlayers[p.id]
              op.targetX = p.x; op.targetY = p.y
              op.mass = p.m || 20; op.cells = cells
              op.name = p.n || op.name; op.color = p.c || op.color
              op.isGod = !!p.g; op.frozen = !!p.frozen; op.poisoned = !!p.poisoned
            } else {
              this.otherPlayers[p.id] = {
                x: p.x, y: p.y, targetX: p.x, targetY: p.y,
                mass: p.m || 20, cells, name: p.n || '?',
                color: p.c || '#6366f1', isGod: !!p.g, clan: p.cl || null,
                frozen: !!p.frozen, poisoned: !!p.poisoned
              }
            }
          }
        }
        for (const id of Object.keys(this.otherPlayers)) {
          if (!activeIds.has(id)) delete this.otherPlayers[id]
        }
      })
      .on('skill:activated', (d) => {
        const skillMap = { speed: this.skills.speed, shield: this.skills.shield, slow: this.skills.slow }
        const sk = skillMap[d.skill]
        if (sk) sk.cooldown = (d.cooldown || 20000) / 1000
      })
      .on('skill:denied', (d) => {
        const labels = { speed: '⚡', shield: '🛡️', slow: '🌀' }
        this._showFloat(`${labels[d.skill] || '⛔'} Bekleme: ${d.remaining}s`, '#ef4444')
      })
      .on('zone:update', (d) => {
        if (d?.radius != null) {
          this.brZone.radius = d.radius
          this.brZone.active = true
        }
      })
      .on('rush:tick', (d) => {
        this.rushTime = d.timeLeft
        this.onTimerChange(d.timeLeft)
      })
      .on('rush:ended', (d) => {
        const winner = d.winner
        const isWinner = winner?.id === this.playerId
        this._showFloat(isWinner ? '🏆 KAZANDIN!' : `🏁 Kazanan: ${winner?.name || '?'}`, isWinner ? '#fbbf24' : '#f59e0b')
        this.modeMessage = `🏁 ${winner?.name || '?'} KAZANDI!`
        this.modeMessageTimer = 8
        if (isWinner) {
          this.screenFlash = 0.6
          soundSystem.levelUp?.()
        }
        setTimeout(() => {
          if (!this.dead) { this.dead = true; this.onDeath && this.onDeath() }
        }, 5000)
      })
      .on('ejected:spawn', (list) => {
        if (!Array.isArray(list)) return
        for (const em of list) {
          if (em.color === this.playerColor) continue
          this.ejected.push({
            id: em.id || uuidv4(),
            x: em.x, y: em.y, vx: em.vx || 0, vy: em.vy || 0,
            color: em.color, mass: em.mass || 12,
            settled: false, settledTimer: 0, _pulse: 0
          })
        }
      })
      .on('food:spawned', (list) => {
        if (!Array.isArray(list)) return
        for (const f of list) {
          const o = new Food(f.x, f.y, f.color, f.value || 5)
          o.id = f.id; o.radius = f.radius || 8
          this.food.push(o)
        }
      })

    this._startSocketSync()
  }

  _startSocketSync() {
    if (this.syncInterval) clearInterval(this.syncInterval)
    this.syncInterval = setInterval(() => {
      if (!this.running || this.dead || !socketClient.connected) return
      const mx = this.mouse?.x ?? this.camera.x
      const my = this.mouse?.y ?? this.camera.y
      socketClient.sendInput(mx | 0, my | 0)
    }, 50)
  }

  async _initFirebase() {
    const roomRef = ref(db, `rooms/${this.roomId}`)
    const snap = await get(roomRef)
    const data = snap.val()
    if (!data?.food || Object.keys(data.food || {}).length < 200) {
      this.isHost = true
      await this._generateFood()
      await this._generateViruses()
      await set(ref(db, `rooms/${this.roomId}/meta`), { mode: this.gameMode, host: this.playerId, createdAt: Date.now() })
    } else {
      this._loadFood(data.food)
      this._loadViruses(data.viruses || {})
    }
    this._listenFood()
    this._listenViruses()
    this._listenPlayers()
    this._startSync()
    this._announcePlayer()
  }

  async _generateFood() {
    const foodData = {}
    const colors = this.theme.foodColors
    for (let i = 0; i < FOOD_COUNT; i++) {
      const id = uuidv4().slice(0, 8)
      foodData[id] = { x: Math.random()*WORLD_SIZE, y: Math.random()*WORLD_SIZE, color: colors[Math.floor(Math.random()*colors.length)], value: 1 }
    }
    await set(ref(db, `rooms/${this.roomId}/food`), foodData)
    this.food = Object.entries(foodData).map(([id, f]) => { const o = new Food(f.x,f.y,f.color,f.value); o.id=id; return o })
  }

  async _generateViruses() {
    const vData = {}
    const types = ['normal','normal','normal','super','poison','freeze']
    for (let i = 0; i < VIRUS_COUNT; i++) {
      const id = uuidv4().slice(0, 8)
      const t = types[Math.floor(Math.random()*types.length)]
      vData[id] = { x: 600+Math.random()*(WORLD_SIZE-1200), y: 600+Math.random()*(WORLD_SIZE-1200), type: t }
    }
    await set(ref(db, `rooms/${this.roomId}/viruses`), vData)
    this.viruses = Object.entries(vData).map(([id, v]) => { const o = new Virus(v.x,v.y,v.type||'normal'); o.id=id; return o })
  }

  _loadFood(data) { this.food = Object.entries(data).map(([id,f]) => { const o = new Food(f.x,f.y,f.color,f.value); o.id=id; return o }) }
  _loadViruses(data) { this.viruses = Object.entries(data).map(([id,v]) => { const o = new Virus(v.x,v.y,v.type||'normal'); o.id=id; return o }) }

  _listenFood() {
    onValue(ref(db, `rooms/${this.roomId}/food`), (snap) => {
      if (!snap.exists()) return
      const data = snap.val()
      const ids = new Set(Object.keys(data))
      this.food = this.food.filter(f => ids.has(f.id))
      const existing = new Set(this.food.map(f => f.id))
      for (const [id,f] of Object.entries(data)) {
        if (!existing.has(id)) { const o = new Food(f.x,f.y,f.color,f.value); o.id=id; this.food.push(o) }
      }
    })
  }

  _listenViruses() {
    onValue(ref(db, `rooms/${this.roomId}/viruses`), (snap) => {
      if (!snap.exists()) return
      this.viruses = Object.entries(snap.val()).map(([id,v]) => { const o = new Virus(v.x,v.y,v.type||'normal'); o.id=id; return o })
    })
  }

  _listenPlayers() {
    onValue(ref(db, `rooms/${this.roomId}/players`), (snap) => {
      if (!snap.exists()) return
      const data = snap.val()
      const newOthers = {}
      let count = 0
      for (const [id, p] of Object.entries(data)) {
        count++
        if (id !== this.playerId) {
          const mass = p.m || p.mass || 20
          const name = p.n || p.name || '?'
          const color = p.c || p.color || '#6366f1'
          const isGod = !!(p.g || p.isGod)
          const clan = p.cl || p.clan || null
          const cells = p.cs || p.cells || []
          if (this.otherPlayers[id]) {
            Object.assign(this.otherPlayers[id], { targetX: p.x, targetY: p.y, mass, cells, name, color, isGod, clan })
          } else {
            this.otherPlayers[id] = { x: p.x, y: p.y, targetX: p.x, targetY: p.y, mass, cells, name, color, isGod, clan }
          }
          newOthers[id] = true
        }
      }
      for (const id of Object.keys(this.otherPlayers)) { if (!newOthers[id]) delete this.otherPlayers[id] }
      this.totalPlayers = count
      this.onPlayerCountChange(count)
      this._updateLeaderboard(data)
    })
  }

  _announcePlayer() {
    let totalMass = 0, sx = 0, sy = 0
    for (const c of this.cells) { totalMass += c.mass; sx += c.x; sy += c.y }
    const n = this.cells.length || 1
    const cx = (sx / n) | 0, cy = (sy / n) | 0
    const cells = this.cells.length > 1
      ? this.cells.map(c => ({ x: c.x | 0, y: c.y | 0, m: c.mass | 0 }))
      : null
    const payload = { x: cx, y: cy, m: totalMass | 0, n: this.playerName, c: this.playerColor, t: Date.now() }
    if (this.isGod) payload.g = 1
    if (this.options.clan) payload.cl = this.options.clan
    if (cells) payload.cs = cells
    set(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), payload).catch(() => {})
  }

  _startSync() {
    if (this.offline) return
    this.syncInterval = setInterval(() => {
      if (!this.running || this.dead) return
      this._announcePlayer()
    }, 150)
  }

  _updateLeaderboard(data) {
    const lb = Object.entries(data)
      .map(([id,p]) => ({ id, name: p.n || p.name || '?', mass: p.m || p.mass || 0, color: p.c || p.color || '#6366f1', isGod: !!(p.g || p.isGod) }))
      .sort((a,b) => b.mass - a.mass).slice(0, 10)
    this.leaderboard = lb
    this.onLeaderboardChange(lb)
  }

  _setupEvents() {
    window.addEventListener('keydown', this._boundKeyDown)
    window.addEventListener('keyup', this._boundKeyUp)
    this.canvas.addEventListener('mousemove', this._boundMouseMove)
    this.canvas.addEventListener('click', this._boundClick)
    this.canvas.addEventListener('wheel', this._boundWheel, { passive: false })
    window.addEventListener('resize', this._boundResize)
  }

  _removeEvents() {
    window.removeEventListener('keydown', this._boundKeyDown)
    window.removeEventListener('keyup', this._boundKeyUp)
    this.canvas.removeEventListener('mousemove', this._boundMouseMove)
    this.canvas.removeEventListener('click', this._boundClick)
    this.canvas.removeEventListener('wheel', this._boundWheel)
    window.removeEventListener('resize', this._boundResize)
  }

  _onKeyDown(e) {
    const GAME_KEYS = ['Space','KeyW','KeyE','KeyR','KeyA','KeyS','KeyZ','KeyX','KeyT','KeyQ','Digit1','Digit2','KeyF','KeyG','KeyH','KeyJ','KeyN']
    if (GAME_KEYS.includes(e.code)) e.preventDefault()

    if (!this._soundUnlocked) { soundSystem.resume(); this._soundUnlocked = true }

    this.keys[e.code] = true
    const now = Date.now()

    if (e.code === 'Space') { this._split(); soundSystem.split(); if (this._useSocket) socketClient.sendSplit() }
    if (e.code === 'KeyW' && now - this.lastEjectTime > 30) { this._eject(EJECT_MASS_SM); this.lastEjectTime = now; if (this._useSocket) socketClient.sendEject() }
    if (e.code === 'KeyR' && now - this.lastEjectTime > 30) { this._eject(EJECT_MASS_LG); this.lastEjectTime = now; if (this._useSocket) socketClient.sendEject() }
    if (e.code === 'KeyA' && now - this.lastGoldBuy > 300) { this._buyMass('small'); this.lastGoldBuy = now }
    if (e.code === 'KeyS' && now - this.lastGoldBuy > 300) { this._buyMass('large'); this.lastGoldBuy = now }
    if (e.code === 'KeyZ' && now - this.lastMacroZ > 300) { this._macroDoubleSplit(); this.lastMacroZ = now }
    if (e.code === 'KeyX' && now - this.lastMacroX > 500) { this._macroMaxSplit(); this.lastMacroX = now }
    if (e.code === 'KeyT') { this.autoMove = !this.autoMove; this.onStatusChange({ autoMove: this.autoMove }) }
    if (e.code === 'KeyQ') { this.spectating = !this.spectating; this.onStatusChange({ spectating: this.spectating }) }
    if (e.code === 'Digit1') this._spectateChange(-1)
    if (e.code === 'Digit2') this._spectateChange(1)
    if (e.code === 'KeyF') { this._activateSpeed(); soundSystem.skill(); if (this._useSocket) socketClient.sendSkill('speed') }
    if (e.code === 'KeyG') { this._activateSlow(); soundSystem.skill(); if (this._useSocket) socketClient.sendSkill('slow') }
    if (e.code === 'KeyH') { this._activateShield(); soundSystem.skill(); if (this._useSocket) socketClient.sendSkill('shield') }
    if (e.code === 'KeyJ') this._activateFoodTrap()
    if (e.code === 'KeyN') { soundSystem._enabled = !soundSystem._enabled; this._showFloat(soundSystem._enabled ? '🔊 Ses Açık' : '🔇 Ses Kapalı', '#6366f1') }
  }

  _onClick(e) {
    if (this.skills.slow.cooldown <= 0 || this.skills.slow.active) {
      const rect = this.canvas.getBoundingClientRect()
      const wx = (e.clientX - rect.left - this.canvas.width/2) / this.camera.zoom + this.camera.x
      const wy = (e.clientY - rect.top - this.canvas.height/2) / this.camera.zoom + this.camera.y
      this.clickTarget = { x: wx, y: wy }
    }
  }

  _onKeyUp(e) { this.keys[e.code] = false }

  _onWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.88 : 1.14
    this._zoomFactor = clamp(this._zoomFactor * delta, 0.04, 3.5)
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left - this.canvas.width/2) / this.camera.zoom + this.camera.x
    const py = (e.clientY - rect.top - this.canvas.height/2) / this.camera.zoom + this.camera.y
    const dx = px - this._lastMoveX, dy = py - this._lastMoveY
    this._isMoving = (dx*dx + dy*dy) > 1
    this._lastMoveX = px; this._lastMoveY = py
    this.mouse = { x: px, y: py }
  }

  _onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  _split() {
    if (this.cells.length >= MAX_CELLS) return
    const newCells = []
    for (const cell of [...this.cells]) {
      if (cell.mass < MIN_MASS_SPLIT) continue
      if (this.cells.length + newCells.length >= MAX_CELLS) break
      const dx = this.mouse.x - cell.x
      const dy = this.mouse.y - cell.y
      const len = Math.sqrt(dx*dx + dy*dy) || 1
      const half = cell.mass / 2
      cell.mass = half
      const nc = new Cell(cell.x, cell.y, half, cell.color)
      nc.vx = (dx/len) * SPLIT_SPEED
      nc.vy = (dy/len) * SPLIT_SPEED
      nc.mergeTimer = Date.now() + MERGE_TIME
      cell.mergeTimer = Date.now() + MERGE_TIME
      newCells.push(nc)
    }
    this.cells.push(...newCells)
  }

  _macroDoubleSplit() {
    this._split()
    setTimeout(() => this._split(), 80)
  }

  _macroMaxSplit() {
    let attempts = 4
    const doSplit = () => {
      if (attempts-- <= 0 || this.cells.length >= MAX_CELLS) return
      this._split()
      setTimeout(doSplit, 80)
    }
    doSplit()
  }

  _eject(massAmount) {
    for (const cell of this.cells) {
      if (cell.mass < massAmount * 2) continue
      cell.mass -= massAmount + 2
      const dx = this.mouse.x - cell.x
      const dy = this.mouse.y - cell.y
      const len = Math.sqrt(dx*dx + dy*dy) || 1
      const em = new EjectedMass(
        cell.x + (dx/len) * (cell.radius + 6),
        cell.y + (dy/len) * (cell.radius + 6),
        (dx/len) * 20, (dy/len) * 20,
        cell.color, massAmount
      )
      this.ejected.push(em)
    }
  }

  _buyMass(size) {
    const cost = size === 'small' ? GOLD_BUY_A_COST_NEW : GOLD_BUY_S_COST_NEW
    const mass = size === 'small' ? GOLD_BUY_A_MASS_NEW : GOLD_BUY_S_MASS_NEW
    if (this.gold < cost) { this._showFloat('Yetersiz Gold! 💰', '#fbbf24'); return }
    this.gold -= cost
    for (const cell of this.cells) { cell.mass += mass / this.cells.length }
    this._showFloat(`+${mass} Kütle 💰`, '#4ade80')
    this.onGoldChange(this.gold)
    this._spawnExplosion(this.cells[0]?.x||0, this.cells[0]?.y||0, '#fbbf24')
  }

  _spectateChange(dir) {
    const targets = Object.keys(this.otherPlayers)
    if (targets.length === 0) return
    this.spectateIndex = ((this.spectateIndex + dir) + targets.length) % targets.length
    const target = this.otherPlayers[targets[this.spectateIndex]]
    if (target) { this.camera.x = target.x; this.camera.y = target.y }
  }

  _showFloat(text, color) {
    const cx = this.cells.reduce((s,c) => s+c.x, 0) / (this.cells.length||1)
    const cy = this.cells.reduce((s,c) => s+c.y, 0) / (this.cells.length||1)
    this.floatingTexts.push({ text, color, x: cx, y: cy - 50, life: 1.5, vy: -1 })
  }

  _loop(ts) {
    if (!this.running) return
    this.frameId = requestAnimationFrame(this._loop.bind(this))
    try {
      const dt = Math.min((ts - this.lastTime) / 1000, 0.05)
      this.lastTime = ts
      this._update(dt)
      this._render()
    } catch (e) {
      console.error('Game error:', e)
    }
  }

  _update(dt) {
    this.bgTime += dt
    const now = Date.now()

    if (this.keys['KeyE'] && now - this.lastEjectTime > 30) {
      this._eject(EJECT_MASS_MD)
      this.lastEjectTime = now
      if (this._useSocket) socketClient.sendEject()
    }

    this._rebuildGrids()
    this._foodQueueTimer -= dt
    if (this._foodQueueTimer <= 0) { this._processFoodQueue(); this._foodQueueTimer = 0.5 }

    this._updateFPS(dt)

    this._splitResetTimer -= dt
    if (this._splitResetTimer <= 0) { this._splitCount = 0; this._splitResetTimer = 1 }

    if (this.dead) return
    if (this.autoMove) this._doAutoMove()
    this._moveCells(dt)
    this._updateEjected(dt)
    this._updateParticles(dt)
    this._updateFloatingTexts(dt)
    this._updatePremiumEffects(dt)
    this._updateAbsorbParticles(dt)
    this._checkFoodCollisions()
    this._checkVirusCollisions()
    this._updateViruses(dt)
    this._virusAutoEat(dt)
    this._checkEjectedFoodConversion()
    this._checkSelfEatEjected()
    this._checkSelfMerge()
    this._updateCellEffects(dt)
    this._updateCamera(dt)
    this._massDecay(dt)
    this._updateBots(dt)
    this._updateGameTimer(dt)
    this._updateGold(dt)
    this._updateSkills(dt)
    this._updateGameMode(dt)
    this._adaptiveVirusSpawn(dt)
    this.screenFlash = Math.max(0, this.screenFlash - dt * 3)
    if (this.foodTrapCooldown > 0) this.foodTrapCooldown = Math.max(0, this.foodTrapCooldown - dt)
    this._frameCount++
    for (const cell of this.cells) {
      if (cell.eatPulse > 0) cell.eatPulse = Math.max(0, cell.eatPulse - dt * 5)
    }
    if (this.modeMessageTimer > 0) this.modeMessageTimer -= dt

    const totalMass = this.cells.reduce((s,c) => s+c.mass, 0)
    let scoreMultiplier = 1
    if (totalMass >= 2000) scoreMultiplier = 3
    else if (totalMass >= 500) scoreMultiplier = 2
    else if (totalMass >= 100) scoreMultiplier = 1.5
    const computedScore = totalMass * scoreMultiplier
    if (Math.floor(computedScore) !== Math.floor(this.score)) {
      this.score = computedScore
      if (computedScore > this._bestScore) this._bestScore = computedScore
      this.onScoreChange(Math.floor(computedScore))
      if (totalMass > this._lastValidMass * 6 && this._lastValidMass > 100) {
        this._handleSuspiciousActivity(totalMass)
      } else {
        this._lastValidMass = totalMass
      }
    }

    for (const op of Object.values(this.otherPlayers)) {
      op.x = lerp(op.x, op.targetX, 0.15)
      op.y = lerp(op.y, op.targetY, 0.15)
    }
  }

  _updateFPS(dt) {
    const now = performance.now()
    if (dt > 0) {
      const fps = 1 / dt
      this._fpsHistory.push(fps)
      if (this._fpsHistory.length > 30) this._fpsHistory.shift()
      const avgFps = this._fpsHistory.reduce((a,b)=>a+b,0) / this._fpsHistory.length
      if (avgFps < 25) this.qualityLevel = 'low'
      else if (avgFps < 40) this.qualityLevel = 'medium'
      else this.qualityLevel = 'high'
    }
  }

  _handleSuspiciousActivity(mass) {
    this.cells.forEach(c => { c.mass = Math.min(c.mass, this._lastValidMass * 2) })
    this._showFloat('⚠️ Hile Tespit Edildi!', '#ef4444')
  }

  _updatePremiumEffects(dt) {
    for (const ef of this.premiumEffects) {
      ef.radius += dt * 200
      ef.life -= dt * 2.5
    }
    this.premiumEffects = this.premiumEffects.filter(e => e.life > 0)
  }

  _updateAbsorbParticles(dt) {
    for (const p of this.absorbParticles) {
      p.x = lerp(p.x, p.tx, dt * 4)
      p.y = lerp(p.y, p.ty, dt * 4)
      p.life -= dt * 2.5
      p.size *= 0.97
    }
    this.absorbParticles = this.absorbParticles.filter(p => p.life > 0)
  }

  _premiumEatEffect(x, y, color) {
    if (this.qualityLevel === 'low') return
    this.premiumEffects.push({ x, y, radius: 0, maxRadius: 130, life: 1, color })
    const count = this.qualityLevel === 'high' ? 18 : 10
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const speed = 4 + Math.random() * 5
      this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, color: '#fbbf24', life: 1.2, size: 4+Math.random()*5 })
    }
  }

  _spawnAbsorb(fromX, fromY, toX, toY, color) {
    if (this.qualityLevel === 'low') return
    const count = this.qualityLevel === 'high' ? 12 : 6
    for (let i = 0; i < count; i++) {
      const spread = 20
      this.absorbParticles.push({
        x: fromX + (Math.random()-0.5)*spread,
        y: fromY + (Math.random()-0.5)*spread,
        tx: toX, ty: toY, color, life: 1,
        size: 4 + Math.random() * 6
      })
    }
  }

  _adaptiveVirusSpawn(dt) {
    this.virusSpawnTimer -= dt
    if (this.virusSpawnTimer > 0) return
    const playerMass = this.cells.reduce((s,c)=>s+c.mass,0)
    let interval = 8 + Math.random() * 7
    if (playerMass > 1000) interval *= 0.6
    if (playerMass > 5000) interval *= 0.4
    this.virusSpawnTimer = interval
    if (this.viruses.filter(v=>!v.dead).length >= 55) return
    const types = ['normal','normal','normal','normal','super','poison','freeze']
    const t = types[Math.floor(Math.random()*types.length)]
    let vx, vy
    if (Math.random() < 0.6 && this.cells.length > 0) {
      const cx = this.cells[0].x; const cy = this.cells[0].y
      const angle = Math.random() * Math.PI * 2
      const r = 800 + Math.random() * 700
      vx = clamp(cx + Math.cos(angle)*r, 150, WORLD_SIZE-150)
      vy = clamp(cy + Math.sin(angle)*r, 150, WORLD_SIZE-150)
    } else {
      vx = 300 + Math.random() * (WORLD_SIZE-600)
      vy = 300 + Math.random() * (WORLD_SIZE-600)
    }
    this.viruses.push(new Virus(vx, vy, t))
  }

  _rebuildGrids() {
    this._foodGrid.clear()
    for (const f of this.food) this._foodGrid.insert(f)
    this._virusGrid.clear()
    for (const v of this.viruses) { if (!v.dead) this._virusGrid.insert(v) }
  }

  _processFoodQueue() {
    if (!this._foodQueue.remove.length && !this._foodQueue.add.length) return
    const toRemove = this._foodQueue.remove.splice(0)
    const toAdd = this._foodQueue.add.splice(0)
    if (!this.offline) {
      const updates = {}
      for (const id of toRemove) updates[`rooms/${this.roomId}/food/${id}`] = null
      const colors = this.theme.foodColors
      for (const _ of toAdd) {
        const id = Math.random().toString(36).slice(2, 10)
        const color = colors[(Math.random() * colors.length) | 0]
        updates[`rooms/${this.roomId}/food/${id}`] = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, color, value: 5 }
      }
      try { fbUpdate(ref(db), updates) } catch(_) {}
    }
  }

  _updateGold(dt) {
    if (this.score > GOLD_EARN_THRESHOLD) {
      this.goldTimer += dt
      if (this.goldTimer >= 5) {
        this.goldTimer = 0
        this.gold += 1
        this.onGoldChange(this.gold)
      }
    }
  }

  _updateGameTimer(dt) {
    if (this.gameTime <= 0) return
    this.gameTime = Math.max(0, this.gameTime - dt)
    this.onTimerChange(Math.ceil(this.gameTime))
  }

  _doAutoMove() {
    if (!this.food.length) return
    const cell = this.cells[0]
    if (!cell) return
    let nearest = null, nearDist = Infinity
    for (const f of this.food) {
      const d = dist(cell, f)
      if (d < nearDist) { nearDist = d; nearest = f }
    }
    if (nearest) this.mouse = { x: nearest.x, y: nearest.y }
  }

  _moveCells(dt) {
    for (const cell of this.cells) {
      const frozen = cell.frozen > 0
      const speedBoost = this.skills.speed.active ? 2.2 : 1
      const speedMult = frozen ? 0.3 : speedBoost
      const dx = this.mouse.x - cell.x
      const dy = this.mouse.y - cell.y
      const d = Math.sqrt(dx*dx + dy*dy)
      const speed = (6 / Math.pow(Math.max(cell.mass, 1), 0.4)) * 90 * speedMult

      if (d > cell.radius / 3) {
        const s = Math.min(speed * dt, d)
        cell.x += (dx/d) * s
        cell.y += (dy/d) * s
      }

      if (Math.abs(cell.vx) > 0.01 || Math.abs(cell.vy) > 0.01) {
        cell.x += cell.vx * dt * 60
        cell.y += cell.vy * dt * 60
        cell.vx *= 0.87
        cell.vy *= 0.87
        if (Math.abs(cell.vx) < 0.01) cell.vx = 0
        if (Math.abs(cell.vy) < 0.01) cell.vy = 0
      }

      cell.x = clamp(cell.x, cell.radius, WORLD_SIZE - cell.radius)
      cell.y = clamp(cell.y, cell.radius, WORLD_SIZE - cell.radius)
    }
    this._separateCells()
  }

  _separateCells() {
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = i+1; j < this.cells.length; j++) {
        const a = this.cells[i]; const b = this.cells[j]
        if (a.mergeTimer < Date.now() && b.mergeTimer < Date.now()) continue
        const d = dist(a, b)
        const minD = a.radius + b.radius
        if (d < minD && d > 0) {
          const dx = (b.x-a.x)/d; const dy = (b.y-a.y)/d
          const ov = (minD-d)/2
          a.x -= dx*ov*0.5; a.y -= dy*ov*0.5
          b.x += dx*ov*0.5; b.y += dy*ov*0.5
        }
      }
    }
  }

  _checkSelfMerge() {
    if (this.cells.length <= 1) return
    const now = Date.now()
    const merged = new Set()
    const result = []
    for (let i = 0; i < this.cells.length; i++) {
      if (merged.has(i)) continue
      let cur = this.cells[i]
      for (let j = i+1; j < this.cells.length; j++) {
        if (merged.has(j)) continue
        const b = this.cells[j]
        if (cur.mergeTimer > now || b.mergeTimer > now) continue
        if (dist(cur, b) < Math.max(cur.radius, b.radius)) {
          cur = new Cell(
            (cur.x*cur.mass + b.x*b.mass)/(cur.mass+b.mass),
            (cur.y*cur.mass + b.y*b.mass)/(cur.mass+b.mass),
            cur.mass+b.mass, cur.color
          )
          merged.add(j)
        }
      }
      result.push(cur)
    }
    this.cells = result
  }

  _checkFoodCollisions() {
    const eaten = []
    const eatenSet = new Set()
    for (const cell of this.cells) {
      const nearby = this._foodGrid.query(cell.x, cell.y, cell.radius + 20)
      for (const food of nearby) {
        if (eatenSet.has(food.id)) continue
        if (dist(cell, food) < cell.radius) {
          if (food.poison) {
            cell.mass = Math.max(20, cell.mass * 0.7)
            this._spawnParticle(food.x, food.y, '#ef4444', 5)
            this._showFloat('☠️ Zehirli!', '#ef4444')
          } else {
            cell.mass += food.value
          }
          eaten.push(food.id)
          eatenSet.add(food.id)
          cell.eatPulse = 1
          this.lastEatTime = Date.now()
          if (this.qualityLevel !== 'low') this._spawnParticle(food.x, food.y, food.color, 2)
          soundSystem.eatFood()
          if (this.options.isPremium && Math.random() < 0.08) {
            this._premiumEatEffect(cell.x, cell.y, cell.color)
          }
        }
      }
    }
    if (eaten.length > 0) {
      const eatenFull = new Set(eaten)
      this.food = this.food.filter(f => !eatenFull.has(f.id))
      if (this.offline) {
        const colors = this.theme.foodColors
        for (let i = 0; i < eaten.length; i++) {
          this.food.push(new Food(
            Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE,
            colors[(Math.random()*colors.length)|0], 5
          ))
        }
      } else if (this._useSocket) {
        socketClient.eatFood(eaten)
      } else {
        for (const id of eaten) {
          this._foodQueue.remove.push(id)
          this._foodQueue.add.push(1)
        }
      }
    }
  }

  _fbRespawnFood() {
    const colors = this.theme.foodColors
    const id = uuidv4().slice(0, 8)
    const f = { x: Math.random()*WORLD_SIZE, y: Math.random()*WORLD_SIZE, color: colors[Math.floor(Math.random()*colors.length)], value: 5 }
    try { set(ref(db, `rooms/${this.roomId}/food/${id}`), f) } catch(_) {}
  }

  _checkVirusCollisions() {
    for (const virus of this.viruses) {
      if (virus.dead) continue
      for (const cell of this.cells) {
        if (dist(cell, virus) >= cell.radius * 0.85) continue
        if (cell.mass <= virus.mass) continue
        const vInfo = VIRUS_TYPES[virus.type]

        if (this.skills.shield.active) {
          this._showFloat('🛡️ Korundu!', '#06b6d4')
          this._spawnExplosion(virus.x, virus.y, '#06b6d4')
          cell.mass += 300
          cell.eatPulse = 1
          virus.dead = true
          this.score += 300
          this.onScoreChange(Math.floor(this.score))
          soundSystem.virusEat()
          this._showFloat('+300 🛡️', '#06b6d4')
          break
        }

        cell.eatPulse = 1.2
        this.lastEatTime = Date.now()
        soundSystem.virusEat()

        if (!this._virusFirstHit) {
          this._virusFirstHit = true
          const splitCount = Math.max(4, Math.min(16, Math.floor(cell.mass / 12)))
          this._explodeCell(cell, splitCount)
          this._showFloat('💥 İLK DİKEN! DAĞILDIN!', '#ef4444')
          this._spawnExplosion(virus.x, virus.y, vInfo.color)
          virus.dead = true
          break
        }

        if (cell.mass > 100) {
          const splitCount = Math.min(16, Math.floor(cell.mass / 16))
          this._explodeCell(cell, splitCount)
          this._showFloat('💥 PATLAMA! +300', '#fbbf24')
        } else {
          this._showFloat('+300 🌿', '#4ade80')
        }

        cell.mass += 300
        this.score += 300
        this.onScoreChange(Math.floor(this.score))
        this.onXPGain(15)

        if (virus.type === 'poison') { cell.poisoned = 5; this._showFloat('☠️ Zehirlendi!', '#a855f7') }
        else if (virus.type === 'freeze') { cell.frozen = 4; this._showFloat('❄️ Donduruldu!', '#38bdf8') }

        this._spawnExplosion(virus.x, virus.y, vInfo.color)
        virus.dead = true
        break
      }
    }
    this.viruses = this.viruses.filter(v => !v.dead)
  }

  _explodeCell(cell, maxSplits) {
    const splits = Math.min(maxSplits - this.cells.length + 1, Math.min(maxSplits, 8))
    if (splits <= 0) return
    const mass = cell.mass / (splits + 1)
    cell.mass = mass
    for (let i = 0; i < splits; i++) {
      const angle = (i / splits) * Math.PI * 2
      const nc = new Cell(cell.x, cell.y, mass, cell.color)
      nc.vx = Math.cos(angle) * SPLIT_SPEED * 0.8
      nc.vy = Math.sin(angle) * SPLIT_SPEED * 0.8
      nc.mergeTimer = Date.now() + MERGE_TIME
      this.cells.push(nc)
    }
    cell.mergeTimer = Date.now() + MERGE_TIME
    this._spawnExplosion(cell.x, cell.y, cell.color)
  }

  _updateViruses(dt) {
    for (const virus of this.viruses) {
      if (virus.dead) continue
      virus.age = (virus.age || 0) + dt
      virus.rotAngle = (virus.rotAngle || 0) + dt * 0.4
      virus.wiggleT = (virus.wiggleT || 0) + dt * 2.1
      virus.x = virus.spawnX + Math.sin(virus.wiggleT * 1.1) * 3
      virus.y = virus.spawnY + Math.cos(virus.wiggleT * 0.9) * 3
      if ((virus.hitCooldown || 0) > 0) {
        virus.hitCooldown -= dt
        if (virus.hitCooldown <= 0) {
          virus.hitCooldown = 0
          virus.hitReady = true
        }
      }
    }
    this.viruses = this.viruses.filter(v => !v.dead)
  }

  _virusAutoEat(dt) {
    if (!this.cells.length) return
    this._virusAutoTimer -= dt
    if (this._virusAutoTimer > 0) return
    this._virusAutoTimer = 7

    const cx = this.cells.reduce((s,c) => s+c.x, 0) / this.cells.length
    const cy = this.cells.reduce((s,c) => s+c.y, 0) / this.cells.length
    const playerRadius = Math.max(...this.cells.map(c => c.radius))
    const eatRange = playerRadius * 3.5

    let eaten = 0
    for (const virus of this.viruses) {
      if (virus.dead) continue
      const d = Math.sqrt((virus.x - cx)**2 + (virus.y - cy)**2)
      if (d < eatRange) {
        virus.dead = true
        eaten++
      }
    }
    this.viruses = this.viruses.filter(v => !v.dead)

    if (eaten > 0) {
      const massGain = eaten * 300
      const scoreGain = eaten * 300
      const targetCell = this.cells[0]
      if (targetCell) {
        targetCell.mass += massGain
        targetCell.eatPulse = 1.3
      }
      this.score += scoreGain
      this.onScoreChange(Math.floor(this.score))
      this.onXPGain(eaten * 15)
      this._showFloat(`🌿 +${massGain} (${eaten} diken!)`, '#22c55e')
      this._spawnExplosion(cx, cy, '#22c55e')
      soundSystem.virusEat && soundSystem.virusEat()
    }
  }

  _checkEjectedFoodConversion() {
    for (const em of this.ejected) {
      const spd = Math.sqrt(em.vx * em.vx + em.vy * em.vy)
      if (spd < 0.8) em.settled = true
    }
    const ejectedToRemove = new Set()
    for (const virus of this.viruses) {
      if (virus.dead) continue
      for (const em of this.ejected) {
        if (ejectedToRemove.has(em.id)) continue
        if (dist(virus, em) < virus.radius + em.radius + 4) {
          ejectedToRemove.add(em.id)
          this._spawnParticle(em.x, em.y, em.color, 4)
          virus.feedCount = (virus.feedCount || 0) + 1
          virus.mass = Math.min(220, 100 + (virus.feedCount % 5) * 20)
          if (typeof em.dirAngle === 'number') virus._lastFeedAngle = em.dirAngle
          if (virus.feedCount % 5 === 0) {
            const angle = virus._lastFeedAngle ?? (Math.random() * Math.PI * 2)
            const newV = new Virus(
              clamp(virus.x + Math.cos(angle) * virus.radius * 3.2, 150, WORLD_SIZE - 150),
              clamp(virus.y + Math.sin(angle) * virus.radius * 3.2, 150, WORLD_SIZE - 150),
              virus.type
            )
            newV.vx = Math.cos(angle) * 3
            newV.vy = Math.sin(angle) * 3
            this.viruses.push(newV)
            const splitBonus = 200 * (virus.feedCount / 5)
            this.score += splitBonus
            this.onScoreChange(Math.floor(this.score))
            this._showFloat(`🌿 DİKEN AYRILDI! +${Math.floor(splitBonus)} 2X`, '#4ade80')
            this._spawnExplosion(virus.x, virus.y, '#22c55e')
          }
        }
      }
    }
    if (ejectedToRemove.size > 0) {
      this.ejected = this.ejected.filter(e => !ejectedToRemove.has(e.id))
    }
    if (this.ejected.length > 200) {
      this.ejected = this.ejected.slice(-200)
    }
  }

  _checkSelfEatEjected() {
    if (!this.ejected.length || !this.cells.length) return
    const toRemove = new Set()
    for (const cell of this.cells) {
      for (const em of this.ejected) {
        if (toRemove.has(em.id)) continue
        if (!em.settled || em.settledTimer < 0.6) continue
        if (dist(cell, em) < cell.radius - 4) {
          toRemove.add(em.id)
          cell.mass += em.mass
          if (this.qualityLevel !== 'low') this._spawnParticle(em.x, em.y, em.color, 2)
        }
      }
    }
    if (toRemove.size > 0) {
      this.ejected = this.ejected.filter(e => !toRemove.has(e.id))
    }
  }

  _updateCellEffects(dt) {
    for (const cell of this.cells) {
      if (cell.poisoned > 0) {
        cell.poisoned -= dt
        cell.mass = Math.max(20, cell.mass - cell.mass * 0.04 * dt)
        this._spawnParticle(cell.x + (Math.random()-0.5)*cell.radius, cell.y + (Math.random()-0.5)*cell.radius, '#a855f7', 1)
      }
      if (cell.frozen > 0) {
        cell.frozen -= dt
        if (Math.random() < 0.3) this._spawnParticle(cell.x + (Math.random()-0.5)*cell.radius, cell.y + (Math.random()-0.5)*cell.radius, '#bae6fd', 1)
      }
    }
  }

  _updateEjected(dt) {
    for (const em of this.ejected) {
      em.x += em.vx * dt * 60; em.y += em.vy * dt * 60
      em.vx *= 0.91; em.vy *= 0.91
      em.x = clamp(em.x, 0, WORLD_SIZE); em.y = clamp(em.y, 0, WORLD_SIZE)
      const spd = Math.sqrt(em.vx * em.vx + em.vy * em.vy)
      if (spd < 0.8) { em.settled = true; em.settledTimer = (em.settledTimer || 0) + dt }
    }
  }

  _massDecay(dt) {
    for (const cell of this.cells) {
      if (cell.mass <= 20) continue
      let rate
      if (cell.mass < 100) rate = 0.15
      else if (cell.mass < 500) rate = 0.3
      else if (cell.mass < 2000) rate = cell.mass * 0.0004
      else rate = cell.mass * 0.0007
      cell.mass = Math.max(20, cell.mass - rate * dt)
    }
  }

  _updateCamera(dt) {
    if (this.spectating || (this.dead && !this.cells.length)) {
      const allTargets = [
        ...Object.values(this.otherPlayers),
        ...this.bots.filter(b => !b.dead)
      ]
      if (allTargets.length > 0) {
        const idx = this.spectateIndex % allTargets.length
        const t = allTargets[idx]
        if (t) {
          this.camera.x = lerp(this.camera.x, t.x, 0.08)
          this.camera.y = lerp(this.camera.y, t.y, 0.08)
          const mass = t.mass || 20
          const r = Math.sqrt(mass) * 4.5
          const autoZoom = clamp(Math.min(this.canvas.width/(r*6), this.canvas.height/(r*6), 1.2), 0.08, 1.2)
          this.camera.zoom = lerp(this.camera.zoom, autoZoom * this._zoomFactor, 0.05)
        }
      }
      return
    }
    if (!this.cells.length) return
    const cx = this.cells.reduce((s,c) => s+c.x, 0) / this.cells.length
    const cy = this.cells.reduce((s,c) => s+c.y, 0) / this.cells.length
    this.camera.x = lerp(this.camera.x, cx, 0.1)
    this.camera.y = lerp(this.camera.y, cy, 0.1)
    const maxR = Math.max(...this.cells.map(c => c.radius), 20)
    const autoZoom = clamp(Math.min(this.canvas.width/(maxR*5), this.canvas.height/(maxR*5), 1.6), 0.08, 1.6)
    const targetZoom = autoZoom * this._zoomFactor
    this.camera.zoom = lerp(this.camera.zoom, targetZoom, 0.05)
  }

  _spawnParticle(x, y, color, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, color, life: 1, size: 2+Math.random()*3 })
    }
  }

  _spawnExplosion(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random()*Math.PI*2, speed = 2+Math.random()*6
      this.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, color, life: 1, size: 3+Math.random()*6 })
    }
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx*dt*60; p.y += p.vy*dt*60
      p.vx *= 0.94; p.vy *= 0.94; p.life -= dt*1.8
    }
    this.particles = this.particles.filter(p => p.life > 0)
    const maxP = this.qualityLevel === 'high' ? 200 : this.qualityLevel === 'medium' ? 100 : 40
    if (this.particles.length > maxP) this.particles.splice(0, this.particles.length - maxP)
  }

  _updateFloatingTexts(dt) {
    for (const t of this.floatingTexts) { t.y += t.vy * dt * 60; t.life -= dt * 0.8 }
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0)
  }

  _render() {
    const { ctx, canvas, camera, theme } = this
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, W, H)

    this._drawBgEffect(W, H)

    ctx.save()
    ctx.translate(W/2, H/2)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-camera.x, -camera.y)

    this._drawGrid()
    this._drawBorder()
    this._drawBattleRoyaleZone()
    this._drawFood()
    this._drawViruses()
    this._drawEjected()
    this._drawAbsorbParticles()
    this._drawParticles()
    this._drawOtherPlayers()
    this._drawMyPlayer()
    this._drawPremiumEffects()
    this._drawFloatingTexts()
    this._drawSlowTargetIndicator()

    ctx.restore()

    if (this.screenFlash > 0) {
      ctx.fillStyle = `rgba(255,50,50,${this.screenFlash * 0.45})`
      ctx.fillRect(0, 0, W, H)
    }
    if (this.skills.speed.active) {
      const t = Date.now() / 300
      ctx.strokeStyle = `rgba(251,191,36,${0.3 + 0.2*Math.sin(t)})`
      ctx.lineWidth = 6
      ctx.strokeRect(3, 3, W-6, H-6)
    }
    if (this.skills.shield.active) {
      const t = Date.now() / 400
      ctx.strokeStyle = `rgba(6,182,212,${0.3 + 0.2*Math.sin(t)})`
      ctx.lineWidth = 6
      ctx.strokeRect(3, 3, W-6, H-6)
    }

    this._drawMinimap()
  }

  _drawMinimap() {
    const { ctx, canvas, camera, theme } = this
    const mapSize = 152
    const pad = 5
    const mapX = canvas.width - mapSize - 14
    const mapY = 14
    const scale = mapSize / WORLD_SIZE
    const bx = mapX - pad, by = mapY - pad, bw = mapSize + pad * 2, bh = mapSize + pad * 2

    ctx.save()

    ctx.fillStyle = 'rgba(8,8,18,0.82)'
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill()
    } else {
      ctx.fillRect(bx, by, bw, bh)
    }
    ctx.strokeStyle = `rgba(${theme.glowColor || '139,92,246'},0.55)`
    ctx.lineWidth = 1.5
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.stroke()
    } else {
      ctx.strokeRect(bx, by, bw, bh)
    }

    ctx.beginPath(); ctx.rect(mapX, mapY, mapSize, mapSize); ctx.clip()

    ctx.strokeStyle = 'rgba(255,255,255,0.035)'
    ctx.lineWidth = 0.5
    const gStep = mapSize / 6
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(mapX + i * gStep, mapY); ctx.lineTo(mapX + i * gStep, mapY + mapSize); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(mapX, mapY + i * gStep); ctx.lineTo(mapX + mapSize, mapY + i * gStep); ctx.stroke()
    }

    ctx.strokeStyle = `rgba(${theme.glowColor || '139,92,246'},0.7)`
    ctx.lineWidth = 1
    ctx.strokeRect(mapX, mapY, mapSize, mapSize)

    const sample = this.food.length > 300 ? this.food.filter((_, i) => i % 4 === 0) : this.food
    for (const f of sample) {
      ctx.beginPath(); ctx.arc(mapX + f.x * scale, mapY + f.y * scale, 1, 0, Math.PI * 2)
      ctx.fillStyle = f.color; ctx.fill()
    }

    for (const v of this.viruses) {
      if (v.dead) continue
      ctx.beginPath(); ctx.arc(mapX + v.x * scale, mapY + v.y * scale, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'; ctx.fill()
    }

    for (const p of Object.values(this.otherPlayers)) {
      const px = mapX + (p.x || 0) * scale
      const py = mapY + (p.y || 0) * scale
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fillStyle = p.color || '#94a3b8'; ctx.fill()
    }

    const zoom = camera.zoom
    const vpW = (canvas.width / zoom) * scale
    const vpH = (canvas.height / zoom) * scale
    const vpX = mapX + (camera.x - canvas.width / (2 * zoom)) * scale
    const vpY = mapY + (camera.y - canvas.height / (2 * zoom)) * scale
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 0.8
    ctx.strokeRect(vpX, vpY, vpW, vpH)

    for (const cell of this.cells) {
      const cx = mapX + cell.x * scale
      const cy = mapY + cell.y * scale
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = this.playerColor || '#ffffff'
      ctx.shadowBlur = 8; ctx.shadowColor = this.playerColor || '#ffffff'
      ctx.fill(); ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2; ctx.stroke()
    }

    ctx.restore()

    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.font = 'bold 8px "Exo 2", sans-serif'
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'
    ctx.fillText('HARİTA', mapX + mapSize, mapY + mapSize + 4)
  }

  _drawBgEffect(W, H) {
    if (this.qualityLevel === 'low') return
    const { ctx, theme } = this
    const t = this.bgTime
    const id = theme.id || 'cyberpunk'

    if (id === 'matrix' || id === 'retro') {
      if (!this._matrixDrops) {
        this._matrixDrops = Array.from({ length: Math.floor(W/18) }, () => ({ x: Math.random()*W, y: Math.random()*H, speed: 40+Math.random()*80, char: Math.floor(Math.random()*9) }))
      }
      ctx.font = '14px monospace'
      ctx.fillStyle = id === 'matrix' ? 'rgba(0,200,0,0.18)' : 'rgba(0,255,0,0.12)'
      for (const d of this._matrixDrops) {
        ctx.fillText(String(d.char), d.x, d.y)
        d.y += d.speed * 0.016
        if (d.y > H) { d.y = -20; d.char = Math.floor(Math.random()*9) }
      }
    } else if (id === 'galaxy') {
      if (!this._stars) this._stars = Array.from({ length: 120 }, () => ({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.8, p: Math.random()*Math.PI*2 }))
      for (const s of this._stars) {
        s.p += 0.02
        const alpha = 0.3 + 0.2 * Math.sin(s.p)
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(200,180,255,${alpha})`; ctx.fill()
      }
    } else if (id === 'lava') {
      for (let i = 0; i < 4; i++) {
        const grd = ctx.createRadialGradient(W*(0.2+i*0.2)+Math.sin(t*0.4+i)*60, H*0.8+Math.cos(t*0.3+i)*40, 0, W*(0.2+i*0.2), H*0.8, 200)
        grd.addColorStop(0, 'rgba(239,68,68,0.12)')
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
      }
    } else if (id === 'arctic') {
      for (let i = 0; i < 3; i++) {
        const grd = ctx.createRadialGradient(W*(0.3+i*0.2)+Math.sin(t*0.2+i)*80, H*0.2, 0, W*(0.3+i*0.2), H*0.2, 300)
        grd.addColorStop(0, 'rgba(186,230,253,0.08)')
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
      }
    } else if (id === 'bloodmoon') {
      const grd = ctx.createRadialGradient(W*0.5, H*0.1, 0, W*0.5, H*0.1, 500)
      grd.addColorStop(0, `rgba(185,28,28,${0.08+0.03*Math.sin(t*0.5)})`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
    } else {
      const grd = ctx.createRadialGradient(W*0.3+Math.sin(t*0.5)*W*0.2, H*0.3+Math.cos(t*0.4)*H*0.2, 0, W/2, H/2, Math.max(W,H)*0.8)
      grd.addColorStop(0, `rgba(${theme.glowColor},0.07)`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
    }
  }

  _drawGrid() {
    const { ctx, theme, camera, canvas } = this
    const gs = 50, z = camera.zoom
    const sx = Math.floor((camera.x - canvas.width/(2*z))/gs)*gs
    const sy = Math.floor((camera.y - canvas.height/(2*z))/gs)*gs
    const ex = sx + canvas.width/z + gs*2
    const ey = sy + canvas.height/z + gs*2
    ctx.strokeStyle = theme.gridLineColor
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = sx; x <= ex; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, ey) }
    for (let y = sy; y <= ey; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(ex, y) }
    ctx.stroke()
  }

  _drawBorder() {
    const { ctx, theme } = this
    ctx.shadowBlur = 30; ctx.shadowColor = theme.uiAccent
    ctx.strokeStyle = theme.uiAccent; ctx.lineWidth = 10
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE)
    ctx.shadowBlur = 0
  }

  _drawFood() {
    const { ctx, camera, canvas } = this
    const zoom = camera.zoom
    const margin = 50
    const vl = camera.x - canvas.width / (2 * zoom) - margin
    const vr = camera.x + canvas.width / (2 * zoom) + margin
    const vt = camera.y - canvas.height / (2 * zoom) - margin
    const vb = camera.y + canvas.height / (2 * zoom) + margin
    for (const f of this.food) {
      if (f.x < vl || f.x > vr || f.y < vt || f.y > vb) continue
      f.pulse += 0.06
      const r = f.radius * (0.88 + 0.12 * Math.sin(f.pulse))
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2)
      ctx.fillStyle = f.poison ? '#ef4444' : f.color
      if (this.qualityLevel !== 'low') {
        ctx.shadowBlur = f.poison ? 14 : 8
        ctx.shadowColor = f.poison ? '#ef4444' : f.color
      }
      ctx.fill(); ctx.shadowBlur = 0
      if (f.poison) {
        ctx.fillStyle = 'white'
        ctx.font = `${r * 1.4}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('☠', f.x, f.y)
      }
    }
  }

  _drawSlowTargetIndicator() {
    const { ctx } = this
    if (this.clickTarget) {
      const t = Date.now() / 500
      ctx.beginPath(); ctx.arc(this.clickTarget.x, this.clickTarget.y, 20 + 5*Math.sin(t), 0, Math.PI*2)
      ctx.strokeStyle = 'rgba(139,92,246,0.8)'; ctx.lineWidth = 2.5; ctx.stroke()
      ctx.beginPath(); ctx.arc(this.clickTarget.x, this.clickTarget.y, 5, 0, Math.PI*2)
      ctx.fillStyle = '#8b5cf6'; ctx.fill()
    }
    for (const [id] of Object.entries(this.slowedEntities)) {
      const bot = this.bots.find(b => b.id === id)
      const player = bot || this.otherPlayers[id]
      if (!player) continue
      const t = Date.now() / 300
      ctx.beginPath(); ctx.arc(player.x, player.y, (bot ? massToRadius(bot.mass) : massToRadius(player.mass)) + 8 + 3*Math.sin(t), 0, Math.PI*2)
      ctx.strokeStyle = `rgba(139,92,246,0.6)`; ctx.lineWidth = 3; ctx.stroke()
      ctx.fillStyle = '#8b5cf6'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🌀', player.x, player.y - (bot ? massToRadius(bot.mass) : massToRadius(player.mass)) - 16)
    }
  }

  _drawViruses() {
    const { ctx, camera, canvas } = this
    const zoom = camera.zoom
    const margin = 80
    const vl = camera.x - canvas.width / (2 * zoom) - margin
    const vr = camera.x + canvas.width / (2 * zoom) + margin
    const vt = camera.y - canvas.height / (2 * zoom) - margin
    const vb = camera.y + canvas.height / (2 * zoom) + margin
    for (const v of this.viruses) {
      if (v.dead) continue
      if (v.x < vl || v.x > vr || v.y < vt || v.y > vb) continue
      v.pulse = (v.pulse || 0) + 0.035
      const vInfo = VIRUS_TYPES[v.type]
      const fc = v.feedCount || 0
      const feedPct = Math.min((fc % 5) / 5, 1)
      const pulseMod = 1 + 0.04 * Math.sin(v.pulse)
      const baseR = v.radius * (1 + feedPct * 0.35) * pulseMod * 1.35
      const glowSize = 14 + feedPct * 20

      ctx.save()

      ctx.shadowBlur = glowSize
      ctx.shadowColor = vInfo.color
      const grad = ctx.createRadialGradient(v.x - baseR * 0.3, v.y - baseR * 0.3, baseR * 0.05, v.x, v.y, baseR)
      grad.addColorStop(0, lighten(vInfo.color, 70, 0.95))
      grad.addColorStop(0.5, hexAlpha(vInfo.color, 0.82))
      grad.addColorStop(1, darken(vInfo.color, 40, 0.75))
      ctx.beginPath()
      ctx.arc(v.x, v.y, baseR, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.beginPath()
      ctx.arc(v.x, v.y, baseR, 0, Math.PI * 2)
      ctx.strokeStyle = hexAlpha(vInfo.border, 0.9)
      ctx.lineWidth = 2 + feedPct * 2
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(v.x - baseR * 0.28, v.y - baseR * 0.28, baseR * 0.28, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fill()

      if (fc > 0) {
        const rem = fc % 5
        const arcLen = (rem / 5) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(v.x, v.y, baseR + 5, -Math.PI / 2, -Math.PI / 2 + arcLen)
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 3
        ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24'
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#fbbf24'
        ctx.font = `bold ${Math.max(9, baseR * 0.38)}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(`${rem}/5`, v.x, v.y + baseR * 0.55)
      }

      if (v.type !== 'normal') {
        ctx.fillStyle = 'white'
        ctx.font = `bold ${Math.max(10, baseR * 0.5)}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(vInfo.label.split(' ')[0], v.x, v.y - baseR * 0.1)
      }

      ctx.restore()
    }
  }

  _drawEjected() {
    const { ctx } = this
    for (const em of this.ejected) {
      em._pulse = (em._pulse || Math.random() * Math.PI * 2) + 0.06
      const r = 5 + 0.8 * Math.sin(em._pulse)
      ctx.beginPath()
      ctx.arc(em.x, em.y, r, 0, Math.PI * 2)
      ctx.fillStyle = em.color
      if (this.qualityLevel !== 'low') {
        ctx.shadowBlur = 8
        ctx.shadowColor = em.color
      }
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  _drawParticles() {
    const { ctx } = this
    const maxParticles = this.qualityLevel === 'low' ? 60 : this.qualityLevel === 'medium' ? 120 : 300
    const toRender = this.particles.slice(0, maxParticles)
    for (const p of toRender) {
      ctx.globalAlpha = p.life * 0.85
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2)
      ctx.fillStyle = p.color; ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  _drawAbsorbParticles() {
    const { ctx } = this
    for (const p of this.absorbParticles) {
      ctx.globalAlpha = p.life * 0.8
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI*2)
      ctx.fillStyle = p.color; ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  _drawPremiumEffects() {
    const { ctx } = this
    for (const ef of this.premiumEffects) {
      const alpha = ef.life * 0.7
      ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI*2)
      ctx.strokeStyle = `rgba(251,191,36,${alpha})`
      ctx.lineWidth = 3 * ef.life
      ctx.shadowBlur = 20 * ef.life
      ctx.shadowColor = '#fbbf24'
      ctx.stroke()
      ctx.shadowBlur = 0

      if (ef.radius > 30 && ef.radius < ef.maxRadius * 0.8) {
        ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.radius * 0.6, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`
        ctx.lineWidth = 1.5 * ef.life
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }

  _drawFloatingTexts() {
    const { ctx } = this
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = Math.min(t.life, 1)
      ctx.font = 'bold 28px "Exo 2", sans-serif'
      ctx.fillStyle = t.color; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.strokeText(t.text, t.x, t.y); ctx.fillText(t.text, t.x, t.y)
    }
    ctx.globalAlpha = 1
  }

  _drawOtherPlayers() {
    const { camera, canvas } = this
    const zoom = camera.zoom
    const margin = 100
    const vl = camera.x - canvas.width / (2 * zoom) - margin
    const vr = camera.x + canvas.width / (2 * zoom) + margin
    const vt = camera.y - canvas.height / (2 * zoom) - margin
    const vb = camera.y + canvas.height / (2 * zoom) + margin
    for (const [id, p] of Object.entries(this.otherPlayers)) {
      if (p.x < vl || p.x > vr || p.y < vt || p.y > vb) continue
      const cells = p.cells?.length ? p.cells : [{ x: p.x, y: p.y, mass: p.mass || 20 }]
      for (const c of cells) {
        this._drawCell(c.x, c.y, massToRadius(c.mass), p.color, p.name, p.isGod, p.clan, false)
      }
    }
    for (const bot of this.bots) {
      if (bot.dead) continue
      if (bot.x < vl || bot.x > vr || bot.y < vt || bot.y > vb) continue
      this._drawCell(bot.x, bot.y, massToRadius(bot.mass), bot.color, bot.name, false, null, false)
    }
  }

  _drawMyPlayer() {
    for (const cell of this.cells) {
      this._drawCell(cell.x, cell.y, cell.radius, this.playerColor, this.playerName, this.isGod, this.options.clan, true, cell.poisoned > 0, cell.frozen > 0, this.options.avatar || 'gradient', cell.eatPulse || 0)
    }
  }

  _drawCell(x, y, radius, color, name, isGod, clan, isMe=false, poisoned=false, frozen=false, avatar='gradient', eatPulse=0) {
    const { ctx } = this
    if (radius < 0.5) return

    const pulseScale = 1 + eatPulse * 0.18
    const dr = radius * pulseScale

    ctx.save()
    ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI*2)
    ctx.clip()

    const sc = safeColor(color)
    const grad = ctx.createRadialGradient(x - dr*0.35, y - dr*0.35, dr*0.05, x, y, dr)
    grad.addColorStop(0, lighten(sc, 55))
    grad.addColorStop(0.6, hexAlpha(sc, 1))
    grad.addColorStop(1, darken(sc, 35))
    ctx.fillStyle = grad; ctx.fill()

    if (avatar === 'stripes' && dr > 10) {
      const stripeW = Math.max(4, dr * 0.18)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = stripeW
      for (let sx = x - dr*2; sx < x + dr*2; sx += stripeW*2.5) {
        ctx.beginPath(); ctx.moveTo(sx, y - dr); ctx.lineTo(sx + dr, y + dr); ctx.stroke()
      }
    } else if (avatar === 'dots' && dr > 12) {
      const dotR = Math.max(2, dr * 0.1)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        ctx.beginPath(); ctx.arc(x + Math.cos(angle)*dr*0.55, y + Math.sin(angle)*dr*0.55, dotR, 0, Math.PI*2); ctx.fill()
      }
    }

    ctx.restore()

    const speedActive = isMe && this.skills?.speed?.active
    const shieldActive = isMe && this.skills?.shield?.active

    ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI*2)
    ctx.shadowBlur = speedActive ? 40 : shieldActive ? 40 : isMe ? 25 : (isGod ? 35 : 12)
    ctx.shadowColor = shieldActive ? '#06b6d4' : speedActive ? '#fbbf24' : frozen ? '#38bdf8' : poisoned ? '#a855f7' : isGod ? '#fbbf24' : color

    if (eatPulse > 0.1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3 + eatPulse * 4
    } else if (speedActive) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4
    } else if (shieldActive) {
      ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4
    } else if (frozen) {
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3
    } else if (poisoned) {
      ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3
    } else if (isGod) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3.5
    } else if (isMe) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2.5
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2
    }
    ctx.stroke(); ctx.shadowBlur = 0

    if (frozen) {
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(56,189,248,0.15)'; ctx.fill()
    }
    if (poisoned) {
      ctx.beginPath(); ctx.arc(x, y, dr, 0, Math.PI*2)
      ctx.fillStyle = 'rgba(168,85,247,0.15)'; ctx.fill()
    }
    if (shieldActive) {
      const t = Date.now() / 600
      ctx.beginPath(); ctx.arc(x, y, dr + 5 + 3*Math.sin(t), 0, Math.PI*2)
      ctx.strokeStyle = `rgba(6,182,212,${0.5 + 0.3*Math.sin(t)})`; ctx.lineWidth = 3; ctx.stroke()
    }

    if (dr > 14) {
      const mass = Math.floor((radius / 4.5) ** 2)
      const hasClan = clan && dr > 22
      const hasMass = dr > 22
      const lineCount = 1 + (hasClan ? 1 : 0) + (hasMass ? 1 : 0)
      const fs = clamp(dr * 0.38, 9, 30)
      const lineH = fs * 0.9
      const totalH = lineCount * lineH
      const startY = y - totalH / 2 + lineH / 2
      let lineIdx = 0

      ctx.font = `bold ${fs}px "Exo 2", sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3
      const nameY = startY + lineIdx * lineH
      ctx.strokeText(isGod ? '👑 '+name : name, x+1, nameY+1)
      ctx.fillStyle = 'white'
      ctx.fillText(isGod ? '👑 '+name : name, x, nameY)
      lineIdx++

      if (hasClan) {
        const cs = clamp(dr*0.22, 7, 16)
        ctx.font = `bold ${cs}px "Exo 2", sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText(`[${clan}]`, x, startY + lineIdx * lineH)
        lineIdx++
      }
      if (hasMass) {
        const ms = clamp(dr * 0.22, 7, 14)
        ctx.font = `bold ${ms}px "Exo 2", sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillText(`${mass}`, x, startY + lineIdx * lineH)
      }
      ctx.shadowBlur = 0
    }
  }

  _activateSpeed() {
    const sk = this.skills.speed
    if (sk.cooldown > 0) { this._showFloat(`⚡ Bekleme: ${Math.ceil(sk.cooldown)}s`, '#fbbf24'); return }
    if (!this.options.isPremium && !(this.options.ownedPackage && this.options.ownedPackage !== 'free')) {
      this._showFloat('⚡ Premium Gerekli! 💎', '#fbbf24'); return
    }
    sk.active = true; sk.timer = SKILL_SPEED_DURATION; sk.cooldown = SKILL_SPEED_COOLDOWN
    this._showFloat('⚡ HIZLANMA AKTİF!', '#fbbf24')
    this._spawnExplosion(this.cells[0]?.x||0, this.cells[0]?.y||0, '#fbbf24')
    this.onSkillChange({ ...this.skills })
  }

  _activateSlow() {
    const sk = this.skills.slow
    if (sk.cooldown > 0) { this._showFloat(`🌀 Bekleme: ${Math.ceil(sk.cooldown)}s`, '#8b5cf6'); return }
    if (!this.options.isPremium) { this._showFloat('🌀 Premium Gerekli! 💎', '#8b5cf6'); return }
    const cell = this.cells[0]
    if (!cell) return
    let nearestId = null, nearDist = Infinity
    for (const bot of this.bots) {
      if (bot.dead) continue
      const d = dist(bot, cell)
      if (d < nearDist) { nearDist = d; nearestId = bot.id }
    }
    for (const [id, p] of Object.entries(this.otherPlayers)) {
      const d = Math.sqrt((p.x - cell.x) ** 2 + (p.y - cell.y) ** 2)
      if (d < nearDist) { nearDist = d; nearestId = id }
    }
    if (!nearestId) { this._showFloat('🌀 Hedef bulunamadı!', '#8b5cf6'); return }
    sk.active = true; sk.timer = SKILL_SLOW_DURATION; sk.cooldown = SKILL_SLOW_COOLDOWN
    sk.targetId = nearestId
    this.slowedEntities[nearestId] = SKILL_SLOW_DURATION
    const target = this.bots.find(b => b.id === nearestId) || this.otherPlayers[nearestId]
    this.clickTarget = target ? { x: target.x, y: target.y } : null
    this._showFloat('🌀 EN YAKIN YAVAŞLATILDI!', '#8b5cf6')
    this._spawnExplosion(cell.x, cell.y, '#8b5cf6')
    this.onSkillChange({ ...this.skills })
  }

  _activateShield() {
    const sk = this.skills.shield
    if (sk.cooldown > 0) { this._showFloat(`🛡️ Bekleme: ${Math.ceil(sk.cooldown)}s`, '#06b6d4'); return }
    if (!this.options.isPremium) { this._showFloat('🛡️ Premium Gerekli! 💎', '#06b6d4'); return }
    sk.active = true; sk.timer = SKILL_SHIELD_DURATION; sk.cooldown = SKILL_SHIELD_COOLDOWN
    this._showFloat('🛡️ KALKAN AKTİF!', '#06b6d4')
    this._spawnExplosion(this.cells[0]?.x||0, this.cells[0]?.y||0, '#06b6d4')
    this.onSkillChange({ ...this.skills })
  }

  _activateFoodTrap() {
    if (this.foodTrapCooldown > 0) { this._showFloat(`⚠️ Tuzak: ${Math.ceil(this.foodTrapCooldown)}s`, '#ef4444'); return }
    const mx = this.mouse.x, my = this.mouse.y
    const spread = 120
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const f = new Food(
        clamp(mx + Math.cos(angle) * spread, 50, WORLD_SIZE - 50),
        clamp(my + Math.sin(angle) * spread, 50, WORLD_SIZE - 50),
        '#ef4444', 1
      )
      f.radius = 6
      f.pulse = Math.random() * Math.PI * 2
      f.poison = true
      this.food.push(f)
    }
    this.foodTrapCooldown = 20
    this._showFloat('⚠️ ZEHİRLİ TUZAK!', '#ef4444')
    this._spawnExplosion(mx, my, '#ef4444')
  }

  _updateSkills(dt) {
    for (const [name, sk] of Object.entries(this.skills)) {
      if (sk.active) { sk.timer -= dt; if (sk.timer <= 0) { sk.active = false; sk.timer = 0 } }
      if (sk.cooldown > 0) { sk.cooldown -= dt; if (sk.cooldown < 0) sk.cooldown = 0 }
    }
    for (const id of Object.keys(this.slowedEntities)) {
      this.slowedEntities[id] -= dt
      if (this.slowedEntities[id] <= 0) delete this.slowedEntities[id]
    }
    if (Object.keys(this.skills).some(k => this.skills[k].active || this.skills[k].cooldown > 0)) {
      this.onSkillChange({ ...this.skills })
    }
  }

  _playDeathAnimation() {
    const cx = this.cells.reduce((s,c)=>s+c.x,0)/(this.cells.length||1)
    const cy = this.cells.reduce((s,c)=>s+c.y,0)/(this.cells.length||1)
    const totalMass = this.cells.reduce((s,c)=>s+c.mass,0)
    const radius = massToRadius(totalMass)
    for (let i = 0; i < 80; i++) {
      const angle = Math.random()*Math.PI*2
      const speed = 3 + Math.random() * 12
      const size = 4 + Math.random() * 12
      this.particles.push({
        x: cx + (Math.random()-0.5)*radius,
        y: cy + (Math.random()-0.5)*radius,
        vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? this.playerColor : '#fbbf24',
        life: 1.5 + Math.random(), size
      })
    }
    this.screenFlash = 1
  }

  _initBots() {
    return
    const BOT_COUNT = 30
    const teamColors = { red: '#ef4444', blue: '#3b82f6' }
    for (let i = 0; i < BOT_COUNT; i++) {
      const diff = i < 8 ? 'easy' : i < 20 ? 'medium' : 'hard'
      const bot = new Bot(
        400 + Math.random() * (WORLD_SIZE - 800),
        400 + Math.random() * (WORLD_SIZE - 800),
        BOT_COLORS[i % BOT_COLORS.length],
        BOT_NAMES[i % BOT_NAMES.length],
        diff
      )
      if (this.gameMode === 'teams') {
        bot.team = i < BOT_COUNT/2 ? 'red' : 'blue'
        bot.color = i < BOT_COUNT/2 ? teamColors.red : teamColors.blue
      }
      if (this.gameMode === 'clan_war') {
        bot.team = i < BOT_COUNT/2 ? 'clan_a' : 'clan_b'
      }
      this.bots.push(bot)
    }
  }

  _updateBots(dt) {
    const frameSkipDistant = this.qualityLevel !== 'high'
    for (const bot of this.bots) {
      if (bot.dead) {
        bot.respawnTimer -= dt
        if (bot.respawnTimer <= 0) {
          bot.dead = false; bot.mass = 20 + Math.random() * 30
          bot.x = 400 + Math.random() * (WORLD_SIZE - 800)
          bot.y = 400 + Math.random() * (WORLD_SIZE - 800)
          bot.cells = [{ x: bot.x, y: bot.y, mass: bot.mass }]
        }
        continue
      }
      const botDist = Math.sqrt((bot.x - this.camera.x) ** 2 + (bot.y - this.camera.y) ** 2)
      const isDistant = botDist > 2000
      if (frameSkipDistant && isDistant && this._frameCount % 4 !== 0) continue
      bot.thinkTimer -= dt
      if (bot.thinkTimer <= 0) {
        if (!isDistant || this._frameCount % 3 === 0) this._botThink(bot)
        bot.thinkTimer = bot.difficulty === 'easy' ? 1.2 : bot.difficulty === 'medium' ? 0.6 : 0.25
      }
      const isSlowed = !!this.slowedEntities[bot.id]
      const speed = BASE_SPEED * Math.pow(Math.max(bot.mass, 1), -0.25) * 90 * (isSlowed ? 0.3 : 1)
      const dx = bot.targetX - bot.x, dy = bot.targetY - bot.y
      const d = Math.sqrt(dx*dx + dy*dy)
      if (d > 5) { const s = Math.min(speed * dt, d); bot.x += (dx/d)*s; bot.y += (dy/d)*s }
      bot.x = clamp(bot.x, 50, WORLD_SIZE - 50); bot.y = clamp(bot.y, 50, WORLD_SIZE - 50)
      bot.cells = [{ x: bot.x, y: bot.y, mass: bot.mass }]
      const eaten = []
      const nearFood = this._foodGrid.query(bot.x, bot.y, bot.radius + 20)
      for (const f of nearFood) {
        if (dist(bot, f) < bot.radius + 3) {
          if (f.poison) { bot.mass = Math.max(20, bot.mass * 0.7); this._spawnParticle(f.x, f.y, '#ef4444', 4) }
          else { bot.mass += f.value }
          eaten.push(f.id)
        }
      }
      if (eaten.length) {
        this.food = this.food.filter(f => !eaten.includes(f.id))
        const colors = this.theme.foodColors
        for (let i = 0; i < eaten.length; i++) this.food.push(new Food(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, colors[Math.floor(Math.random()*colors.length)], 1))
      }
      let botKilled = false
      for (const cell of this.cells) {
        if (cell.mass > bot.mass * MIN_EAT_RATIO && dist(cell, bot) < cell.radius) {
          this._spawnAbsorb(bot.x, bot.y, cell.x, cell.y, bot.color)
          this._showFloat(`+${Math.floor(bot.mass)} 🤖`, '#4ade80')
          const killedMass = bot.mass
          cell.mass += killedMass
          cell.eatPulse = 1
          this.lastEatTime = Date.now()
          bot.dead = true; bot.respawnTimer = 5 + Math.random() * 5; bot.mass = 20; botKilled = true
          this.onKill(killedMass)
          this.onXPGain(Math.floor(killedMass / 10))
          soundSystem.eatPlayer()
          if (this.options.isPremium) this._premiumEatEffect(cell.x, cell.y, cell.color)
          break
        }
      }
      if (!botKilled) {
        const isAlly = (this.gameMode === 'teams' || this.gameMode === 'clan_war') && bot.team === this.playerTeam
        if (!isAlly) {
          const cellsToRemove = []
          for (const cell of this.cells) {
            if (bot.mass > cell.mass * MIN_EAT_RATIO && dist(bot, cell) < bot.radius) {
              if (!this.skills.shield.active) {
                bot.mass += cell.mass
                cellsToRemove.push(cell.id)
                this._spawnExplosion(cell.x, cell.y, cell.color)
                this._showFloat(`💀 Parça Yenildi!`, '#ef4444')
                soundSystem.death()
              } else {
                this._showFloat('🛡️ Korundu!', '#06b6d4')
              }
            }
          }
          if (cellsToRemove.length > 0) {
            this.cells = this.cells.filter(c => !cellsToRemove.includes(c.id))
            if (this.cells.length === 0) {
              this.deathStats = { score: Math.floor(this.score), kills: this.kills, time: Math.floor(GAME_DURATION - this.gameTime) }
              this._playDeathAnimation()
              this._notifyDeath(bot.id, bot.name)
              setTimeout(() => { this.dead = true; this.onDeath(this.deathStats) }, 800)
              return
            }
          }
        }
      }
      bot.mass = Math.max(20, bot.mass - bot.mass * 0.002 * dt)
    }
    if (this.offline) {
      const all = [{ id: this.playerId, name: this.playerName, mass: this.cells.reduce((s,c)=>s+c.mass,0), color: this.playerColor, isGod: this.isGod }]
      all.sort((a,b) => b.mass - a.mass)
      this.leaderboard = all.slice(0,10)
      this.onLeaderboardChange(this.leaderboard)
      this.onPlayerCountChange(1)
    }
  }

  _botThink(bot) {
    const myMass = bot.mass
    let nearestFood = null, nearFoodDist = Infinity
    for (const f of this.food) { const d = dist(bot, f); if (d < nearFoodDist) { nearFoodDist = d; nearestFood = f } }
    const playerMass = this.cells.reduce((s,c)=>s+c.mass, 0)
    const pcx = this.cells.reduce((s,c)=>s+c.x, 0) / (this.cells.length||1)
    const pcy = this.cells.reduce((s,c)=>s+c.y, 0) / (this.cells.length||1)
    const dPlayer = dist({ x: pcx, y: pcy }, bot)
    if (playerMass > myMass * 1.1) {
      const fleeR = bot.difficulty === 'hard' ? 400 : bot.difficulty === 'medium' ? 250 : 150
      if (dPlayer < fleeR) {
        const dx = bot.x - pcx, dy = bot.y - pcy, d = Math.sqrt(dx*dx+dy*dy)||1
        bot.targetX = clamp(bot.x + (dx/d)*600, 100, WORLD_SIZE-100)
        bot.targetY = clamp(bot.y + (dy/d)*600, 100, WORLD_SIZE-100)
        return
      }
    }
    if (myMass > playerMass * 1.2 && dPlayer < 800 && bot.difficulty !== 'easy') {
      bot.targetX = pcx; bot.targetY = pcy; return
    }
    for (const other of this.bots) {
      if (other === bot || other.dead) continue
      const d = dist(bot, other)
      if (other.mass > myMass * 1.2 && d < 400) {
        const dx = bot.x-other.x, dy = bot.y-other.y, len = Math.sqrt(dx*dx+dy*dy)||1
        bot.targetX = clamp(bot.x+(dx/len)*500, 100, WORLD_SIZE-100)
        bot.targetY = clamp(bot.y+(dy/len)*500, 100, WORLD_SIZE-100)
        return
      }
      if (myMass > other.mass * 1.2 && d < 600 && bot.difficulty === 'hard') { bot.targetX = other.x; bot.targetY = other.y; return }
    }
    if (nearestFood) {
      const jitter = bot.difficulty === 'easy' ? 200 : 50
      bot.targetX = nearestFood.x + (Math.random()-0.5)*jitter
      bot.targetY = nearestFood.y + (Math.random()-0.5)*jitter
    } else {
      bot.targetX = 400 + Math.random()*(WORLD_SIZE-800)
      bot.targetY = 400 + Math.random()*(WORLD_SIZE-800)
    }
  }

  _updateGameMode(dt) {
    const mode = this.gameMode
    if (mode === 'battle_royale' && this.brZone.active) {
      this.brZone.shrinkTimer -= dt
      if (this.brZone.shrinkTimer <= 0) {
        this.brZone.radius = Math.max(300, this.brZone.radius - 180)
        this.brZone.shrinkTimer = 30 + Math.random() * 10
        this.modeMessage = `⚠️ Zon Daralıyor! R: ${Math.floor(this.brZone.radius)}`
        this.modeMessageTimer = 3
      }
      if (!this.dead && this.cells.length > 0) {
        for (const cell of this.cells) {
          const dz = Math.sqrt((cell.x - this.brZone.x)**2 + (cell.y - this.brZone.y)**2)
          if (dz > this.brZone.radius) {
            if (!this.skills.shield.active) {
              this._playDeathAnimation()
              this._showFloat('☠️ Zon Dışında Öldün!', '#ef4444')
              this._notifyDeath()
              setTimeout(() => { this.dead = true; this.onDeath() }, 800)
              return
            }
          }
        }
      }
    }
    if (mode === 'rush' && !this._useSocket) {
      this.rushTime -= dt
      this.onTimerChange(Math.max(0, Math.ceil(this.rushTime)))
      if (this.rushTime <= 0 && !this.dead && !this._rushEndedLocal) {
        this._rushEndedLocal = true
        this.rushTime = 0
        this.modeMessage = `🏁 Süre Bitti! Skor: ${Math.floor(this.score)}`
        this.modeMessageTimer = 5
        setTimeout(() => { if (!this.dead) { this.dead = true; this.onDeath && this.onDeath() } }, 4000)
      }
    }
    if (mode === 'teams') {
      for (const bot of this.bots) {
        if (!bot.team) bot.team = Math.random() < 0.5 ? 'red' : 'blue'
        if (bot.team === this.playerTeam) {
          let canEat = false
          for (const cell of this.cells) {
            if (cell.mass > bot.mass * MIN_EAT_RATIO && dist(cell, bot) < cell.radius) {
              canEat = true; break
            }
          }
          if (canEat) continue
        }
      }
    }
  }

  _drawBattleRoyaleZone() {
    if (!this.brZone.active) return
    const { ctx } = this
    const { x, y, radius } = this.brZone
    const t = Date.now() / 600
    const alpha = 0.35 + 0.15 * Math.sin(t)
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2)
    ctx.strokeStyle = `rgba(239,68,68,${alpha})`
    ctx.lineWidth = 6; ctx.setLineDash([18, 8]); ctx.stroke(); ctx.setLineDash([])
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2)
    const outside = ctx.createRadialGradient(x, y, radius * 0.9, x, y, radius * 1.5)
    outside.addColorStop(0, 'rgba(239,68,68,0)')
    outside.addColorStop(1, `rgba(239,68,68,${alpha * 0.5})`)
    ctx.fillStyle = outside
    ctx.shadowBlur = 30; ctx.shadowColor = '#ef4444'
    ctx.fill(); ctx.shadowBlur = 0
    if (this.modeMessage && this.modeMessageTimer > 0) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, this.modeMessageTimer)
      ctx.font = 'bold 28px "Exo 2", sans-serif'
      ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(this.modeMessage, x, y - radius - 30)
      ctx.restore()
    }
  }

  _notifyDeath(killerId = null, killerName = null) {
    if (this._useSocket) {
      socketClient.die({ killerId, killerName })
    } else if (!this.offline) {
      try { remove(ref(db, `rooms/${this.roomId}/players/${this.playerId}`)) } catch(_) {}
    }
  }

  _notifyKill(victimId, victimName) {
    if (this._useSocket) {
      socketClient.kill(victimId, victimName)
    }
  }

  destroy() {
    this.running = false
    if (this.frameId) cancelAnimationFrame(this.frameId)
    if (this.syncInterval) clearInterval(this.syncInterval)
    this._removeEvents()
    if (this._useSocket) {
      socketClient.disconnect()
    } else {
      try {
        remove(ref(db, `rooms/${this.roomId}/players/${this.playerId}`))
        off(ref(db, `rooms/${this.roomId}/food`))
        off(ref(db, `rooms/${this.roomId}/players`))
        off(ref(db, `rooms/${this.roomId}/viruses`))
      } catch(_) {}
    }
  }

  setTheme(id) { this.theme = getTheme(id) }
  touchSplit() { this._split() }
  touchEject() { this._eject(EJECT_MASS_SM) }
}
