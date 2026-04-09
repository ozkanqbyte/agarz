import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const GOLD_PACKAGES = [
  { id: 'gold_500', name: '500 Gold', amount: 500, price: '₺9.99', bonus: null, icon: '💰', color: '#f59e0b' },
  { id: 'gold_1500', name: '1500 Gold', amount: 1500, price: '₺24.99', bonus: '+200 Bonus', icon: '💎', color: '#a78bfa', popular: true },
  { id: 'gold_5000', name: '5000 Gold', amount: 5000, price: '₺59.99', bonus: '+1000 Bonus', icon: '👑', color: '#ec4899' },
]

export const LUCKY_BOXES = {
  normal: {
    id: 'normal', name: 'Normal Kutu', price: 100, icon: '📦',
    color: '#6366f1', glowColor: '#818cf8',
    gradient: 'linear-gradient(135deg, #312e81, #4338ca)',
    rewards: [
      { type: 'gold', amount: 50, weight: 30, icon: '💰', name: '50 Gold', rarity: 'common' },
      { type: 'gold', amount: 150, weight: 20, icon: '💰', name: '150 Gold', rarity: 'rare' },
      { type: 'xp', amount: 500, weight: 20, icon: '✨', name: '500 XP', rarity: 'common' },
      { type: 'xp', amount: 1500, weight: 10, icon: '⚡', name: '1500 XP', rarity: 'rare' },
      { type: 'nameEffect', id: 'glow', weight: 8, icon: '💫', name: 'Parlaklık Efekti', rarity: 'rare' },
      { type: 'frame', id: 'silver', weight: 7, icon: '🔘', name: 'Gümüş Çerçeve', rarity: 'rare' },
      { type: 'skin', id: 'fire', weight: 3, icon: '🔥', name: 'Ateş Skin', rarity: 'epic' },
      { type: 'lootbox', amount: 1, weight: 2, icon: '📦', name: 'Ekstra Kutu', rarity: 'epic' },
    ]
  },
  gold: {
    id: 'gold', name: 'Altın Kutu', price: 300, icon: '🏆',
    color: '#f59e0b', glowColor: '#fbbf24',
    gradient: 'linear-gradient(135deg, #78350f, #b45309)',
    rewards: [
      { type: 'gold', amount: 200, weight: 20, icon: '💰', name: '200 Gold', rarity: 'rare' },
      { type: 'gold', amount: 500, weight: 15, icon: '💰', name: '500 Gold', rarity: 'epic' },
      { type: 'xpBoost', hours: 24, weight: 15, icon: '⚡', name: 'XP x2 (24 saat)', rarity: 'epic' },
      { type: 'nameEffect', id: 'fire', weight: 12, icon: '🔥', name: 'Ateş İsim Efekti', rarity: 'epic' },
      { type: 'nameEffect', id: 'neon', weight: 10, icon: '💫', name: 'Neon İsim Efekti', rarity: 'epic' },
      { type: 'frame', id: 'gold', weight: 10, icon: '🥇', name: 'Altın Çerçeve', rarity: 'epic' },
      { type: 'skin', id: 'galaxy', weight: 8, icon: '🌌', name: 'Galaksi Skin', rarity: 'legendary' },
      { type: 'godTemp', games: 1, weight: 5, icon: '👑', name: 'Geçici GOD (1 Oyun)', rarity: 'legendary' },
      { type: 'lootbox', amount: 1, weight: 5, icon: '🏆', name: 'Altın Kutu x1', rarity: 'epic' },
    ]
  },
  legendary: {
    id: 'legendary', name: 'Efsane Kutu', price: 800, icon: '💎',
    color: '#ec4899', glowColor: '#f472b6',
    gradient: 'linear-gradient(135deg, #500724, #9f1239)',
    rewards: [
      { type: 'gold', amount: 500, weight: 15, icon: '💰', name: '500 Gold', rarity: 'epic' },
      { type: 'gold', amount: 1200, weight: 10, icon: '💎', name: '1200 Gold', rarity: 'legendary' },
      { type: 'xpBoost', hours: 24, weight: 12, icon: '⚡', name: 'XP x2 (24 saat)', rarity: 'epic' },
      { type: 'nameEffect', id: 'rainbow', weight: 10, icon: '🌈', name: 'Gökkuşağı Efekti', rarity: 'legendary' },
      { type: 'nameEffect', id: 'electric', weight: 10, icon: '⚡', name: 'Elektrik Efekti', rarity: 'legendary' },
      { type: 'nameEffect', id: 'galaxy', weight: 8, icon: '🌌', name: 'Galaksi Efekti', rarity: 'legendary' },
      { type: 'frame', id: 'diamond', weight: 8, icon: '💎', name: 'Elmas Çerçeve', rarity: 'legendary' },
      { type: 'frame', id: 'legendary', weight: 5, icon: '👑', name: 'Efsane Çerçeve', rarity: 'legendary' },
      { type: 'skin', id: 'dragon', weight: 7, icon: '🐉', name: 'Ejderha Skin', rarity: 'legendary' },
      { type: 'skin', id: 'crown', weight: 5, icon: '👑', name: 'Taç Skin', rarity: 'legendary' },
      { type: 'godTemp', games: 3, weight: 5, icon: '👑', name: 'Geçici GOD (3 Oyun)', rarity: 'legendary' },
      { type: 'lootbox', amount: 2, weight: 5, icon: '💎', name: 'Altın Kutu x2', rarity: 'legendary' },
    ]
  }
}

export const NAME_EFFECTS = [
  { id: 'glow', name: 'Parlaklık', icon: '💫', price: 200, color: '#60a5fa' },
  { id: 'fire', name: 'Ateş', icon: '🔥', price: 400, color: '#ef4444' },
  { id: 'neon', name: 'Neon', icon: '🟢', price: 400, color: '#22c55e' },
  { id: 'electric', name: 'Elektrik', icon: '⚡', price: 600, color: '#fbbf24' },
  { id: 'rainbow', name: 'Gökkuşağı', icon: '🌈', price: 800, color: '#ec4899' },
  { id: 'galaxy', name: 'Galaksi', icon: '🌌', price: 1000, color: '#8b5cf6' },
  { id: 'shadow', name: 'Karanlık', icon: '🌑', price: 500, color: '#6b7280' },
  { id: 'crystal', name: 'Kristal', icon: '🔷', price: 700, color: '#38bdf8' },
]

export const FRAMES = [
  { id: 'silver', name: 'Gümüş', icon: '🔘', price: 300, color: '#9ca3af' },
  { id: 'gold', name: 'Altın', icon: '🥇', price: 600, color: '#f59e0b' },
  { id: 'diamond', name: 'Elmas', icon: '💎', price: 1200, color: '#38bdf8' },
  { id: 'legendary', name: 'Efsane', icon: '👑', price: 2000, color: '#ec4899' },
]

export function getRandomReward(boxType) {
  const box = LUCKY_BOXES[boxType]
  if (!box) return null
  const pool = box.rewards
  const total = pool.reduce((s, r) => s + r.weight, 0)
  let rand = Math.random() * total
  for (const reward of pool) {
    rand -= reward.weight
    if (rand <= 0) return reward
  }
  return pool[0]
}

const useShopStore = create(
  persist(
    (set, get) => ({
      openBoxType: null,
      showShopPage: false,
      setShowShopPage: (v) => set({ showShopPage: v }),
      setOpenBoxType: (type) => set({ openBoxType: type }),
    }),
    { name: 'agarz-shop' }
  )
)

export default useShopStore
