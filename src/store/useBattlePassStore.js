import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useProgressStore from './useProgressStore'
import usePremiumStore from './usePremiumStore'
import { authRef } from './authRef'

const FREE_REWARDS = [
  { type: 'gold',       value: 100,   label: '100 Altın',        rarity: 'common',    color: '#f59e0b', icon: '💰' },
  { type: 'xp',         value: 500,   label: '500 XP',           rarity: 'common',    color: '#6366f1', icon: '✨' },
  { type: 'gold',       value: 200,   label: '200 Altın',        rarity: 'common',    color: '#f59e0b', icon: '💰' },
  { type: 'chest',      value: 'bronze', label: 'Bronz Sandık',  rarity: 'rare',      color: '#b45309', icon: '📦' },
  { type: 'xp',         value: 1200,  label: '1200 XP',          rarity: 'rare',      color: '#818cf8', icon: '⚡' },
  { type: 'gold',       value: 400,   label: '400 Altın',        rarity: 'rare',      color: '#f59e0b', icon: '💰' },
  { type: 'nameEffect', value: 'glow',label: 'Parlaklık Efekti', rarity: 'rare',      color: '#60a5fa', icon: '💫' },
  { type: 'chest',      value: 'silver', label: 'Gümüş Sandık', rarity: 'epic',      color: '#94a3b8', icon: '🥈' },
  { type: 'trail',      value: 'sparkle',label:'Parıltı İzi',   rarity: 'epic',      color: '#fbbf24', icon: '✨' },
  { type: 'gold',       value: 600,   label: '600 Altın',        rarity: 'epic',      color: '#f59e0b', icon: '💰' },
]

const PREMIUM_REWARDS = [
  { type: 'skin',       value: 'fire',    label: 'Ateş Skin',         rarity: 'rare',      color: '#ef4444', icon: '🔥' },
  { type: 'gold',       value: 300,       label: '300 Altın',          rarity: 'common',    color: '#f59e0b', icon: '💰' },
  { type: 'xpBoost',    value: 12,        label: 'XP x2 (12 saat)',    rarity: 'rare',      color: '#22c55e', icon: '⚡' },
  { type: 'skin',       value: 'ice',     label: 'Buz Skin',           rarity: 'rare',      color: '#38bdf8', icon: '❄️' },
  { type: 'frame',      value: 'gold',    label: 'Altın Çerçeve',      rarity: 'rare',      color: '#f59e0b', icon: '🔆' },
  { type: 'trail',      value: 'fire',    label: 'Ateş İzi',           rarity: 'epic',      color: '#ef4444', icon: '🔥' },
  { type: 'skin',       value: 'galaxy',  label: 'Galaksi Skin',       rarity: 'epic',      color: '#818cf8', icon: '🌌' },
  { type: 'chest',      value: 'gold',    label: 'Altın Sandık',       rarity: 'epic',      color: '#f59e0b', icon: '🏆' },
  { type: 'nameEffect', value: 'electric',label: 'Elektrik Efekti',    rarity: 'epic',      color: '#fbbf24', icon: '⚡' },
  { type: 'frame',      value: 'diamond', label: 'Elmas Çerçeve',      rarity: 'epic',      color: '#38bdf8', icon: '💎' },
  { type: 'skin',       value: 'neon',    label: 'Neon Skin',          rarity: 'epic',      color: '#a3e635', icon: '💡' },
  { type: 'trail',      value: 'electric',label: 'Elektrik İzi',       rarity: 'epic',      color: '#fbbf24', icon: '⚡' },
  { type: 'nameEffect', value: 'rainbow', label: 'Gökkuşağı Efekti',  rarity: 'legendary', color: '#ec4899', icon: '🌈' },
  { type: 'skin',       value: 'dragon',  label: 'Ejderha Skin',       rarity: 'legendary', color: '#dc2626', icon: '🐉' },
  { type: 'deathEffect',value: 'nova',    label: 'Süpernova Efekti',   rarity: 'legendary', color: '#fbbf24', icon: '🌟' },
  { type: 'chest',      value: 'legendary', label: 'Efsane Sandık',   rarity: 'legendary', color: '#a855f7', icon: '💎' },
  { type: 'trail',      value: 'sakura',  label: 'Sakura İzi',         rarity: 'legendary', color: '#f9a8d4', icon: '🌸' },
  { type: 'skin',       value: 'crown',   label: 'Taç Skin',           rarity: 'legendary', color: '#fbbf24', icon: '👑' },
  { type: 'frame',      value: 'galaxy',  label: 'Galaksi Çerçeve',   rarity: 'legendary', color: '#818cf8', icon: '🌌' },
  { type: 'skin',       value: 'crystal', label: 'Kristal Skin',       rarity: 'mythic',    color: '#7df9ff', icon: '💎' },
]

export const CURRENT_SEASON = {
  number: 1,
  name: 'Sezon 1: Galaksi',
  theme: 'galaxy',
  color: '#818cf8',
  endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
}

export const BP_TIERS = Array.from({ length: 30 }, (_, i) => {
  const tier = i + 1
  let freeReward = FREE_REWARDS[(tier - 1) % FREE_REWARDS.length]
  let premiumReward = PREMIUM_REWARDS[(tier - 1) % PREMIUM_REWARDS.length]

  if (tier === 5)  freeReward    = { type: 'chest',      value: 'silver',   label: 'Gümüş Sandık',     rarity: 'epic',      color: '#94a3b8', icon: '🥈' }
  if (tier === 10) freeReward    = { type: 'chest',      value: 'gold',     label: 'Altın Sandık',      rarity: 'legendary', color: '#f59e0b', icon: '🏆' }
  if (tier === 15) freeReward    = { type: 'nameEffect', value: 'sparkle',  label: 'Parıltı Efekti',    rarity: 'epic',      color: '#fbbf24', icon: '✨' }
  if (tier === 20) freeReward    = { type: 'chest',      value: 'legendary',label: 'Efsane Sandık',     rarity: 'legendary', color: '#a855f7', icon: '💎' }
  if (tier === 25) freeReward    = { type: 'trail',      value: 'ice',      label: 'Buz İzi',           rarity: 'epic',      color: '#38bdf8', icon: '❄️' }
  if (tier === 30) freeReward    = { type: 'gold',       value: 2000,       label: '2000 Altın',        rarity: 'mythic',    color: '#fbbf24', icon: '💰' }

  if (tier === 5)  premiumReward = { type: 'skin',       value: 'cyber',    label: 'Siber Skin',        rarity: 'epic',      color: '#06b6d4', icon: '🤖' }
  if (tier === 10) premiumReward = { type: 'skin',       value: 'sakura',   label: 'Sakura Skin',       rarity: 'legendary', color: '#f9a8d4', icon: '🌸' }
  if (tier === 15) premiumReward = { type: 'frame',      value: 'rainbow',  label: 'Gökkuşağı Çerçeve', rarity: 'legendary', color: '#ec4899', icon: '🌈' }
  if (tier === 20) premiumReward = { type: 'trail',      value: 'galaxy',   label: 'Galaksi İzi',       rarity: 'legendary', color: '#818cf8', icon: '🌌' }
  if (tier === 25) premiumReward = { type: 'skin',       value: 'aurora',   label: 'Aurora Skin',       rarity: 'mythic',    color: '#06b6d4', icon: '🌠' }
  if (tier === 30) premiumReward = { type: 'skin',       value: 'phantom',  label: 'PHANTOM Skin (Sezon Özel)', rarity: 'mythic', color: '#c4b5fd', icon: '👻' }

  return { tier, xpRequired: 1000, freeReward, premiumReward }
})

function applyReward(reward) {
  const ps = useProgressStore.getState()
  const pms = usePremiumStore.getState()
  if (!reward) return
  switch (reward.type) {
    case 'gold':       ps.addCoins(reward.value); break
    case 'xp':         ps.addXP(reward.value); break
    case 'xpBoost':    ps.activateXpBoost(); break
    case 'chest':      ps.addLootBox?.(); break
    case 'frame':      ps.addFrame?.(reward.value); break
    case 'nameEffect': ps.addNameEffect?.(reward.value); break
    case 'trail':      ps.addTrailEffect?.(reward.value); break
    case 'deathEffect':ps.addDeathEffect?.(reward.value); break
    case 'skin':       pms.addSkin?.(reward.value); break
    case 'skill':      ps.addSkillUnlock?.(reward.value, reward.uses || 3); break
    default: break
  }
}

const useBattlePassStore = create(
  persist(
    (set, get) => ({
      currentTier: 0,
      bpXP: 0,
      isPremium: false,
      seasonEnd: CURRENT_SEASON.endDate,
      claimedFree: [],
      claimedPremium: [],
      seasonNumber: CURRENT_SEASON.number,

      addBPXP: (amount) => {
        const state = get()
        let { bpXP, currentTier } = state
        bpXP += amount
        while (bpXP >= 1000 && currentTier < 30) {
          bpXP -= 1000
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
        applyReward(reward)

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
        if (data.seasonNumber && data.seasonNumber !== CURRENT_SEASON.number) {
          set({
            currentTier: 0, bpXP: 0,
            claimedFree: [], claimedPremium: [],
            isPremium: false,
            seasonNumber: CURRENT_SEASON.number,
            seasonEnd: CURRENT_SEASON.endDate,
          })
          return
        }
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
    { name: 'agarz-battlepass-v3' }
  )
)

export default useBattlePassStore
