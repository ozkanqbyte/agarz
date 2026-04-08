import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

      addXP: (amount) => {
        const state = get()
        let { xp, level, prestige, totalXP } = state
        xp += amount
        totalXP += amount
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
        set({ xp, level, prestige: newPrestige, totalXP })
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
    }),
    { name: 'agarz-progress' }
  )
)

export default useProgressStore
