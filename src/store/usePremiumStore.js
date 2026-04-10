import { create } from 'zustand'
import { authRef } from './authRef'

export const PREMIUM_PACKAGES = [
  {
    id: 'trial',
    name: 'Deneme Paketi',
    price: '₺9.99',
    color: '#60a5fa',
    tier: 1,
    features: ['3 Özel Skin', 'Reklamsız (7 gün)', '1.2x XP Boost']
  },
  {
    id: 'starter',
    name: 'Starter Pack',
    price: '₺24.99',
    color: '#34d399',
    tier: 2,
    features: ['8 Özel Skin', '3 Tema', 'Reklamsız', 'Gümüş Çerçeve', '1.5x XP Boost']
  },
  {
    id: 'player',
    name: 'Oyuncu Paketi',
    price: '₺49.99',
    color: '#a78bfa',
    tier: 3,
    features: ['15 Özel Skin', '5 Tema', 'Reklamsız', 'Altın Çerçeve', 'Parlaklık İsim Efekti', '1.8x XP Boost']
  },
  {
    id: 'pro',
    name: 'Pro Oyuncu',
    price: '₺79.99',
    color: '#818cf8',
    popular: true,
    tier: 4,
    features: ['25 Özel Skin', 'Tüm Temalar', 'Reklamsız', 'Elmas Çerçeve', 'Neon İsim Efekti', '2x XP Boost', 'Özel Klan Logosu']
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '₺119.99',
    color: '#f472b6',
    tier: 5,
    features: ['35 Özel Skin', 'Tüm Temalar', 'Ateş İsim Efekti', 'Özel Parçacık', '2.5x XP Boost', 'VIP Lobi']
  },
  {
    id: 'champion',
    name: 'Şampiyon',
    price: '₺149.99',
    color: '#fb923c',
    tier: 6,
    features: ['45 Özel Skin', 'Efsane Çerçeve', 'Galaxy İsim Efekti', '3x XP Boost', 'Özel Skor Efekti', 'Özel Ölüm Animasyonu']
  },
  {
    id: 'master',
    name: 'Master',
    price: '₺179.99',
    color: '#e879f9',
    tier: 7,
    features: ['Tüm Skinler', 'Tüm Çerçeveler', 'Gökkuşağı İsim Efekti', '3x XP Boost', 'Özel Bölünme Efekti', 'Global Sıralama Rozeti']
  },
  {
    id: 'legend',
    name: 'Efsane',
    price: '₺229.99',
    color: '#fbbf24',
    tier: 8,
    features: ['Tüm Skinler', 'Tüm Çerçeveler', 'Tüm İsim Efektleri', 'Elektrik Efekti', '4x XP Boost', 'Efsane Rozet', 'Özel Chat Rengi', '6 Yetenek — Oyun Basina 3x Kullanim']
  },
  {
    id: 'apex',
    name: 'APEX',
    price: '₺299.99',
    color: '#f59e0b',
    tier: 9,
    bestValue: true,
    features: ['Her Şey Dahil', 'APEX Rozeti', 'Kristal İsim Efekti', '5x XP Boost', 'Özel Ses Paketi', 'VIP Sunucu', 'Klan Kurucusu', '6 Yetenek — Oyun Basina 5x Kullanim']
  },
  {
    id: 'immortal',
    name: 'IMMORTAL',
    price: '₺449.99',
    color: '#ec4899',
    tier: 10,
    features: ['Her Şey Dahil', 'IMMORTAL Rozeti (Benzersiz)', 'Tüm Efektler Kombine', '10x XP Boost', 'Özel Harita Rengi', 'Öncelikli Destek', 'Özel Sunucu Erişimi', '6 Yetenek — SINIRSI Kullanim']
  },
]

export const SKINS = [
  { id: 'default',   name: 'Varsayılan',  price: 0,     color: '#6366f1', premium: false, tier: 0 },
  { id: 'steel',     name: 'Çelik',       price: 200,   color: '#94a3b8', premium: false, tier: 1 },
  { id: 'fire',      name: 'Ateş',        price: 400,   color: '#ef4444', premium: false, tier: 1 },
  { id: 'ice',       name: 'Buz',         price: 400,   color: '#38bdf8', premium: false, tier: 1 },
  { id: 'forest',    name: 'Orman',       price: 600,   color: '#22c55e', premium: false, tier: 2 },
  { id: 'plasma',    name: 'Plazma',      price: 800,   color: '#8b5cf6', premium: false, tier: 2 },
  { id: 'neon',      name: 'Neon',        price: 1000,  color: '#a3e635', premium: true,  tier: 3 },
  { id: 'galaxy',    name: 'Galaksi',     price: 1200,  color: '#818cf8', premium: true,  tier: 3 },
  { id: 'toxic',     name: 'Zehir',       price: 1200,  color: '#84cc16', premium: true,  tier: 3 },
  { id: 'lava',      name: 'Lav',         price: 1500,  color: '#f97316', premium: true,  tier: 4 },
  { id: 'gold',      name: 'Altın',       price: 2000,  color: '#fbbf24', premium: true,  tier: 4 },
  { id: 'shadow',    name: 'Gölge',       price: 2000,  color: '#1e1b4b', premium: true,  tier: 4 },
  { id: 'sakura',    name: 'Sakura',      price: 2500,  color: '#f9a8d4', premium: true,  tier: 5 },
  { id: 'cyber',     name: 'Siber',       price: 3000,  color: '#06b6d4', premium: true,  tier: 5 },
  { id: 'dragon',    name: 'Ejderha',     price: 3500,  color: '#dc2626', premium: true,  tier: 6 },
  { id: 'void',      name: 'Void',        price: 4000,  color: '#1e1b4b', premium: true,  tier: 6 },
  { id: 'crown',     name: 'Taç',         price: 5000,  color: '#fbbf24', premium: true,  tier: 7 },
  { id: 'demon',     name: 'Şeytan',      price: 5000,  color: '#7f1d1d', premium: true,  tier: 7 },
  { id: 'angel',     name: 'Melek',       price: 5000,  color: '#fef9c3', premium: true,  tier: 7 },
  { id: 'rainbow',   name: 'Gökkuşağı',   price: 7500,  color: '#ec4899', premium: true,  tier: 8 },
  { id: 'crystal',   name: 'Kristal',     price: 8000,  color: '#7df9ff', premium: true,  tier: 8 },
  { id: 'dark',      name: 'Karanlık',    price: 10000, color: '#0f0f0f', premium: true,  tier: 9 },
  { id: 'apex_skin', name: 'APEX',        price: 15000, color: '#f59e0b', premium: true,  tier: 10 },
  { id: 'immortal_skin', name: 'IMMORTAL',price: 0,     color: '#ec4899', premium: true,  tier: 10, exclusive: true },
]

const usePremiumStore = create((set, get) => ({
  ownedSkins: ['default'],
  ownedPackage: 'free',
  coins: 0,
  showShop: false,

  setShowShop: (v) => set({ showShop: v }),
  setOwnedPackage: (pkg) => set({ ownedPackage: pkg }),
  setCoins: (coins) => set({ coins }),

  mockPurchasePackage: (packageId) => {
    const pkg = PREMIUM_PACKAGES.find(p => p.id === packageId)
    const tier = pkg?.tier || 0
    const existingSkins = get().ownedSkins
    const newSkins = [...new Set([
      ...existingSkins,
      ...SKINS.filter(s => s.tier <= tier && !s.exclusive).map(s => s.id)
    ])]
    set({ ownedPackage: packageId, ownedSkins: newSkins })
    import('../firebase/syncService').then(({ fbSavePremium }) => {
      fbSavePremium(authRef.uid, { ownedPackage: packageId, ownedSkins: newSkins, coins: get().coins })
    }).catch(() => {})
    return { success: true }
  },

  mockPurchaseSkin: (skinId) => {
    const { ownedSkins, coins } = get()
    const skin = SKINS.find(s => s.id === skinId)
    if (!skin || ownedSkins.includes(skinId)) return { success: false, error: 'Zaten sahipsin' }
    if (coins < skin.price) return { success: false, error: 'Yetersiz coin' }
    const newSkins = [...ownedSkins, skinId]
    const newCoins = coins - skin.price
    set({ ownedSkins: newSkins, coins: newCoins })
    import('../firebase/syncService').then(({ fbSavePremium }) => {
      fbSavePremium(authRef.uid, { ownedPackage: get().ownedPackage, ownedSkins: newSkins, coins: newCoins })
    }).catch(() => {})
    return { success: true }
  },

  addCoins: (amount) => set(s => ({ coins: s.coins + amount })),

  _hydrate: (data) => {
    if (!data) return
    set(s => ({
      ownedPackage: data.ownedPackage || s.ownedPackage,
      ownedSkins: data.ownedSkins?.length ? [...new Set([...s.ownedSkins, ...data.ownedSkins])] : s.ownedSkins,
      coins: Math.max(s.coins, data.coins ?? 0),
    }))
  },
}))

export default usePremiumStore
