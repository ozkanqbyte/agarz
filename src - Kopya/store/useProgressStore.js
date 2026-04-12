import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const XP_BOOST_HOURS = 24

export const BADGES = [
  { id: 'first_kill', name: 'İlk Kan', desc: 'İlk düşmanını ye', icon: '🗡️', rarity: 'common', condition: (s) => s.totalKills >= 1 },
  { id: 'kill_10', name: 'Avcı', desc: '10 düşman ye', icon: '⚔️', rarity: 'common', condition: (s) => s.totalKills >= 10 },
  { id: 'kill_50', name: 'Savaşçı', desc: '50 düşman ye', icon: '🔥', rarity: 'rare', condition: (s) => s.totalKills >= 50 },
  { id: 'kill_100', name: 'Katil', desc: '100 düşman ye', icon: '💀', rarity: 'rare', condition: (s) => s.totalKills >= 100 },
  { id: 'mass_hunter', name: 'Kütle Avcısı', desc: '1000 düşman ye', icon: '🍽️', rarity: 'legendary', condition: (s) => s.totalKills >= 1000 },
  { id: 'immortal', name: 'Ölümsüz', desc: '30 dk ölmeden oyna', icon: '💎', rarity: 'epic', condition: (s) => s.totalPlayTime >= 1800 },
  { id: 'virus_hunter', name: 'Diken Avcısı', desc: '50 diken ye', icon: '🌿', rarity: 'rare', condition: (s) => s.totalViruses >= 50 },
  { id: 'legend', name: 'Efsane', desc: 'Prestige kazan', icon: '🌟', rarity: 'legendary', condition: (s) => s.prestige >= 1 },
  { id: 'high_scorer', name: 'Şampiyon', desc: '10000 skora ulaş', icon: '👑', rarity: 'epic', condition: (s) => s.highScore >= 10000 },
  { id: 'veteran', name: 'Veteran', desc: '100 oyun oyna', icon: '🎖️', rarity: 'rare', condition: (s) => s.gamesPlayed >= 100 },
  { id: 'level_10', name: 'Acemi Değil', desc: 'Seviye 10\'a ulaş', icon: '⭐', rarity: 'common', condition: (s) => s.level >= 10 },
  { id: 'level_50', name: 'Uzman', desc: 'Seviye 50\'ye ulaş', icon: '🏅', rarity: 'epic', condition: (s) => s.level >= 50 },
]

export const xpForLevel = (level) => Math.floor(150 * Math.pow(1.18, level - 1))

const useProgressStore = create(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      prestige: 0,
      totalXP: 0,
      coins: 0,
      totalKills: 0,
      highScore: 0,
      gamesPlayed: 0,
      totalViruses: 0,
      totalPlayTime: 0,
      earnedBadges: [],
      pendingLootBoxes: 0,
      pendingGodGames: 0,
      ownedFrames: [],
      pendingBoosts: [],
      xpBoostEndTime: 0,
      lastDailyLogin: 0,
      dailyStreak: 0,
      ownedNameEffects: [],
      activeNameEffect: null,
      activeFrame: null,
      ownedSkills: {},
      ownedDeathEffects: [],
      activeDeathEffect: null,
      ownedTrailEffects: [],
      activeTrailEffect: null,

      isXpBoostActive: () => Date.now() < get().xpBoostEndTime,
      activateXpBoost: () => set({ xpBoostEndTime: Date.now() + XP_BOOST_HOURS * 3600 * 1000 }),
      xpBoostRemaining: () => Math.max(0, get().xpBoostEndTime - Date.now()),

      addNameEffect: (effectId) => set(s => ({ ownedNameEffects: [...new Set([...s.ownedNameEffects, effectId])] })),
      addDeathEffect: (effectId) => set(s => ({ ownedDeathEffects: [...new Set([...s.ownedDeathEffects, effectId])] })),
      addTrailEffect: (effectId) => set(s => ({ ownedTrailEffects: [...new Set([...s.ownedTrailEffects, effectId])] })),
      setActiveDeathEffect: (effectId) => set({ activeDeathEffect: effectId }),
      setActiveTrailEffect: (effectId) => set({ activeTrailEffect: effectId }),
      addSkillUnlock: (skillId, uses = 2) => set(s => ({ ownedSkills: { ...s.ownedSkills, [skillId]: (s.ownedSkills[skillId] || 0) + uses } })),
      consumeSkillUses: (skillId, count = 1) => set(s => ({ ownedSkills: { ...s.ownedSkills, [skillId]: Math.max(0, (s.ownedSkills[skillId] || 0) - count) } })),
      setActiveNameEffect: (effectId) => set({ activeNameEffect: effectId }),
      setActiveFrame: (frameId) => set({ activeFrame: frameId }),

      claimDailyLogin: () => {
        const now = Date.now()
        const last = get().lastDailyLogin
        const oneDayMs = 86400000
        const twoDaysMs = 172800000
        if (now - last < oneDayMs) return null
        const streak = now - last < twoDaysMs ? get().dailyStreak + 1 : 1
        const goldReward = Math.min(10 * streak, 100)
        set(s => ({ lastDailyLogin: now, dailyStreak: streak, coins: s.coins + goldReward }))
        return { streak, goldReward }
      },

      addGoldForFood: () => set(s => ({ coins: s.coins + 1 })),
      addGoldForKill: () => set(s => ({ coins: s.coins + 50 })),
      addGoldForGame: (score) => set(s => ({ coins: s.coins + Math.floor(score / 10) })),

      addXP: (amount) => {
        const state = get()
        const boosted = Date.now() < state.xpBoostEndTime
        const finalAmount = boosted ? amount * 2 : amount
        let { xp, level, prestige, totalXP } = state
        xp += finalAmount
        totalXP += finalAmount
        let leveledUp = false
        let newLevel = level
        let newPrestige = prestige
        while (true) {
          const req = xpForLevel(level)
          if (xp >= req) {
            xp -= req
            level++
            leveledUp = true
            newLevel = level
            if (level > 100) {
              level = 1
              newPrestige++
              xp = 0
            }
          } else break
        }
        if (leveledUp) {
          const goldBonus = newLevel * 5
          set(s => ({ xp, level, prestige: newPrestige, totalXP, coins: s.coins + goldBonus }))
        } else {
          set({ xp, level, prestige: newPrestige, totalXP })
        }
        return { leveledUp, newLevel, prestige: newPrestige }
      },

      addKill: () => set(s => ({ totalKills: s.totalKills + 1 })),
      addCoins: (n) => set(s => ({ coins: s.coins + n })),
      spendCoins: (n) => {
        const { coins } = get()
        if (coins < n) return false
        set(s => ({ coins: s.coins - n }))
        return true
      },
      addVirus: () => set(s => ({ totalViruses: s.totalViruses + 1 })),
      updateHighScore: (score) => set(s => ({ highScore: Math.max(s.highScore, score) })),
      addPlayTime: (secs) => set(s => ({ totalPlayTime: s.totalPlayTime + secs })),
      addLootBox: () => set(s => ({ pendingLootBoxes: s.pendingLootBoxes + 1 })),
      useLootBox: () => {
        const { pendingLootBoxes } = get()
        if (pendingLootBoxes <= 0) return false
        set(s => ({ pendingLootBoxes: s.pendingLootBoxes - 1 }))
        return true
      },
      incrementGames: () => set(s => ({ gamesPlayed: s.gamesPlayed + 1 })),
      addPendingGod: (count = 1) => set(s => ({ pendingGodGames: s.pendingGodGames + count })),
      usePendingGod: () => {
        if (get().pendingGodGames <= 0) return false
        set(s => ({ pendingGodGames: s.pendingGodGames - 1 }))
        return true
      },
      addFrame: (frame) => set(s => ({ ownedFrames: [...new Set([...s.ownedFrames, frame])] })),
      addBoost: (boostType) => set(s => ({ pendingBoosts: [...s.pendingBoosts, { type: boostType, addedAt: Date.now() }] })),
      useBoost: () => {
        const { pendingBoosts } = get()
        if (!pendingBoosts.length) return null
        const boost = pendingBoosts[0]
        set(s => ({ pendingBoosts: s.pendingBoosts.slice(1) }))
        return boost
      },

      checkBadges: () => {
        const state = get()
        const newBadges = []
        for (const badge of BADGES) {
          if (!state.earnedBadges.includes(badge.id) && badge.condition(state)) {
            newBadges.push(badge)
          }
        }
        if (newBadges.length > 0) {
          set(s => ({ earnedBadges: [...s.earnedBadges, ...newBadges.map(b => b.id)] }))
        }
        return newBadges
      },

      _hydrate: (data) => {
        if (!data) return
        set(s => ({
          xp: data.xp ?? s.xp,
          level: data.level ?? s.level,
          prestige: data.prestige ?? s.prestige,
          totalXP: data.totalXP ?? s.totalXP,
          coins: data.coins != null ? Math.min(Math.max(s.coins, data.coins), data.coins * 2 + 500) : s.coins,
          totalKills: Math.max(s.totalKills, data.totalKills ?? 0),
          highScore: Math.max(s.highScore, data.highScore ?? 0),
          gamesPlayed: Math.max(s.gamesPlayed, data.gamesPlayed ?? 0),
          totalViruses: Math.max(s.totalViruses, data.totalViruses ?? 0),
          totalPlayTime: Math.max(s.totalPlayTime, data.totalPlayTime ?? 0),
          earnedBadges: [...new Set([...s.earnedBadges, ...(data.earnedBadges || [])])],
          pendingLootBoxes: Math.max(s.pendingLootBoxes, data.pendingLootBoxes ?? 0),
        }))
      },

      _hydrateInventory: (data) => {
        if (!data) return
        set(s => ({
          ownedFrames: [...new Set([...s.ownedFrames, ...(data.ownedFrames || [])])],
          ownedNameEffects: [...new Set([...s.ownedNameEffects, ...(data.ownedNameEffects || [])])],
          ownedSkills: (() => {
            const merged = { ...s.ownedSkills }
            for (const [k, v] of Object.entries(data.ownedSkills || {})) {
              merged[k] = Math.max(merged[k] || 0, v || 0)
            }
            return merged
          })(),
          activeNameEffect: data.activeNameEffect || s.activeNameEffect,
          activeFrame: data.activeFrame || s.activeFrame,
          ownedDeathEffects: [...new Set([...s.ownedDeathEffects, ...(data.ownedDeathEffects || [])])],
          ownedTrailEffects: [...new Set([...s.ownedTrailEffects, ...(data.ownedTrailEffects || [])])],
          activeDeathEffect: data.activeDeathEffect || s.activeDeathEffect,
          activeTrailEffect: data.activeTrailEffect || s.activeTrailEffect,
        }))
      },
    }),
    { name: 'agarz-progress' }
  )
)

export default useProgressStore
