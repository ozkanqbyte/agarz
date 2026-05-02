try { require('dotenv').config() } catch {}

console.log('[ENV-CHECK] PAYTR_MERCHANT_ID:', process.env.PAYTR_MERCHANT_ID ? 'SET(' + process.env.PAYTR_MERCHANT_ID.length + ')' : 'EMPTY')
console.log('[ENV-CHECK] PAYTR_MERCHANT_KEY:', process.env.PAYTR_MERCHANT_KEY ? 'SET(' + process.env.PAYTR_MERCHANT_KEY.length + ')' : 'EMPTY')
console.log('[ENV-CHECK] PAYTR_MERCHANT_SALT:', process.env.PAYTR_MERCHANT_SALT ? 'SET(' + process.env.PAYTR_MERCHANT_SALT.length + ')' : 'EMPTY')
console.log('[ENV-CHECK] FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET(' + process.env.FIREBASE_SERVICE_ACCOUNT.length + ')' : 'EMPTY')
console.log('[ENV-CHECK] NODE_ENV:', process.env.NODE_ENV)
console.log('[ENV-CHECK] PORT:', process.env.PORT)

const os = require('os')
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const crypto = require('crypto')
const admin = require('firebase-admin')

const PAYTR_MERCHANT_ID   = process.env.PAYTR_MERCHANT_ID   || '631149'
const PAYTR_MERCHANT_KEY  = process.env.PAYTR_MERCHANT_KEY  || 'oGbcJ8Y8zBYSaKPZ'
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT || 'LL1oSaB2SSGsmH5j'
const CLIENT_URL          = process.env.CLIENT_URL  || 'https://agarix.com.tr'
const SERVER_URL          = process.env.SERVER_URL  || 'https://agarz-production.up.railway.app'
const FIREBASE_DB_URL     = process.env.FIREBASE_DATABASE_URL || 'https://agarix-513e9-default-rtdb.firebaseio.com'

const FIREBASE_SA_FALLBACK = 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6ImFnYXJpeC01MTNlOSIsInByaXZhdGVfa2V5X2lkIjoiMGM4ZWE5ZTI4N2ZlNWE0OGNjNTg5NzVhODgxODJlM2JmZTkzMTcyMSIsInByaXZhdGVfa2V5IjoiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUURlQXBZWU1HUkVmQmJUbFErQmM0SUJiWTVCRUFCMTI2QmRvUFlFZlllcHhReVAvcll0TXFaeG83WGk3SWxVWTdGb1ZONVhpN1RZd0wwcm5uTWRFRW0wSXdmTCtyNDdxK1A0U3ZYY2J6WU1aRndvN3hFazdLZHhLK25NT3pCTGwvSzEreHB6Wnh5dEZYdUIrbXdudkh2RWJNS1NIVEkyb3JUbEhZTVVGSER3OW5DL243SXJCYldqdjgzL1g1Kys2ZzJDMUpTSy92dk9wcTYvU29QbXdualFJb2xNSFMvbkN1RFZDTlNId1BkZ2xvYWtwZkxFZ1ZpOVpOUENkMHZzVUg3MDlVUXFOblo1ektDUE95RHVMSWhGckpQR213ejhFdWZmbXE5Y2phQWxLaEtRMDNtN2ZlUXdrOGhOSjl4SFFtMnFOaDhnTzNPUm9RUDRnUXdjcUxteEFnTUJBQUVDZ2dFQU5vM1RwTE9GZkFlekUwQjZmREN1Vmx2OXZCS3F6a3RQQzVyaFFXYTRWcmtuVmwzOGxid3Z4dFozL0VCc0dacmF6aHltdTBRSEIwbExZdVBQZlNtU3R1dHh2OGZJaGNDK0p2WUNsdTJVRGpUK0tZZmZnbCtONE1NdDh5UHJRUFFnYmVQN2tyYVloeGF6a0JQQmpuMGtPN2NQRTlrTlRQd3I3KzRSMXZZVDc3M2w4TExzd3RyTmRLY0R2S1NGaE5LM1g3QVRsM2h5WVI2ME8ycWg0NFQyNGlnVXdSMzBoNUEvbkd3Y2dJU1BwN1dZL3VqRFFDc2NBVmMyb1JJVldzTmh3SElPTnBvVHJGZWpiTzE0U3c3c0dUSXpyZ1JVRFVEWmd1VmlzSUQ5STZRaDByK0xQUkxsMHlwbEFvb2NId0lGUnJMMytmWTVJYU5OSVVLeVdmUS9IUUtCZ1FEMGMrZTZBTSthcHhRNVYxSHh5WTA1d2xuYVNEMXFhdVBMSmd2b2VEckpkem5GSTVpK1FlVlNLTGdXYTdSRUsxVHczaGxISkZzRVp3eURqSnNJdzEyMXEyWkt4NExFTjNIQmNxbERrMXVjMXhiNy8yeXBpeTkrSDB5LzFrNDJ3bk5zTkZqRnhxcElOOGxGRTNRV25vU3YzOVdiRlNoeVdDUVppYUtJYVpyck5RS0JnUURvZjBudFVhOWs2UG1jTEVlZWtydkU5enRBc0NtajVtZWNNNjQwQWRneXFtNCs5NGg5di92QVBFWWI3cVAxcjhJS2NvRkZKNE9VUHVUdS9zbXZRUTB5ck9rRldtSXMwbWxQSmdlaVFGdG5JTXhod3pMekdvWk5zN2RTMTlKRHVJN01UdE9PWlN3aldFUDJaRjdNbDVNamJza3UyZmlTVHpreFZvM3MvYkNvRFFLQmdEREVGb3hDc1NlM0FRL1hYWitRaDczb0NhakVGSXh3T25WQ1o4bStnbXZDZnlIVzBoZlNhWDhVWkhVRWszZXQ5VW4vNUtjT2w2R3ZOUTNoTk9Sd3BQY2k5RXNpdGZHUzVmeWpkU1RuOXJTNUsvcWxuL1hLc0hUR3BiYjNkNjd3NTduRVQ1bFU0bzk1b1l0SU1EWjY5UmxvMitJT1BIMWpIQUNFTm9wa0Z1V3BBb0dCQU1uV3o1Z3VwUVVHMk1RREVQNFNSdDY4LzN5dU1zZ3VXMTZZNHpBVk5kcnVhSjFUaWZRWmVuWXVIWE5jWG8wSlUzeDhZY3RtZlcxeW1JNy9OSnBuOEF4QlhsNmVVOEt6dkdiUkRpbUdrNU5aUHZYVVgyUDdjQUwrOVRUL1ZuUWlRaDRPaE0wRytpV0pHQjlNalp3eUxyUEJGdmtNbENaNGpwOU5sQkxkUHNMMUFvR0FVM0Y4cXdxNkZOaEROV0hNbEc3WS80QnRFWDc2bjN1NXo0bU5LaDR2UHJpNjdQdGMwekFyV016citJd2NmdFVsRTREeWxodmkvMTh5dk8wMjRvbldwVE9xUjJWWFFzNnRtVWpLN0t4blA5NmxXeXBKTXVZTFVtQUdRUFd6b1YwejlEcnZUeDVkci9odE1CbWJYVTlxZWVLNFVhT2NvWnhkQVZZaUl5VkdvUWc9XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLCJjbGllbnRfZW1haWwiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BhZ2FyaXgtNTEzZTkuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJjbGllbnRfaWQiOiIxMDA1NjE0OTgyOTEwOTIxMzEwMTciLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6Imh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvZmlyZWJhc2UtYWRtaW5zZGstZmJzdmMlNDBhZ2FyaXgtNTEzZTkuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJ1bml2ZXJzZV9kb21haW4iOiJnb29nbGVhcGlzLmNvbSJ9'

let firebaseDb = null
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64 || process.env.FIREBASE_SERVICE_ACCOUNT || FIREBASE_SA_FALLBACK
  if (raw) {
    let serviceAccountJson = raw
    if (!raw.trim().startsWith('{')) {
      serviceAccountJson = Buffer.from(raw, 'base64').toString('utf8')
    }
    const serviceAccount = JSON.parse(serviceAccountJson)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: FIREBASE_DB_URL })
    firebaseDb = admin.database()
    console.log('[Firebase] Admin SDK hazir')
  } else {
    console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT env yok, odeme sonrasi Firebase yazamaz')
  }
} catch (e) {
  console.error('[Firebase] Admin init hatasi:', e.message)
}

const PAYMENT_PACKAGES = {
  gold_500:         { name: '500 Gold',       goldAmount: 500,  priceTL: '9.99'   },
  gold_1500:        { name: '1500 Gold',       goldAmount: 1700, priceTL: '24.99'  },
  gold_5000:        { name: '5000 Gold',       goldAmount: 6000, priceTL: '59.99'  },
  premium_trial:    { name: 'Deneme Paketi',   packageId: 'trial',    priceTL: '9.99'   },
  premium_starter:  { name: 'Starter Pack',    packageId: 'starter',  priceTL: '24.99'  },
  premium_player:   { name: 'Oyuncu Paketi',   packageId: 'player',   priceTL: '49.99'  },
  premium_pro:      { name: 'Pro Oyuncu',      packageId: 'pro',      priceTL: '79.99'  },
  premium_elite:    { name: 'Elite',           packageId: 'elite',    priceTL: '119.99' },
  premium_champion: { name: 'Sampiyon',        packageId: 'champion', priceTL: '149.99' },
  premium_master:   { name: 'Master',          packageId: 'master',   priceTL: '179.99' },
  premium_legend:   { name: 'Efsane',          packageId: 'legend',   priceTL: '229.99' },
  premium_apex:     { name: 'APEX',            packageId: 'apex',     priceTL: '299.99' },
  premium_immortal: { name: 'IMMORTAL',        packageId: 'immortal', priceTL: '449.99' },
}

const pendingPayments = new Map()
const completedPayments = new Map()

async function paytrRequest(params) {
  const body = new URLSearchParams(params).toString()
  console.log('PayTR request params:', Object.keys(params).join(','))
  const res = await fetch('https://www.paytr.com/odeme/api/get-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = await res.text()
  console.log('PayTR status:', res.status, 'response:', text.substring(0, 500))
  if (!text) throw new Error(`PayTR bos yanit - HTTP ${res.status} - redirected:${res.redirected} - url:${res.url}`)
  try { return JSON.parse(text) } catch { throw new Error(`PayTR parse hatasi [${res.status}]: ` + text.substring(0, 300)) }
}

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.get('/health', (_, res) => res.json({ ok: true }))

app.get('/payment/debug-creds', (_, res) => res.status(404).json({ error: 'Not found' }))

app.post('/payment/create-checkout', async (req, res) => {
  const { packageId, uid, email, name } = req.body
  const pkg = PAYMENT_PACKAGES[packageId]
  if (!pkg) return res.status(400).json({ error: 'Gecersiz paket' })

  const merchantOid = `${Date.now()}${crypto.randomBytes(4).toString('hex')}`
  let rawIp = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1').split(',')[0].trim()
  if (rawIp.startsWith('::ffff:')) rawIp = rawIp.replace('::ffff:', '')
  if (rawIp === '::1' || rawIp.includes(':')) rawIp = '1.1.1.1'
  const userIp = rawIp
  const paymentAmount = Math.round(parseFloat(pkg.priceTL) * 100)
  const userEmail = (email || 'oyuncu@agarix.com.tr').toLowerCase().trim()
  const userBasket = JSON.stringify([[pkg.name, pkg.priceTL, 1]])
  const testMode = process.env.PAYTR_TEST_MODE === '1' ? '1' : '0'
  const noInstallment = '0'
  const maxInstallment = '0'
  const currency = 'TL'
  const lang = 'tr'
  console.log('[PayTR] create-checkout:', { packageId, uid, userIp, paymentAmount, testMode, email: userEmail })

  const userBasketB64 = Buffer.from(userBasket).toString('base64')
  const paymentAmountStr = String(paymentAmount)
  const hashStr = PAYTR_MERCHANT_ID + userIp + merchantOid + userEmail + paymentAmountStr + userBasketB64 + noInstallment + maxInstallment + currency + testMode
  const paytrToken = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY)
    .update(hashStr + PAYTR_MERCHANT_SALT)
    .digest('base64')

  const params = {
    merchant_id: PAYTR_MERCHANT_ID,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email: userEmail,
    payment_amount: paymentAmountStr,
    paytr_token: paytrToken,
    user_basket: userBasketB64,
    debug_on: '1',
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: (name || 'Oyuncu').substring(0, 50),
    user_address: 'Dijital Urun',
    user_phone: '05000000000',
    merchant_ok_url: `${CLIENT_URL}/payment/success`,
    merchant_fail_url: `${CLIENT_URL}/payment/fail`,
    callback_url: `${SERVER_URL}/payment/callback`,
    timeout_limit: '30',
    currency,
    test_mode: testMode,
    lang,
  }

  try {
    const result = await paytrRequest(params)
    console.log('[PayTR] result:', JSON.stringify(result))
    if (!result || result.status !== 'success') {
      const reason = result?.reason || result?.err_msg || JSON.stringify(result)
      console.error('[PayTR] Token hatasi:', reason)
      return res.status(500).json({ error: reason || 'Odeme baslatilamadi' })
    }
    pendingPayments.set(merchantOid, { uid, packageId, createdAt: Date.now() })
    setTimeout(() => pendingPayments.delete(merchantOid), 30 * 60 * 1000)
    res.json({ token: result.token, merchantOid })
  } catch (e) {
    console.error('[PayTR] Hata:', e.message)
    res.status(500).json({ error: 'Sunucu hatasi', detail: e.message })
  }
})

app.post('/payment/callback', async (req, res) => {
  res.send('OK')

  const { merchant_oid, status, total_amount, hash } = req.body
  if (!merchant_oid || !status || !hash) return

  const hashStr = merchant_oid + PAYTR_MERCHANT_SALT + status + total_amount
  const expectedHash = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY)
    .update(hashStr)
    .digest('base64')

  if (expectedHash !== hash) {
    console.error('[PayTR] Hash uyusmuyor:', merchant_oid)
    return
  }

  if (status !== 'success') {
    console.log('[PayTR] Odeme basarisiz:', merchant_oid, status)
    const pending = pendingPayments.get(merchant_oid)
    if (pending) {
      completedPayments.set(merchant_oid, { status: 'failed', ...pending })
      pendingPayments.delete(merchant_oid)
    }
    return
  }

  const pending = pendingPayments.get(merchant_oid)
  if (!pending) { console.warn('[PayTR] Bekleyen odeme yok:', merchant_oid); return }

  const { uid, packageId } = pending
  const pkg = PAYMENT_PACKAGES[packageId]
  pendingPayments.delete(merchant_oid)
  completedPayments.set(merchant_oid, { status: 'success', uid, packageId, completedAt: Date.now() })
  setTimeout(() => completedPayments.delete(merchant_oid), 60 * 60 * 1000)

  console.log(`[PayTR] ✅ Odeme onaylandi: ${merchant_oid} | uid:${uid} | pkg:${packageId}`)

  if (!firebaseDb) {
    console.error('[PayTR] Firebase Admin yok, odeme yazamadi! uid:', uid)
    return
  }

  try {
    const userRef = firebaseDb.ref(`users/${uid}`)
    const snap = await userRef.once('value')
    const userData = snap.val() || {}

    if (pkg.goldAmount) {
      const currentGold = userData.gold || 0
      await userRef.update({
        gold: currentGold + pkg.goldAmount,
        lastGoldPurchase: Date.now(),
      })
      console.log(`[PayTR] Gold yazildi: uid=${uid} +${pkg.goldAmount}`)
    }

    if (pkg.packageId) {
      const now = Date.now()
      const existingExpiry = userData.premiumExpiry || 0
      const base = existingExpiry > now ? existingExpiry : now
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
      await userRef.update({
        ownedPackage: pkg.packageId,
        isPremium: true,
        premiumSince: userData.premiumSince || now,
        premiumExpiry: base + THIRTY_DAYS,
        lastPackagePurchase: now,
      })
      console.log(`[PayTR] Paket yazildi: uid=${uid} pkg=${pkg.packageId}`)
    }

    await firebaseDb.ref(`paymentHistory/${uid}/${merchant_oid}`).set({
      packageId, packageName: pkg.name,
      amount: pkg.priceTL,
      goldAmount: pkg.goldAmount || 0,
      premiumPackage: pkg.packageId || null,
      completedAt: Date.now(),
      status: 'success',
    })
  } catch (e) {
    console.error('[PayTR] Firebase yazma hatasi:', e.message, e.stack)
  }
})

app.get('/payment/result', (req, res) => {
  const { merchant_oid } = req.query
  if (!merchant_oid) return res.status(400).json({ error: 'Eksik parametre' })
  const completed = completedPayments.get(merchant_oid)
  if (completed) return res.json(completed)
  const pending = pendingPayments.get(merchant_oid)
  if (pending) return res.json({ status: 'pending' })
  res.json({ status: 'not_found' })
})

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling']
})

const WORLD_SIZE = 6000
const BOT_COUNT = 15
const BOT_NAMES = ['Mert','Emre','Burak','Arda','Kerem','Serhat','Furkan','Berk','Yusuf','Caner','Oguz','Tolga','Umut','Hakan','Kaan','Enes','Volkan','Selim','Tarik','Baran']
const BOT_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#6366f1','#84cc16','#e879f9','#38bdf8','#fb923c','#a3e635','#f472b6','#34d399','#c084fc']
const FOOD_COUNT = 700
const VIRUS_COUNT = 50
const VIRUS_MIN_MASS = 300
const TICK_RATE = 30
const TICK_MS = 1000 / TICK_RATE
const BROADCAST_EVERY = 1
const BASE_SPEED = 13
const MIN_MASS_SPLIT = 35
const EJECT_COST = 15
const EJECT_MASS = 13
const MERGE_TIME_BASE = 30000
const MERGE_TIME_PER_MASS = 20
const MERGE_TIME = MERGE_TIME_BASE
const MERGE_FADE = 8000
const MAX_CELLS = 16
const SPLIT_SPEED = 30
const MIN_EAT_RATIO = 1.10
const MAX_MASS = 50000
const VIRUS_FEED_SPLIT = 7

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
function speedForMass(mass, isBot = false) { 
  const base = Math.max(1.5, BASE_SPEED / Math.pow(Math.max(20, mass), 0.3))
  return isBot ? base * 0.60 : base
}

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

    this._initBots()
    this._startLoop()
  }

  _initBots() {
    for (let i = 0; i < BOT_COUNT; i++) {
      const x = 400 + Math.random() * (WORLD_SIZE - 800)
      const y = 400 + Math.random() * (WORLD_SIZE - 800)
      const mass = 20 + Math.random() * 30
      const bot = {
        id: 'bot_' + rndId(),
        name: BOT_NAMES[i % BOT_NAMES.length],
        x, y,
        mass,
        cells: [{ id: rndId(), x, y, mass, splitVx: 0, splitVy: 0, mergeTimer: 0 }],
        color: BOT_COLORS[i % BOT_COLORS.length],
        inputX: x, inputY: y,
        dead: false,
        isBot: true,
        botThinkTimer: Math.random() * 2,
        botDifficulty: i < 7 ? 'easy' : i < 14 ? 'medium' : 'hard',
        botRespawnTimer: 0,
        frozen: 0, poisoned: 0, skillSpeedTimer: 0, skillSlowTimer: 0,
        skillShieldTimer: 0, skillMagnetTimer: 0, skillGhostTimer: 0,
        score: 0, kills: 0, ownedPackage: 'free', isGod: false
      }
      this.players.set(bot.id, bot)
    }
  }

  _updateBots(dt) {
    for (const [, player] of this.players) {
      if (!player.isBot) continue
      if (player.dead) {
        player.botRespawnTimer = (player.botRespawnTimer || 0) + dt
        if (player.botRespawnTimer >= 5) {
          player.dead = false
          player.botRespawnTimer = 0
          const x = 400 + Math.random() * (WORLD_SIZE - 800)
          const y = 400 + Math.random() * (WORLD_SIZE - 800)
          const mass = 20 + Math.random() * 30
          player.x = x; player.y = y; player.mass = mass
          player.cells = [{ id: rndId(), x, y, mass, splitVx: 0, splitVy: 0, mergeTimer: 0 }]
          player.inputX = x; player.inputY = y
        }
        continue
      }
      player.botThinkTimer = (player.botThinkTimer || 0) - dt
      if (player.botThinkTimer <= 0) {
        const thinkRate = player.botDifficulty === 'hard' ? 0.3 : player.botDifficulty === 'medium' ? 0.7 : 1.5
        player.botThinkTimer = thinkRate + Math.random() * thinkRate
        const cx = player.cells.reduce((s, c) => s + c.x, 0) / player.cells.length
        const cy = player.cells.reduce((s, c) => s + c.y, 0) / player.cells.length
        let bestTarget = null, bestScore = -Infinity
        for (const [, other] of this.players) {
          if (other.id === player.id || other.dead) continue
          const dx = other.x - cx, dy = other.y - cy
          const d = Math.sqrt(dx*dx + dy*dy)
          if (d > 1800) continue
          const massRatio = player.mass / Math.max(1, other.mass)
          const score = massRatio > 1.1 ? (1000 - d) * massRatio : -d
          if (score > bestScore) { bestScore = score; bestTarget = other }
        }
        let nearestFood = null, nearestFoodD = Infinity
        for (const f of this.food) {
          const dx = f.x - cx, dy = f.y - cy
          const d = dx*dx + dy*dy
          if (d < nearestFoodD) { nearestFoodD = d; nearestFood = f }
        }
        if (bestTarget && player.mass > bestTarget.mass * 1.1) {
          player.inputX = bestTarget.x + (Math.random() - 0.5) * 60
          player.inputY = bestTarget.y + (Math.random() - 0.5) * 60
        } else if (bestTarget && bestTarget.mass > player.mass * 1.1) {
          player.inputX = cx + (cx - bestTarget.x) + (Math.random() - 0.5) * 200
          player.inputY = cy + (cy - bestTarget.y) + (Math.random() - 0.5) * 200
        } else if (nearestFood) {
          player.inputX = nearestFood.x + (Math.random() - 0.5) * 80
          player.inputY = nearestFood.y + (Math.random() - 0.5) * 80
        } else {
          player.inputX = cx + (Math.random() - 0.5) * 600
          player.inputY = cy + (Math.random() - 0.5) * 600
        }
        player.inputX = Math.max(100, Math.min(WORLD_SIZE - 100, player.inputX))
        player.inputY = Math.max(100, Math.min(WORLD_SIZE - 100, player.inputY))
      }
    }
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
      }
      if (false && player.skillMagnetTimer > 0) {
        const MAGNET_RANGE = 700, MAGNET_RANGE2 = 700*700, MAGNET_SPEED = 5
        for (const food of room.food) {
          const dx = player.x - food.x, dy = player.y - food.y
          const d2 = dx*dx + dy*dy
          if (d2 >= MAGNET_RANGE2 || d2 < 1) continue
          const d = Math.sqrt(d2)
          food.x += (dx/d)*MAGNET_SPEED; food.y += (dy/d)*MAGNET_SPEED
        }
        for (const [, enemy] of room.players) {
          if (enemy.id === player.id || enemy.dead) continue
          for (const ec of enemy.cells) {
            if (ec.mass >= player.mass) continue
            const dx = player.x - ec.x, dy = player.y - ec.y
            const d2 = dx*dx + dy*dy
            if (d2 >= MAGNET_RANGE2 || d2 < 1) continue
            const d = Math.sqrt(d2)
            ec.x += (dx/d)*4; ec.y += (dy/d)*4
          }
        }
      }
      if (player.skillGhostTimer > 0) player.skillGhostTimer -= dt
    }

    this._updateBots(dt)
    this._updateEjectedMasses(dt)
    this._checkFoodCollisions()
    this._checkPlayerCollisions()
    this._checkVirusCollisions()
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
    const speedMult = player.skillSpeedTimer > 0 ? 5 : 1
    for (const cell of player.cells) {
      if (cell.collisionIgnore > 0) cell.collisionIgnore = Math.max(0, cell.collisionIgnore - dt)
      const r = massToRadius(cell.mass)
      const hasSplitVel = Math.abs(cell.splitVx || 0) > 0.08
      if (hasSplitVel) {
        cell.x = clamp(cell.x + cell.splitVx * dt * 60, r, WORLD_SIZE - r)
        cell.y = clamp(cell.y + cell.splitVy * dt * 60, r, WORLD_SIZE - r)
        const decay = Math.pow(0.72, dt * 25)
        cell.splitVx *= decay
        cell.splitVy *= decay
        if (Math.abs(cell.splitVx) < 0.08) { cell.splitVx = 0; cell.splitVy = 0 }
      }
      if (!frozen && !hasSplitVel) {
        const slowMult = player.skillSlowTimer > 0 ? 0.25 : 1
        const baseSpeed = speedForMass(cell.mass, player.isBot) * speedMult * slowMult * 60
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
    if (player.cells.length > 1) {
      for (let iter = 0; iter < 6; iter++) {
        for (let i = 0; i < player.cells.length; i++) {
          for (let j = i + 1; j < player.cells.length; j++) {
            const ca = player.cells[i], cb = player.cells[j]
            if ((ca.collisionIgnore || 0) > 0 || (cb.collisionIgnore || 0) > 0) continue
            const adx = ca.x - cb.x, ady = ca.y - cb.y
            const ad = Math.sqrt(adx * adx + ady * ady)
            const ra = massToRadius(ca.mass), rb = massToRadius(cb.mass)
            const minD = ra + rb
            const timerMin = Math.min(ca.mergeTimer || 0, cb.mergeTimer || 0)
            const threshMin = MERGE_TIME_BASE + Math.min(ca.mass, cb.mass) * MERGE_TIME_PER_MASS
            const pushFactor = timerMin >= threshMin ? 0 : 1.0
            if (pushFactor <= 0 || ad >= minD) continue
            const overlap = (minD - ad) * 0.22
            let nx, ny
            if (ad < 0.01) {
              const angle = (i * 2.399) + j
              nx = Math.cos(angle); ny = Math.sin(angle)
            } else {
              nx = adx / ad; ny = ady / ad
            }
            ca.x = clamp(ca.x + nx * overlap, ra, WORLD_SIZE - ra)
            ca.y = clamp(ca.y + ny * overlap, ra, WORLD_SIZE - ra)
            cb.x = clamp(cb.x - nx * overlap, rb, WORLD_SIZE - rb)
            cb.y = clamp(cb.y - ny * overlap, rb, WORLD_SIZE - rb)
          }
        }
      }
    }
    const cx = player.cells.reduce((s, c) => s + c.x, 0) / player.cells.length
    const cy = player.cells.reduce((s, c) => s + c.y, 0) / player.cells.length
    player.x = cx; player.y = cy
    player.mass = player.cells.reduce((s, c) => s + c.mass, 0)
  }

  _massDecay(player, dt) {
    for (const cell of player.cells) {
      if (cell.mass <= 20) continue
      cell.mass = Math.max(20, cell.mass * (1 - 0.002 * dt))
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
        const threshA = MERGE_TIME_BASE + a.mass * MERGE_TIME_PER_MASS
        const threshB = MERGE_TIME_BASE + b.mass * MERGE_TIME_PER_MASS
        if (a.mergeTimer < threshA || b.mergeTimer < threshB) continue
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
          if (dist(cell, food) < r * 1.3) {
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
            if (ac.mass > bc.mass * MIN_EAT_RATIO && d < ra - rb * 0.2) {
              eatQueue.push({ eater: a, eaterCell: ac, eaten: b, eatenCell: bc })
            } else if (bc.mass > ac.mass * MIN_EAT_RATIO && d < rb - ra * 0.2) {
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
      if (eaten.skillShieldTimer > 0) continue
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
    const allPlayers = Array.from(this.players.values()).filter(p => !p.dead)
    for (const player of allPlayers) {
      for (const cell of player.cells) {
        if (cell.mass < VIRUS_MIN_MASS) continue
        const r = massToRadius(cell.mass)
        for (const virus of this.viruses) {
          if (toRemove.has(virus.id)) continue
          const virusR = massToRadius(virus.mass)
          if (dist(cell, virus) >= r + virusR * 0.8) continue

          const shield = player.skillShieldTimer > 0
          const gainMass = virus.mass

          cell.mass += gainMass
          if (!shield) {
            this._explodePlayer(player, cell)
          }

          if (virus.type === 'poison' && !shield) player.poisoned = 5
          if (virus.type === 'freeze' && !shield) player.frozen = 4

          toRemove.set(virus.id, { socketId: player.socketId, gain: gainMass })
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
        const nv = this._makeVirusAwayFromPlayers(allPlayers)
        this.viruses.push(nv)
        io.to(this.id).emit('virus:spawned', nv)
      }
    }
  }

  _makeVirusAwayFromPlayers(players) {
    let best = null, bestD = 0
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 300 + Math.random() * (WORLD_SIZE - 600)
      const y = 300 + Math.random() * (WORLD_SIZE - 600)
      let minD = Infinity
      for (const p of players) {
        const dx = p.x - x, dy = p.y - y
        const d = dx*dx + dy*dy
        if (d < minD) minD = d
      }
      if (minD > bestD) { bestD = minD; best = { x, y } }
      if (minD > 500 * 500) break
    }
    return this._makeVirus(best ? best.x : undefined, best ? best.y : undefined)
  }

  _explodePlayer(player, sourceCell) {
    const maxSplits = MAX_CELLS - player.cells.length
    if (maxSplits <= 0) return
    let splits = maxSplits
    let massLeft = sourceCell.mass
    if (massLeft < 466) {
      let splitAmount = 1
      while (massLeft > 0) { splitAmount *= 2; massLeft = sourceCell.mass - splitAmount * 36 }
      splits = Math.min(splitAmount, maxSplits)
    } else {
      splits = Math.min(maxSplits, 15)
    }
    const massPerPiece = sourceCell.mass / (splits + 1)
    sourceCell.mass = massPerPiece
    sourceCell.mergeTimer = 0
    sourceCell.collisionIgnore = 0.6
    for (let i = 0; i < splits; i++) {
      const angle = Math.random() * Math.PI * 2
      const nr = massToRadius(massPerPiece)
      const spd = nr * 0.8
      const newCell = {
        id: rndId(),
        x: clamp(sourceCell.x, nr, WORLD_SIZE - nr),
        y: clamp(sourceCell.y, nr, WORLD_SIZE - nr),
        mass: massPerPiece,
        mergeTimer: 0,
        collisionIgnore: 0.6,
        splitVx: Math.cos(angle) * spd,
        splitVy: Math.sin(angle) * spd
      }
      player.cells.push(newCell)
    }
  }

  _handleEject(player, count = 1) {
    if (player.frozen > 0) return
    const ejected = []
    for (const cell of player.cells) {
      if (cell.mass <= EJECT_COST + 20) continue
      const dx = (player.inputX || 0) - cell.x
      const dy = (player.inputY || 0) - cell.y
      const baseAngle = Math.atan2(dy, dx)
      const fanAngles = count === 3
        ? [baseAngle - 0.38, baseAngle, baseAngle + 0.38]
        : [baseAngle]
      for (const angle of fanAngles) {
        if (cell.mass <= EJECT_COST + 20) break
        cell.mass -= EJECT_COST
        const em = {
          id: rndId(),
          ownerId: player.id,
          x: cell.x + Math.cos(angle) * (massToRadius(cell.mass) + 10),
          y: cell.y + Math.sin(angle) * (massToRadius(cell.mass) + 10),
          vx: Math.cos(angle) * 28,
          vy: Math.sin(angle) * 28,
          color: player.color,
          mass: EJECT_MASS,
          age: 0
        }
        ejected.push(em)
        this.ejectedMasses.push(em)
        this._checkEjectedVirus(em)
      }
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
        if (virus.feedCount >= VIRUS_FEED_SPLIT) {
          virus.feedCount = 0
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
          io.to(this.id).emit('virus:update', { id: virus.id, feedCount: virus.feedCount })
        } else {
          io.to(this.id).emit('virus:update', { id: virus.id, feedCount: virus.feedCount })
        }
        break
      }
    }
  }

  _handleSplit(player, splitDir) {
    const now = Date.now()
    if (!player._lastSplitTime) player._lastSplitTime = 0
    if (now - player._lastSplitTime < 150) return
    player._lastSplitTime = now
    if (player.frozen > 0 || player.cells.length >= MAX_CELLS) return
    
    let nx = 1, ny = 0
    if (splitDir && (splitDir.dx !== undefined && splitDir.dy !== undefined)) {
      nx = splitDir.dx; ny = splitDir.dy
    } else {
      const pdx = (player.inputX || 0) - player.x
      const pdy = (player.inputY || 0) - player.y
      const pd = Math.sqrt(pdx * pdx + pdy * pdy)
      if (pd >= 1) {
        nx = pdx / pd; ny = pdy / pd
      }
    }
    
    const newCells = []
    for (const cell of player.cells) {
      if (cell.mass < MIN_MASS_SPLIT || player.cells.length + newCells.length >= MAX_CELLS) continue
      cell.mass /= 2
      const nr = massToRadius(cell.mass)
      const spd = nr * 0.45
      cell.mergeTimer = 0
      cell.collisionIgnore = 0.6
      newCells.push({
        id: rndId(),
        x: clamp(cell.x, nr, WORLD_SIZE - nr),
        y: clamp(cell.y, nr, WORLD_SIZE - nr),
        mass: cell.mass,
        mergeTimer: 0,
        collisionIgnore: 0.6,
        splitVx: nx * spd,
        splitVy: ny * spd
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
    const VIEW_RANGE = 2200
    const allPlayers = []
    for (const [, p] of this.players) {
      if (p.dead) continue
      allPlayers.push({
        id: p.id,
        x: p.x, y: p.y,
        m: p.mass,
        cs: p.cells.map(c => ({ i: c.id, x: Math.round(c.x), y: Math.round(c.y), m: Math.round(c.mass), vx: c.splitVx ? Math.round(c.splitVx*10)/10 : 0, vy: c.splitVy ? Math.round(c.splitVy*10)/10 : 0, mt: c.mergeTimer || 0 })),
        c: p.color,
        n: p.name,
        g: p.isGod ? 1 : 0,
        cl: p.clan || null,
        frozen: p.frozen > 0 ? 1 : 0,
        poisoned: p.poisoned > 0 ? 1 : 0,
        ghost: p.skillGhostTimer > 0 ? 1 : 0,
        pk: p.ownedPackage || 'free',
        tm: p.team || 'none',
        fr: p.frame || null,
        ne: p.nameEffect || null,
        tr: p.trail || null,
        tl: p.title || null
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
    for (const [, viewer] of this.players) {
      if (!viewer.socketId || viewer.dead) continue
      const vx = viewer.x, vy = viewer.y
      const nearPlayers = allPlayers.filter(p => {
        if (p.id === viewer.id) return true
        const dx = p.x - vx, dy = p.y - vy
        return dx * dx + dy * dy < VIEW_RANGE * VIEW_RANGE
      })
      io.to(viewer.socketId).emit('world:state', { players: nearPlayers, tick: this._tick, mode: this.mode, modeData })
    }
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
      .map(p => ({ id: p.id, name: p.name, mass: Math.floor(p.mass), color: p.color, isGod: !!p.isGod, clan: p.clan || null, team: p.team || 'none' }))
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

const VALID_FRAMES       = ['silver','gold','neon','fire','ice','diamond','rainbow','galaxy','sakura','void','crown']
const VALID_NAME_EFFECTS = ['glow','sparkle','fire','electric','ice','rainbow','galaxy','aurora','void','phantom']
const VALID_TRAILS       = ['sparkle','fire','ice','electric','sakura','galaxy','rainbow','void','aurora']
const VALID_TITLES       = ['beginner','player','warrior','expert','master','legend','godlike','killer','champion','immortal','hunter','predator']

const connRateMap = new Map()
const chatRateMap = new Map()
function checkRate(map, key, maxPerWindow, windowMs) {
  const now = Date.now()
  const entry = map.get(key) || { count: 0, ts: now }
  if (now - entry.ts > windowMs) { entry.count = 0; entry.ts = now }
  entry.count++
  map.set(key, entry)
  return entry.count <= maxPerWindow
}

io.on('connection', (socket) => {
  const ip = (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || 'unknown').split(',')[0].trim()
  if (!checkRate(connRateMap, ip, 10, 10000)) {
    socket.emit('error', { code: 'RATE_LIMIT', msg: 'Çok fazla bağlantı' })
    socket.disconnect(true)
    return
  }
  let room = null
  let playerId = null

  socket.on('room:join', async (data, cb) => {
    try {
      const joiningId = data.playerId || socket.id
      if (firebaseDb && joiningId && joiningId.length > 10) {
        const banSnap = await firebaseDb.ref(`users/${joiningId}/banned`).once('value')
        if (banSnap.val() === true) {
          const reasonSnap = await firebaseDb.ref(`users/${joiningId}/banReason`).once('value')
          socket.emit('kicked', { reason: `Hesabın askıya alındı: ${reasonSnap.val() || 'Kural ihlali'}` })
          return
        }
      }
      playerId = joiningId
      room = getRoom(data.roomId || 'main_ffa', data.mode || 'ffa')
      socket.join(room.id)

      const spawnX = 400 + Math.random() * (WORLD_SIZE - 800)
      const spawnY = 400 + Math.random() * (WORLD_SIZE - 800)

      const VALID_PACKAGES = ['free','trial','starter','player','pro','elite','champion','master','legend','apex','immortal']
      const ownedPackage = VALID_PACKAGES.includes(data.ownedPackage) ? data.ownedPackage : 'free'

      const spawnMass = room.mode === 'shrink_survival' ? 500 : 300
      let assignedTeam
      if (room.mode === 'teams') {
        const teamCode = (data.team || '').trim().toUpperCase().slice(0, 6)
        if (teamCode) {
          const existingWithCode = Array.from(room.players.values()).find(p => p.teamCode === teamCode)
          assignedTeam = existingWithCode ? existingWithCode.team : (
            Array.from(room.players.values()).filter(p => p.team === 'red').length <= Array.from(room.players.values()).filter(p => p.team === 'blue').length ? 'red' : 'blue'
          )
        } else {
          assignedTeam = Array.from(room.players.values()).filter(p => p.team === 'red').length <= Array.from(room.players.values()).filter(p => p.team === 'blue').length ? 'red' : 'blue'
        }
      } else {
        assignedTeam = data.team || 'none'
      }

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
        teamCode: (data.team || '').trim().toUpperCase().slice(0, 6) || null,
        frame:      (data.frame      && VALID_FRAMES.includes(data.frame))            ? data.frame      : null,
        nameEffect: (data.nameEffect && VALID_NAME_EFFECTS.includes(data.nameEffect)) ? data.nameEffect : null,
        trail:      (data.trail      && VALID_TRAILS.includes(data.trail))             ? data.trail      : null,
        title:      (data.title      && VALID_TITLES.includes(data.title))             ? data.title      : null,
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
        const maxMove = speedForMass(sc.mass || 20, false) * 60 * 0.5
        const dx = cx - sc.x, dy = cy - sc.y
        const d = Math.sqrt(dx*dx + dy*dy)
        if (d < maxMove) { sc.x = cx; sc.y = cy }
      }
      const cx = player.cells.reduce((s,c)=>s+c.x,0)/player.cells.length
      const cy = player.cells.reduce((s,c)=>s+c.y,0)/player.cells.length
      player.x = cx; player.y = cy
    }
  })

  socket.on('input:split', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const now = Date.now()
    if (!player._lastSplit) player._lastSplit = 0
    if (!player._splitCount5s) player._splitCount5s = 0
    if (!player._splitWindow) player._splitWindow = now
    if (now - player._splitWindow > 5000) { player._splitCount5s = 0; player._splitWindow = now }
    player._splitCount5s++
    if (player._splitCount5s > 200) {
      player._splitCount5s = 0
      return
    }
    if (now - player._lastSplit < 80) return
    player._lastSplit = now
    const splitDir = data && typeof data.dx === 'number' && typeof data.dy === 'number' ? { dx: data.dx, dy: data.dy } : null
    room._handleSplit(player, splitDir)
  })

  socket.on('input:eject', (data) => {
    console.log('[SERVER-EJECT] Received:', { data })
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || player.dead) return
    const now = Date.now()
    if (!player._lastEject) player._lastEject = 0
    if (!player._ejectCount5s) player._ejectCount5s = 0
    if (!player._ejectWindow) player._ejectWindow = now
    if (now - player._ejectWindow > 5000) { player._ejectCount5s = 0; player._ejectWindow = now }
    const count = data?.count || 1
    console.log('[SERVER-EJECT] Count:', count)
    player._ejectCount5s += count
    if (player._ejectCount5s > 600) {
      player._ejectCount5s = 0
      return
    }
    const minDelay = count === 1 ? 50 : (count === 3 ? 150 : 30)
    if (now - player._lastEject < minDelay) return
    player._lastEject = now
    console.log('[SERVER-EJECT] Calling _handleEject with:', { count })
    room._handleEject(player, count)
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
    // Skills are free for all players (geçici: herkese açık)

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
      let nearest = null
      if (data.targetId) {
        const t = room.players.get(data.targetId)
        if (t && !t.dead && t.id !== player.id) nearest = t
      }
      if (!nearest) nearest = _findNearestEnemy(room, player)
      if (nearest) nearest.skillSlowTimer = player.isPremium ? 6 : 4
    } else if (skill === 'magnet') {
      player.skillMagnetTimer = player.isPremium ? 12 : 8
    } else if (skill === 'ghost') {
      player.skillGhostTimer = 10
    } else if (skill === 'teleport') {
      let tpX, tpY
      if (typeof data.tx === 'number' && typeof data.ty === 'number') {
        tpX = data.tx
        tpY = data.ty
      } else {
        const angle = Math.random() * Math.PI * 2
        tpX = player.x + Math.cos(angle) * 800
        tpY = player.y + Math.sin(angle) * 800
      }
      tpX = clamp(tpX, 200, WORLD_SIZE - 200)
      tpY = clamp(tpY, 200, WORLD_SIZE - 200)
      for (let i = 0; i < player.cells.length; i++) {
        player.cells[i].x = clamp(tpX + i * 8, 200, WORLD_SIZE - 200)
        player.cells[i].y = clamp(tpY + (i % 2 === 0 ? 0 : 8), 200, WORLD_SIZE - 200)
        player.cells[i].splitVx = 0; player.cells[i].splitVy = 0
      }
      player.x = tpX; player.y = tpY
      player.inputX = tpX; player.inputY = tpY
    }

    socket.emit('skill:activated', { skill, cooldown: cooldownMs })
  })

  
  socket.on('player:name', (data) => {
    if (!room || !playerId) return
    const player = room.players.get(playerId)
    if (!player || !data.name) return
    player.name = data.name.trim().substring(0, 30)
    io.to(room.id).emit('player:update', {
      playerId: player.id,
      name: player.name
    })
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
    if (!checkRate(chatRateMap, socket.id, 5, 5000)) return
    const player = room.players.get(playerId)
    const text = (data.text || '').trim().slice(0, 120)
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
    // virus:touch is just a client hint — server loop handles mass gain via _checkVirusCollisions
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
    serverAuth: true,
    v: 3,
    MERGE_TIME,
    MERGE_FADE,
    SPLIT_SPEED
  })
})

app.get('/rooms', (req, res) => {
  const list = Array.from(rooms.entries()).map(([id, r]) => ({
    id, mode: r.mode, players: r.players.size
  }))
  res.json(list)
})

/* ============================================================
   ADMIN API
   ============================================================ */
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'AGARZ_ADMIN_SECRET_2024'

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token
  if (token !== ADMIN_SECRET) return res.status(403).json({ error: 'Yetkisiz' })
  next()
}

async function writeAdminLog(action, adminUid, details = {}) {
  if (!firebaseDb) return
  try {
    const ref = firebaseDb.ref('adminLogs').push()
    await ref.set({ action, adminUid, details, ts: Date.now() })
  } catch {}
}

app.get('/api/admin/health', adminAuth, (req, res) => {
  const mem = process.memoryUsage()
  const load = os.loadavg()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const totalPlayers = Array.from(rooms.values()).reduce((s, r) => s + r.players.size, 0)
  const roomList = Array.from(rooms.entries()).map(([id, r]) => ({
    id, mode: r.mode, players: r.players.size,
    playerList: Array.from(r.players.values()).map(p => ({
      id: p.id, name: p.name, mass: Math.round(p.mass), team: p.team,
      x: Math.round(p.x), y: Math.round(p.y), kills: p.kills
    }))
  }))
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    rooms: rooms.size,
    totalPlayers,
    roomList,
    memory: { used: Math.round(mem.rss / 1024 / 1024), heap: Math.round(mem.heapUsed / 1024 / 1024), total: Math.round(totalMem / 1024 / 1024), free: Math.round(freeMem / 1024 / 1024) },
    cpu: { load1: load[0].toFixed(2), load5: load[1].toFixed(2), cores: os.cpus().length },
    gameConfig: { MERGE_TIME, MERGE_FADE, SPLIT_SPEED }
  })
})

app.get('/api/admin/players', adminAuth, async (req, res) => {
  if (!firebaseDb) return res.json({ players: [] })
  try {
    const snap = await firebaseDb.ref('users').limitToLast(200).once('value')
    const val = snap.val() || {}
    const players = Object.entries(val).map(([uid, data]) => ({
      uid,
      name: data.profile?.name || '?',
      email: data.profile?.email || '',
      color: data.profile?.color || '#6366f1',
      level: data.gameData?.progress?.level || 1,
      xp: data.gameData?.progress?.xp || 0,
      coins: data.gameData?.progress?.coins || 0,
      highScore: data.gameData?.progress?.highScore || 0,
      totalKills: data.gameData?.progress?.totalKills || 0,
      gamesPlayed: data.gameData?.progress?.gamesPlayed || 0,
      premium: data.gameData?.premium?.ownedPackage || 'free',
      banned: !!data.banned,
      banReason: data.banReason || null,
      bannedAt: data.bannedAt || null,
      createdAt: data.profile?.createdAt || null,
      lastSeen: data.profile?.lastSeen || null,
    }))
    res.json({ players })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/ban', adminAuth, async (req, res) => {
  const { uid, reason, duration, adminUid } = req.body
  if (!uid || !firebaseDb) return res.status(400).json({ error: 'uid gerekli' })
  try {
    const banData = { banned: true, banReason: reason || 'Kural ihlali', bannedAt: Date.now(), banDuration: duration || 'permanent' }
    await firebaseDb.ref(`users/${uid}`).update(banData)
    await writeAdminLog('ban', adminUid || 'admin', { uid, reason, duration })
    for (const [, room] of rooms) {
      for (const [, p] of room.players) {
        if (p.id === uid) { io.to(p.socketId).emit('kicked', { reason: 'Hesabın askıya alındı.' }); room.players.delete(uid) }
      }
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/unban', adminAuth, async (req, res) => {
  const { uid, adminUid } = req.body
  if (!uid || !firebaseDb) return res.status(400).json({ error: 'uid gerekli' })
  try {
    await firebaseDb.ref(`users/${uid}`).update({ banned: false, banReason: null, bannedAt: null, banDuration: null })
    await writeAdminLog('unban', adminUid || 'admin', { uid })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/delete-player', adminAuth, async (req, res) => {
  const { uid, adminUid } = req.body
  if (!uid || !firebaseDb) return res.status(400).json({ error: 'uid gerekli' })
  try {
    await firebaseDb.ref(`users/${uid}`).remove()
    if (admin.auth) { try { await admin.auth().deleteUser(uid) } catch {} }
    await writeAdminLog('delete_player', adminUid || 'admin', { uid })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/give-coins', adminAuth, async (req, res) => {
  const { uid, amount, adminUid } = req.body
  if (!uid || !amount || !firebaseDb) return res.status(400).json({ error: 'uid ve amount gerekli' })
  try {
    const snap = await firebaseDb.ref(`users/${uid}/gameData/progress/coins`).once('value')
    const current = snap.val() || 0
    const newTotal = current + Number(amount)
    await firebaseDb.ref(`users/${uid}/gameData/progress/coins`).set(newTotal)
    await writeAdminLog('give_coins', adminUid || 'admin', { uid, amount })
    const socket = [...io.sockets.sockets.values()].find(s => {
      for (const [, r] of rooms) for (const [, p] of r.players) if (p.id === uid && p.socketId === s.id) return true
      return false
    })
    if (socket) socket.emit('coinUpdated', { coins: newTotal })
    res.json({ ok: true, newTotal })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/give-coins-all', adminAuth, async (req, res) => {
  const { amount, adminUid } = req.body
  if (!amount || !firebaseDb) return res.status(400).json({ error: 'amount gerekli' })
  try {
    const snap = await firebaseDb.ref('users').once('value')
    const val = snap.val() || {}
    const updates = {}
    for (const [uid, data] of Object.entries(val)) {
      const current = data.gameData?.progress?.coins || 0
      updates[`users/${uid}/gameData/progress/coins`] = current + Number(amount)
    }
    await firebaseDb.ref().update(updates)
    await writeAdminLog('give_coins_all', adminUid || 'admin', { amount, count: Object.keys(val).length })
    res.json({ ok: true, count: Object.keys(val).length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/set-premium', adminAuth, async (req, res) => {
  const { uid, packageId, adminUid } = req.body
  if (!uid || !packageId || !firebaseDb) return res.status(400).json({ error: 'uid ve packageId gerekli' })
  try {
    await firebaseDb.ref(`users/${uid}/gameData/premium`).update({ ownedPackage: packageId })
    await writeAdminLog('set_premium', adminUid || 'admin', { uid, packageId })
    const socket = [...io.sockets.sockets.values()].find(s => {
      for (const [, r] of rooms) for (const [, p] of r.players) if (p.id === uid && p.socketId === s.id) return true
      return false
    })
    if (socket) socket.emit('premiumUpdated', { ownedPackage: packageId })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/add-cosmetic', adminAuth, async (req, res) => {
  const { uid, type, itemId, adminUid } = req.body
  if (!uid || !type || !itemId || !firebaseDb) return res.status(400).json({ error: 'uid, type, itemId gerekli' })
  try {
    const paths = { frame: 'ownedFrames', nameEffect: 'ownedNameEffects', trail: 'ownedTrailEffects', deathEffect: 'ownedDeathEffects', skin: 'ownedSkins' }
    const path = paths[type]
    if (!path) return res.status(400).json({ error: 'Gecersiz tür' })
    const snap = await firebaseDb.ref(`users/${uid}/gameData/inventory/${path}`).once('value')
    const arr = snap.val() || (type === 'skin' ? ['default'] : [])
    if (!arr.includes(itemId)) {
      arr.push(itemId)
      await firebaseDb.ref(`users/${uid}/gameData/inventory/${path}`).set(arr)
    }
    await writeAdminLog('add_cosmetic', adminUid || 'admin', { uid, type, itemId })
    const socket = [...io.sockets.sockets.values()].find(s => {
      for (const [, r] of rooms) for (const [, p] of r.players) if (p.id === uid && p.socketId === s.id) return true
      return false
    })
    if (socket) socket.emit('cosmeticAdded', { type, itemId, path, arr })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/kick', adminAuth, (req, res) => {
  const { uid, reason } = req.body
  for (const [, room] of rooms) {
    for (const [, p] of room.players) {
      if (p.id === uid) {
        io.to(p.socketId).emit('kicked', { reason: reason || 'Admin tarafından atıldınız.' })
        room.players.delete(uid)
        return res.json({ ok: true })
      }
    }
  }
  res.json({ ok: false, error: 'Oyuncu aktif değil' })
})

app.post('/api/admin/freeze', adminAuth, (req, res) => {
  const { uid, freeze } = req.body
  for (const [, room] of rooms) {
    const p = room.players.get(uid)
    if (p) { p.frozen = freeze ? 999999 : 0; return res.json({ ok: true }) }
  }
  res.json({ ok: false, error: 'Oyuncu aktif değil' })
})

app.post('/api/admin/announce', adminAuth, async (req, res) => {
  const { message, targetUid, type, adminUid } = req.body
  if (!message) return res.status(400).json({ error: 'message gerekli' })
  const payload = { message, type: type || 'info', ts: Date.now() }
  if (targetUid) {
    for (const [, room] of rooms) {
      for (const [, p] of room.players) {
        if (p.id === targetUid) { io.to(p.socketId).emit('serverAnnouncement', payload); break }
      }
    }
  } else {
    io.emit('serverAnnouncement', payload)
  }
  if (firebaseDb) await firebaseDb.ref('announcements').push({ ...payload, adminUid: adminUid || 'admin' })
  await writeAdminLog('announce', adminUid || 'admin', { message, targetUid })
  res.json({ ok: true })
})

const gameConfigOverrides = {}

app.get('/api/admin/config', adminAuth, (req, res) => {
  res.json({ MERGE_TIME, MERGE_FADE, SPLIT_SPEED, ...gameConfigOverrides })
})

app.post('/api/admin/config', adminAuth, async (req, res) => {
  const { key, value, adminUid } = req.body
  const allowed = ['MERGE_TIME', 'MERGE_FADE', 'SPLIT_SPEED', 'MAX_CELLS', 'FOOD_COUNT', 'BOT_COUNT']
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Geçersiz config key' })
  gameConfigOverrides[key] = Number(value)
  await writeAdminLog('config_change', adminUid || 'admin', { key, value })
  res.json({ ok: true, key, value })
})

app.get('/api/admin/logs', adminAuth, async (req, res) => {
  if (!firebaseDb) return res.json({ logs: [] })
  try {
    const snap = await firebaseDb.ref('adminLogs').limitToLast(200).orderByChild('ts').once('value')
    const val = snap.val() || {}
    const logs = Object.entries(val).map(([id, l]) => ({ id, ...l })).sort((a, b) => b.ts - a.ts)
    res.json({ logs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/announcements', adminAuth, async (req, res) => {
  if (!firebaseDb) return res.json({ announcements: [] })
  try {
    const snap = await firebaseDb.ref('announcements').limitToLast(50).once('value')
    const val = snap.val() || {}
    const announcements = Object.entries(val).map(([id, a]) => ({ id, ...a })).sort((a, b) => b.ts - a.ts)
    res.json({ announcements })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/set-role', adminAuth, async (req, res) => {
  const { uid, role, adminUid } = req.body
  if (!uid || !role || !firebaseDb) return res.status(400).json({ error: 'uid ve role gerekli' })
  try {
    await firebaseDb.ref(`adminRoles/${uid}`).set({ role, grantedAt: Date.now(), grantedBy: adminUid || 'admin' })
    await writeAdminLog('set_role', adminUid || 'admin', { uid, role })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/roles', adminAuth, async (req, res) => {
  if (!firebaseDb) return res.json({ roles: {} })
  try {
    const snap = await firebaseDb.ref('adminRoles').once('value')
    res.json({ roles: snap.val() || {} })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  if (!firebaseDb) return res.json({ totalUsers: 0, bannedUsers: 0, premiumUsers: 0 })
  try {
    const snap = await firebaseDb.ref('users').once('value')
    const val = snap.val() || {}
    let totalUsers = 0, bannedUsers = 0, premiumUsers = 0, totalCoins = 0
    for (const data of Object.values(val)) {
      totalUsers++
      if (data.banned) bannedUsers++
      if (data.gameData?.premium?.ownedPackage && data.gameData.premium.ownedPackage !== 'free') premiumUsers++
      totalCoins += data.gameData?.progress?.coins || 0
    }
    res.json({ totalUsers, bannedUsers, premiumUsers, totalCoins, activeRooms: rooms.size, activePlayers: Array.from(rooms.values()).reduce((s, r) => s + r.players.size, 0) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`AGARZ v4 port=${PORT} MERGE_TIME=${MERGE_TIME} MERGE_FADE=${MERGE_FADE} SPLIT_SPEED=${SPLIT_SPEED}`)
})
