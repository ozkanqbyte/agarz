import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useProgressStore from './useProgressStore'
import usePremiumStore from './usePremiumStore'
import { authRef } from './authRef'

const FREE_REWARDS = [
  { type: 'coins', value: 100, label: '100 Coin', rarity: 'common', color: '#f59e0b' },
  { type: 'xp', value: 500, label: '500 XP', rarity: 'common', color: '#6366f1' },
  { type: 'coins', value: 200, label: '200 Coin', rarity: 'common', color: '#f59e0b' },
  { type: 'lootbox', value: 1, label: 'Normal Kutu', rarity: 'rare', color: '#818cf8' },
  { type: 'xp', value: 1000, label: '1000 XP', rarity: 'rare', color: '#6366f1' },
  { type: 'coins', value: 350, label: '350 Coin', rarity: 'rare', color: '#f59e0b' },
  { type: 'lootbox', value: 1, label: 'Altin Kutu', rarity: 'epic', color: '#f59e0b' },
  { type: 'xp', value: 2000, label: '2000 XP', rarity: 'epic', color: '#8b5cf6' },
  { type: 'coins', value: 500, label: '500 Coin', rarity: 'epic', color: '#f59e0b' },
  { type: 'lootbox', value: 2, label: '2x Normal Kutu', rarity: 'legendary', color: '#ec4899' },
]

const PREMIUM_REWARDS = [
  { type: 'skin', value: 'fire', label: 'Ates Skin', rarity: 'rare', color: '#ef4444' },
  { type: 'coins', value: 300, label: '300 Coin', rarity: 'common', color: '#f59e0b' },
  { type: 'xpBoost', value: 12, label: 'XP Boost 12s', rarity: 'rare', color: '#22c55e' },
  { type: 'skin', value: 'ice', label: 'Buz Skin', rarity: 'rare', color: '#38bdf8' },
  { type: 'frame', value: 'silver', label: 'Gumus Cerceve', rarity: 'rare', color: '#9ca3af' },
  { type: 'coins', value: 600, label: '600 Coin', rarity: 'rare', color: '#f59e0b' },
  { type: 'skin', value: 'galaxy', label: 'Galaksi Skin', rarity: 'epic', color: '#818cf8' },
  { type: 'lootbox', value: 2, label: '2x Altin Kutu', rarity: 'epic', color: '#f59e0b' },
  { type: 'nameEffect', value: 'glow', label: 'Parlaklik Efekti', rarity: 'epic', color: '#60a5fa' },
  { type: 'frame', value: 'gold', label: 'Altin Cerceve', rarity: 'epic', color: '#f59e0b' },
  { type: 'skin', value: 'neon', label: 'Neon Skin', rarity: 'epic', color: '#a3e635' },
  { type: 'coins', value: 1000, label: '1000 Coin', rarity: 'epic', color: '#f59e0b' },
  { type: 'nameEffect', value: 'fire', label: 'Ates Efekti', rarity: 'legendary', color: '#ef4444' },
  { type: 'skin', value: 'dragon', label: 'Ejderha Skin', rarity: 'legendary', color: '#dc2626' },
  { type: 'frame', value: 'diamond', label: 'Elmas Cerceve', rarity: 'legendary', color: '#38bdf8' },
  { type: 'lootbox', value: 3, label: '3x Efsane Kutu', rarity: 'legendary', color: '#ec4899' },
  { type: 'skill', value: 'speed', label: 'Hizlanma x5', uses: 5, rarity: 'legendary', color: '#fbbf24' },
  { type: 'skin', value: 'crown', label: 'Tac Skin', rarity: 'legendary', color: '#fbbf24' },
  { type: 'nameEffect', value: 'rainbow', label: 'Gokuşagi Efekti', rarity: 'legendary', color: '#ec4899' },
  { type: 'frame', value: 'legendary', label: 'Efsane Cerceve', rarity: 'legendary', color: '#ec4899' },
]

export const BP_TIERS = Array.from({ length: 50 }, (_, i) => {
  const tier = i + 1
  let freeReward = FREE_REWARDS[(tier - 1) % FREE_REWARDS.length]
  if (tier === 10) freeReward = { type: 'lootbox', value: 1, label: 'Altin Kutu', rarity: 'epic', color: '#f59e0b' }
  if (tier === 25) freeReward = { type: 'lootbox', value: 2, label: '2x Efsane Kutu', rarity: 'legendary', color: '#ec4899' }
  if (tier === 50) freeReward = { type: 'coins', value: 2000, label: '2000 Coin', rarity: 'legendary', color: '#fbbf24' }

  let premiumReward = PREMIUM_REWARDS[(tier - 1) % PREMIUM_REWARDS.length]
  if (tier === 25) premiumReward = { type: 'skin', value: 'crystal', label: 'Kristal Skin', rarity: 'legendary', color: '#7df9ff' }
  if (tier === 50) premiumReward = { type: 'skin', value: 'immortal_skin', label: 'IMMORTAL Skin', rarity: 'legendary', color: '#ec4899' }

  return { tier, xpRequired: 1000, freeReward, premiumReward }
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
        while (bpXP >= 1000 && currentTier < 50) {
          bpXP -= 1000
          currentTier++
        }
        if (currentTier >= 50) bpXP = 0
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
        if (reward.type === 'xpBoost') progressStore.activateXpBoost()
        if (reward.type === 'lootbox') {
          for (let i = 0; i < (reward.value || 1); i++) progressStore.addLootBox?.()
        }
        if (reward.type === 'frame') progressStore.addFrame?.(reward.value)
        if (reward.type === 'nameEffect') progressStore.addNameEffect?.(reward.value)
        if (reward.type === 'skill') progressStore.addSkillUnlock?.(reward.value, reward.uses || 3)

        if (type === 'free') {
          set(s => ({ claimedFree: [...s.claimedFree, tier] }))
        } else {
          set(s => ({ claimedPremium: [...s.claimedPremium, tier] }))
        }

        const uid = authRef.uid
        if (uid && !uid.startsWith('guest_')) {
          setTimeout(() => {
            const bpState = get()
            const ps = useProgressStore.getState()
            const pms = usePremiumStore.getState()
            import('../firebase/syncService').then(({ fbSaveBattlePass, fbSaveInventory }) => {
              fbSaveBattlePass(uid, {
                currentTier: bpState.currentTier,
                bpXP: bpState.bpXP,
                isPremium: bpState.isPremium,
                seasonNumber: bpState.seasonNumber,
                claimedFree: bpState.claimedFree,
                claimedPremium: bpState.claimedPremium,
                seasonEnd: bpState.seasonEnd,
              }).catch(() => {})
              fbSaveInventory(uid, {
                ownedFrames: ps.ownedFrames,
                ownedNameEffects: ps.ownedNameEffects,
                ownedSkills: ps.ownedSkills,
                ownedSkins: pms.ownedSkins,
                activeNameEffect: ps.activeNameEffect,
                activeFrame: ps.activeFrame,
                ownedDeathEffects: ps.ownedDeathEffects,
                ownedTrailEffects: ps.ownedTrailEffects,
                activeDeathEffect: ps.activeDeathEffect,
                activeTrailEffect: ps.activeTrailEffect,
              }).catch(() => {})
            }).catch(() => {})
          }, 300)
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
    { name: 'agarz-battlepass-v2' }
  )
)

export default useBattlePassStore
