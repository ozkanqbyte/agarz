import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useProgressStore from './useProgressStore'

export const BP_TIERS = Array.from({ length: 30 }, (_, i) => {
  const tier = i + 1
  const freeRewards = [
    { type: 'coins', value: 50, label: '50 Coin', icon: '💰' },
    { type: 'xp', value: 500, label: '500 XP', icon: '✨' },
    { type: 'coins', value: 100, label: '100 Coin', icon: '💰' },
    { type: 'lootbox', value: 1, label: 'Loot Box', icon: '📦' },
    { type: 'xp', value: 1000, label: '1000 XP', icon: '⭐' },
    { type: 'coins', value: 200, label: '200 Coin', icon: '💰' },
  ]
  const premiumRewards = [
    { type: 'skin', value: 'fire', label: 'Ateş Skin', icon: '🔥' },
    { type: 'coins', value: 200, label: '200 Coin', icon: '💰' },
    { type: 'lootbox', value: 2, label: '2x Loot Box', icon: '📦' },
    { type: 'skin', value: 'ice', label: 'Buz Skin', icon: '❄️' },
    { type: 'frame', value: 'gold', label: 'Altın Çerçeve', icon: '🏅' },
    { type: 'coins', value: 500, label: '500 Coin', icon: '💎' },
    { type: 'skin', value: 'galaxy', label: 'Galaksi Skin', icon: '🌌' },
    { type: 'lootbox', value: 3, label: '3x Loot Box', icon: '📦' },
    { type: 'frame', value: 'diamond', label: 'Elmas Çerçeve', icon: '💠' },
    { type: 'skin', value: 'crown', label: 'Taç Skin', icon: '👑' },
  ]
  return {
    tier,
    xpRequired: 500,
    freeReward: freeRewards[(tier - 1) % freeRewards.length],
    premiumReward: premiumRewards[(tier - 1) % premiumRewards.length],
  }
})

const useBattlePassStore = create(
  persist(
    (set, get) => ({
      currentTier: 0,
      bpXP: 0,
      isPremium: false,
      seasonEnd: null,
      claimedFree: [],
      claimedPremium: [],
      seasonNumber: 1,

      addBPXP: (amount) => {
        const state = get()
        let { bpXP, currentTier } = state
        bpXP += amount
        while (bpXP >= 500 && currentTier < 30) {
          bpXP -= 500
          currentTier++
        }
        if (currentTier >= 30) bpXP = 0
        set({ bpXP, currentTier })
      },

      buyPremium: () => {
        set({
          isPremium: true,
          seasonEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        })
      },

      claimTierReward: (tier, type) => {
        const state = get()
        const { claimedFree, claimedPremium, currentTier, isPremium } = state
        if (tier > currentTier) return false
        if (type === 'free' && claimedFree.includes(tier)) return false
        if (type === 'premium' && (claimedPremium.includes(tier) || !isPremium)) return false

        const tierData = BP_TIERS[tier - 1]
        const reward = type === 'free' ? tierData.freeReward : tierData.premiumReward
        const progressStore = useProgressStore.getState()

        if (reward.type === 'coins') progressStore.addCoins(reward.value)
        if (reward.type === 'xp') progressStore.addXP(reward.value)
        if (reward.type === 'lootbox') {
          for (let i = 0; i < reward.value; i++) progressStore.addLootBox()
        }

        if (type === 'free') {
          set(s => ({ claimedFree: [...s.claimedFree, tier] }))
        } else {
          set(s => ({ claimedPremium: [...s.claimedPremium, tier] }))
        }
        return true
      },

      _hydrate: (data) => {
        if (!data) return
        set(s => ({
          currentTier: Math.max(s.currentTier, data.currentTier ?? 0),
          bpXP: data.bpXP ?? s.bpXP,
          isPremium: data.isPremium || s.isPremium,
          seasonNumber: data.seasonNumber || s.seasonNumber,
          claimedFree: [...new Set([...s.claimedFree, ...(data.claimedFree || [])])],
          claimedPremium: [...new Set([...s.claimedPremium, ...(data.claimedPremium || [])])],
          seasonEnd: data.seasonEnd || s.seasonEnd,
        }))
      },
    }),
    { name: 'agarz-battlepass' }
  )
)

export default useBattlePassStore
