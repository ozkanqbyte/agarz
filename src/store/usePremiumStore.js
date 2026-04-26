import { create } from 'zustand'
import { authRef } from './authRef'

export const PREMIUM_PACKAGES = [
  {
    id: 'starter', name: 'Başlangıç', icon: '🚀', price: '₺24.99', color: '#34d399', tier: 1,
    features: ['5 Özel Skin', 'Gümüş Çerçeve', 'Parlaklık İsim Efekti', '1.5x XP Boost', '2× Gümüş Sandık']
  },
  {
    id: 'player', name: 'Oyuncu', icon: '🎮', price: '₺49.99', color: '#a78bfa', tier: 2,
    features: ['12 Özel Skin', 'Altın Çerçeve', 'Ateş İsim Efekti', 'Parıltı İzi', '1.8x XP Boost', '1× Altın Sandık']
  },
  {
    id: 'pro', name: 'Pro', icon: '⚡', price: '₺79.99', color: '#818cf8', tier: 3, popular: true,
    features: ['20 Özel Skin', 'Elmas Çerçeve', 'Elektrik İsim Efekti', 'Ateş İzi', '2x XP Boost', '2× Altın Sandık', 'Özel Fotoğraf Yükleme']
  },
  {
    id: 'elite', name: 'Elite', icon: '🔥', price: '₺119.99', color: '#f472b6', tier: 4,
    features: ['30 Özel Skin', 'Gökkuşağı Çerçeve', 'Gökkuşağı İsim Efekti', 'Elektrik İzi', '2.5x XP Boost', '1× Efsane Sandık', 'Özel Fotoğraf Yükleme', 'Katil Unvanı']
  },
  {
    id: 'champion', name: 'Şampiyon', icon: '🏆', price: '₺149.99', color: '#fb923c', tier: 5,
    features: ['40 Özel Skin', 'Galaksi Çerçeve', 'Galaksi İsim Efekti', 'Galaksi İzi', 'Süpernova Ölüm Efekti', '3x XP Boost', '1× Premium Sandık', 'Özel Fotoğraf Yükleme', 'Şampiyon Unvanı']
  },
  {
    id: 'master', name: 'Master', icon: '💫', price: '₺199.99', color: '#e879f9', tier: 6,
    features: ['50 Özel Skin', 'Tüm Çerçeveler', 'Aurora İsim Efekti', 'Aurora İzi', 'Portal Ölüm Efekti', '3x XP Boost', '2× Premium Sandık', 'Özel Fotoğraf Yükleme', 'Yırtıcı Unvanı']
  },
  {
    id: 'legend', name: 'Efsane', icon: '⭐', price: '₺279.99', color: '#fbbf24', tier: 7,
    features: ['Tüm Skinler', 'Tüm Çerçeveler', 'Boşluk İsim Efekti', 'Boşluk İzi', 'Boşluğa Ölüm Efekti', '4x XP Boost', '3× Premium Sandık', 'Özel Fotoğraf Yükleme', 'Efsane Rozet', 'Tüm Unvanlar']
  },
  {
    id: 'immortal', name: 'IMMORTAL', icon: '👁️', price: '₺449.99', color: '#ec4899', tier: 8, exclusive: true,
    features: ['Her Şey Dahil', 'IMMORTAL Rozeti (Benzersiz)', 'Hayalet İsim Efekti', 'Aurora İzi', 'Sınırsız Beceri Kullanımı', '5x XP Boost', '5× Premium Sandık', 'Öncelikli Destek', 'Tüm Unvanlar + Ölümsüz']
  },
]

export const SKINS = [
  { id: 'default',    name: 'Varsayılan',  icon: '⬤',  rarity: 'common',    price: 0,     color: '#6366f1', premium: false, tier: 0 },
  { id: 'steel',      name: 'Çelik',       icon: '🔩',  rarity: 'common',    price: 150,   color: '#94a3b8', premium: false, tier: 1 },
  { id: 'forest',     name: 'Orman',       icon: '🌿',  rarity: 'common',    price: 200,   color: '#22c55e', premium: false, tier: 1 },
  { id: 'ocean',      name: 'Okyanus',     icon: '🌊',  rarity: 'common',    price: 200,   color: '#0ea5e9', premium: false, tier: 1 },
  { id: 'sand',       name: 'Kum',         icon: '🏜️',  rarity: 'common',    price: 200,   color: '#d97706', premium: false, tier: 1 },
  { id: 'fire',       name: 'Ateş',        icon: '🔥',  rarity: 'rare',      price: 400,   color: '#ef4444', premium: false, tier: 2 },
  { id: 'ice',        name: 'Buz',         icon: '❄️',  rarity: 'rare',      price: 400,   color: '#38bdf8', premium: false, tier: 2 },
  { id: 'plasma',     name: 'Plazma',      icon: '⚡',  rarity: 'rare',      price: 500,   color: '#8b5cf6', premium: false, tier: 2 },
  { id: 'toxic',      name: 'Zehir',       icon: '☠️',  rarity: 'rare',      price: 500,   color: '#84cc16', premium: false, tier: 2 },
  { id: 'neon',       name: 'Neon',        icon: '💡',  rarity: 'epic',      price: 1000,  color: '#a3e635', premium: true,  tier: 3 },
  { id: 'galaxy',     name: 'Galaksi',     icon: '🌌',  rarity: 'epic',      price: 1200,  color: '#818cf8', premium: true,  tier: 3 },
  { id: 'lava',       name: 'Lav',         icon: '🌋',  rarity: 'epic',      price: 1200,  color: '#f97316', premium: true,  tier: 3 },
  { id: 'shadow',     name: 'Gölge',       icon: '🌑',  rarity: 'epic',      price: 1500,  color: '#4b5563', premium: true,  tier: 3 },
  { id: 'cyber',      name: 'Siber',       icon: '🤖',  rarity: 'epic',      price: 1800,  color: '#06b6d4', premium: true,  tier: 3 },
  { id: 'sakura',     name: 'Sakura',      icon: '🌸',  rarity: 'legendary', price: 2500,  color: '#f9a8d4', premium: true,  tier: 4 },
  { id: 'gold',       name: 'Altın',       icon: '💛',  rarity: 'legendary', price: 2500,  color: '#fbbf24', premium: true,  tier: 4 },
  { id: 'dragon',     name: 'Ejderha',     icon: '🐉',  rarity: 'legendary', price: 3500,  color: '#dc2626', premium: true,  tier: 4 },
  { id: 'void',       name: 'Void',        icon: '🕳️', rarity: 'legendary', price: 4000,  color: '#7c3aed', premium: true,  tier: 4 },
  { id: 'crown',      name: 'Taç',         icon: '👑',  rarity: 'legendary', price: 5000,  color: '#fbbf24', premium: true,  tier: 5 },
  { id: 'demon',      name: 'Şeytan',      icon: '😈',  rarity: 'legendary', price: 5000,  color: '#dc2626', premium: true,  tier: 5 },
  { id: 'angel',      name: 'Melek',       icon: '😇',  rarity: 'legendary', price: 5000,  color: '#fef9c3', premium: true,  tier: 5 },
  { id: 'rainbow',    name: 'Gökkuşağı',   icon: '🌈',  rarity: 'mythic',    price: 7500,  color: '#ec4899', premium: true,  tier: 6 },
  { id: 'crystal',    name: 'Kristal',     icon: '💎',  rarity: 'mythic',    price: 8000,  color: '#7df9ff', premium: true,  tier: 6 },
  { id: 'aurora',     name: 'Aurora',      icon: '🌠',  rarity: 'mythic',    price: 9000,  color: '#06b6d4', premium: true,  tier: 6 },
  { id: 'phantom',    name: 'Hayalet',     icon: '👻',  rarity: 'mythic',    price: 10000, color: '#c4b5fd', premium: true,  tier: 6 },
  { id: 'immortal_skin', name: 'IMMORTAL', icon: '🏆',  rarity: 'mythic',    price: 0,     color: '#ec4899', premium: true,  tier: 7, exclusive: true },
]

const usePremiumStore = create((set, get) => ({
  ownedSkins: ['default'],
  ownedPackage: 'free',
  customSkinUrl: null,
  showShop: false,

  setShowShop: (v) => set({ showShop: v }),
  setOwnedPackage: (pkg) => set({ ownedPackage: pkg }),
  setCustomSkinUrl: (url) => {
    set({ customSkinUrl: url })
    const uid = authRef.uid
    if (uid && !uid.startsWith('guest_')) {
      import('../firebase/syncService').then(({ fbSavePremium }) => {
        fbSavePremium(uid, { ...get(), customSkinUrl: url }).catch(() => {})
      }).catch(() => {})
    }
  },

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
      fbSavePremium(authRef.uid, { ownedPackage: packageId, ownedSkins: newSkins })
    }).catch(() => {})
    return { success: true }
  },

  mockPurchaseSkin: (skinId) => {
    const { ownedSkins } = get()
    const skin = SKINS.find(s => s.id === skinId)
    if (!skin || ownedSkins.includes(skinId)) return { success: false, error: 'Zaten sahipsin' }
    const { useProgressStore } = require('./useProgressStore')
    const ps = useProgressStore?.getState?.()
    if (!ps) return { success: false, error: 'Store hatası' }
    if (!ps.spendCoins(skin.price)) return { success: false, error: 'Yetersiz altın' }
    const newSkins = [...ownedSkins, skinId]
    set({ ownedSkins: newSkins })
    import('../firebase/syncService').then(({ fbSavePremium }) => {
      fbSavePremium(authRef.uid, { ownedPackage: get().ownedPackage, ownedSkins: newSkins })
    }).catch(() => {})
    return { success: true }
  },

  addSkin: (skinId) => set(s => ({ ownedSkins: [...new Set([...s.ownedSkins, skinId])] })),

  canUploadCustomSkin: () => {
    const pkg = get().ownedPackage
    const pro = PREMIUM_PACKAGES.find(p => p.id === pkg)
    return pro ? pro.tier >= 3 : false
  },

  _hydrate: (data) => {
    if (!data) return
    set(s => ({
      ownedPackage: data.ownedPackage || s.ownedPackage,
      ownedSkins: data.ownedSkins?.length ? [...new Set([...s.ownedSkins, ...data.ownedSkins])] : s.ownedSkins,
      customSkinUrl: data.customSkinUrl || s.customSkinUrl,
    }))
  },
}))

export default usePremiumStore
