import { create } from 'zustand'

export const PREMIUM_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    price: '₺29.99',
    color: '#60a5fa',
    icon: '⭐',
    features: [
      '5 Özel Skin',
      '3 Tema',
      'Reklamsız',
      'Özel İsim Rengi',
      '1.5x XP Boost'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Oyuncu',
    price: '₺79.99',
    color: '#a78bfa',
    icon: '💎',
    popular: true,
    features: [
      '20 Özel Skin',
      'Tüm Temalar',
      'Reklamsız',
      'Animasyonlu İsim',
      '2x XP Boost',
      'Özel Clan Logosu',
      'Öncelikli Sunucu'
    ]
  },
  {
    id: 'god',
    name: 'GOD Mode',
    price: '₺199.99',
    color: '#fbbf24',
    icon: '👑',
    features: [
      'Tüm Skinler',
      'Tüm Temalar',
      'GOD Rozeti',
      '3x XP Boost',
      'Özel Efektler',
      'Clan Kurucusu',
      'Global Chat Rengi',
      'Özel Parçacık Efektleri',
      'VIP Sunucu Erişimi'
    ]
  }
]

export const SKINS = [
  { id: 'default', name: 'Varsayılan', price: 0, color: null, premium: false },
  { id: 'fire', name: 'Ateş', price: 500, icon: '🔥', premium: false },
  { id: 'ice', name: 'Buz', price: 500, icon: '❄️', premium: false },
  { id: 'galaxy', name: 'Galaksi', price: 1000, icon: '🌌', premium: true },
  { id: 'neon', name: 'Neon', price: 1000, icon: '💫', premium: true },
  { id: 'gold', name: 'Altın', price: 2000, icon: '✨', premium: true },
  { id: 'dragon', name: 'Ejderha', price: 3000, icon: '🐉', premium: true },
  { id: 'crown', name: 'Taç', price: 5000, icon: '👑', premium: true },
  { id: 'demon', name: 'Şeytan', price: 5000, icon: '😈', premium: true },
  { id: 'angel', name: 'Melek', price: 5000, icon: '😇', premium: true },
  { id: 'rainbow', name: 'Gökkuşağı', price: 7500, icon: '🌈', premium: true },
  { id: 'dark', name: 'Karanlık', price: 10000, icon: '🌑', premium: true },
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
    let newSkins = get().ownedSkins
    if (packageId === 'pro') newSkins = SKINS.filter(s => !s.premium || s.price <= 2000).map(s => s.id)
    if (packageId === 'god') newSkins = SKINS.map(s => s.id)
    set({ ownedPackage: packageId, ownedSkins: newSkins })
    import('../firebase/syncService').then(({ fbSavePremium }) => {
      import('./useAuthStore').then(({ default: useAuthStore }) => {
        const uid = useAuthStore.getState().user?.uid
        fbSavePremium(uid, { ownedPackage: packageId, ownedSkins: newSkins, coins: get().coins })
      })
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
      import('./useAuthStore').then(({ default: useAuthStore }) => {
        const uid = useAuthStore.getState().user?.uid
        fbSavePremium(uid, { ownedPackage: get().ownedPackage, ownedSkins: newSkins, coins: newCoins })
      })
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
