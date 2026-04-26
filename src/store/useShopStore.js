import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const RARITY = {
  common:    { label: 'Yaygın',    color: '#94a3b8', glow: '148,163,184', bg: 'rgba(148,163,184,0.12)' },
  rare:      { label: 'Nadir',     color: '#22c55e', glow: '34,197,94',   bg: 'rgba(34,197,94,0.12)'   },
  epic:      { label: 'Epik',      color: '#818cf8', glow: '129,140,248', bg: 'rgba(129,140,248,0.14)' },
  legendary: { label: 'Efsanevi', color: '#f59e0b', glow: '245,158,11',  bg: 'rgba(245,158,11,0.14)'  },
  mythic:    { label: 'Mitik',     color: '#ec4899', glow: '236,72,153',  bg: 'rgba(236,72,153,0.16)'  },
}

export const GOLD_PACKAGES = [
  { id: 'gold_500',   name: '500 Altın',   amount: 500,   price: '₺9.99',  bonus: null,          icon: '💰', color: '#f59e0b' },
  { id: 'gold_1500',  name: '1500 Altın',  amount: 1500,  price: '₺24.99', bonus: '+300 Bonus',  icon: '💎', color: '#a78bfa', popular: true },
  { id: 'gold_5000',  name: '5000 Altın',  amount: 5000,  price: '₺59.99', bonus: '+1500 Bonus', icon: '👑', color: '#ec4899' },
  { id: 'gold_15000', name: '15000 Altın', amount: 15000, price: '₺149.99',bonus: '+5000 Bonus', icon: '🌟', color: '#fbbf24', bestValue: true },
]

export const TRAIL_EFFECTS = [
  { id: 'sparkle',  name: 'Parıltı',     icon: '✨', rarity: 'rare',      color: '#fbbf24', desc: 'Altın parıltı izi' },
  { id: 'fire',     name: 'Ateş',        icon: '🔥', rarity: 'epic',      color: '#ef4444', desc: 'Kırmızı alev izi' },
  { id: 'ice',      name: 'Buz',         icon: '❄️', rarity: 'epic',      color: '#38bdf8', desc: 'Mavi buz kristalleri' },
  { id: 'electric', name: 'Elektrik',    icon: '⚡', rarity: 'epic',      color: '#fbbf24', desc: 'Sarı şimşek izi' },
  { id: 'sakura',   name: 'Sakura',      icon: '🌸', rarity: 'legendary', color: '#f9a8d4', desc: 'Pembe kiraz yaprağı' },
  { id: 'galaxy',   name: 'Galaksi',     icon: '🌌', rarity: 'legendary', color: '#818cf8', desc: 'Mor uzay tozu' },
  { id: 'rainbow',  name: 'Gökkuşağı',   icon: '🌈', rarity: 'legendary', color: '#ec4899', desc: 'Renk değiştiren iz' },
  { id: 'void',     name: 'Boşluk',      icon: '🕳️', rarity: 'mythic',    color: '#7c3aed', desc: 'Karanlık portal izi' },
  { id: 'aurora',   name: 'Aurora',      icon: '🌠', rarity: 'mythic',    color: '#06b6d4', desc: 'Kuzey ışıkları izi' },
]

export const DEATH_EFFECTS = [
  { id: 'ghost',    name: 'Hayalet',     icon: '👻', rarity: 'rare',      color: '#c4b5fd', desc: 'Hayaletimsi süzülme' },
  { id: 'shatter',  name: 'Parçalan',    icon: '💥', rarity: 'epic',      color: '#f97316', desc: 'Cam parçası gibi kırılma' },
  { id: 'dissolve', name: 'Erime',       icon: '💧', rarity: 'epic',      color: '#38bdf8', desc: 'Yavaşça erir ve kaybolur' },
  { id: 'nova',     name: 'Süpernova',   icon: '🌟', rarity: 'legendary', color: '#fbbf24', desc: 'Kör edici ışık patlaması' },
  { id: 'portal',   name: 'Portal',      icon: '🌀', rarity: 'legendary', color: '#8b5cf6', desc: 'Portal içine çekilme' },
  { id: 'void_end', name: 'Boşluğa',     icon: '🕳️', rarity: 'mythic',    color: '#7c3aed', desc: 'Karanlığa yutulma' },
]

export const NAME_EFFECTS = [
  { id: 'glow',     name: 'Parlaklık',   icon: '💫', rarity: 'rare',      color: '#60a5fa', price: 150,  desc: 'İsmin etrafında soft mavi aura' },
  { id: 'sparkle',  name: 'Parıltı',     icon: '✨', rarity: 'rare',      color: '#fbbf24', price: 200,  desc: 'Altın parıltılar uçuşur' },
  { id: 'fire',     name: 'Ateş',        icon: '🔥', rarity: 'epic',      color: '#ef4444', price: 400,  desc: 'Kırmızı ateş halkası' },
  { id: 'electric', name: 'Elektrik',    icon: '⚡', rarity: 'epic',      color: '#fbbf24', price: 500,  desc: 'Sarı şimşek ark efekti' },
  { id: 'ice',      name: 'Buz',         icon: '❄️', rarity: 'epic',      color: '#38bdf8', price: 400,  desc: 'Buz kristalleri döner' },
  { id: 'rainbow',  name: 'Gökkuşağı',   icon: '🌈', rarity: 'legendary', color: '#ec4899', price: 800,  desc: 'Tüm renklerde dönen halka' },
  { id: 'galaxy',   name: 'Galaksi',     icon: '🌌', rarity: 'legendary', color: '#8b5cf6', price: 1000, desc: 'Yıldız sistemleri döner' },
  { id: 'aurora',   name: 'Aurora',      icon: '🌠', rarity: 'legendary', color: '#06b6d4', price: 1200, desc: 'Kuzey ışıkları dalgası' },
  { id: 'void',     name: 'Boşluk',      icon: '🕳️', rarity: 'mythic',    color: '#7c3aed', price: 2000, desc: 'Karanlık enerji halkası' },
  { id: 'phantom',  name: 'Hayalet',     icon: '👻', rarity: 'mythic',    color: '#c4b5fd', price: 2500, desc: 'Ölümsüz enerji alanı' },
]

export const FRAMES = [
  { id: 'silver',    name: 'Gümüş',       icon: '⭕', rarity: 'rare',      price: 300,  color: '#9ca3af', desc: 'İnce gümüş halka' },
  { id: 'gold',      name: 'Altın',       icon: '🔆', rarity: 'rare',      price: 600,  color: '#f59e0b', desc: 'Çift altın halka' },
  { id: 'neon',      name: 'Neon',        icon: '💡', rarity: 'epic',      price: 900,  color: '#a78bfa', desc: 'Mor-cyan neon çerçeve' },
  { id: 'fire',      name: 'Ateş',        icon: '🔥', rarity: 'epic',      price: 900,  color: '#ef4444', desc: 'Kırmızı alev çerçevesi' },
  { id: 'ice',       name: 'Buz',         icon: '❄️', rarity: 'epic',      price: 900,  color: '#60a5fa', desc: 'Soğuk mavi buz' },
  { id: 'diamond',   name: 'Elmas',       icon: '💎', rarity: 'legendary', price: 1200, color: '#38bdf8', desc: 'Elmas taşlı çerçeve' },
  { id: 'rainbow',   name: 'Gökkuşağı',   icon: '🌈', rarity: 'legendary', price: 1800, color: '#ec4899', desc: 'Renk değiştiren halka' },
  { id: 'galaxy',    name: 'Galaksi',     icon: '🌌', rarity: 'legendary', price: 2500, color: '#818cf8', desc: 'Üçlü galaksi halkası' },
  { id: 'sakura',    name: 'Sakura',      icon: '🌸', rarity: 'legendary', price: 2200, color: '#fda4af', desc: 'Kiraz çiçeği halkası' },
  { id: 'void',      name: 'Boşluk',      icon: '🕳️', rarity: 'mythic',    price: 3500, color: '#7c3aed', desc: 'Karanlık enerji halkası' },
  { id: 'crown',     name: 'Taç',         icon: '👑', rarity: 'mythic',    price: 4000, color: '#fbbf24', desc: 'Kraliyet tacı çerçevesi' },
]

export const TITLES = [
  { id: 'beginner',  name: 'Acemi',        color: '#94a3b8', rarity: 'common',    source: 'level',   req: 1   },
  { id: 'player',    name: 'Oyuncu',       color: '#22c55e', rarity: 'common',    source: 'level',   req: 5   },
  { id: 'warrior',   name: 'Savaşçı',      color: '#60a5fa', rarity: 'rare',      source: 'level',   req: 10  },
  { id: 'expert',    name: 'Uzman',        color: '#818cf8', rarity: 'rare',      source: 'level',   req: 25  },
  { id: 'master',    name: 'Usta',         color: '#f59e0b', rarity: 'epic',      source: 'level',   req: 50  },
  { id: 'legend',    name: 'Efsane',       color: '#ec4899', rarity: 'legendary', source: 'level',   req: 75  },
  { id: 'godlike',   name: 'Tanrısal',     color: '#fbbf24', rarity: 'mythic',    source: 'level',   req: 100 },
  { id: 'killer',    name: 'Katil',        color: '#ef4444', rarity: 'epic',      source: 'kills',   req: 100 },
  { id: 'champion',  name: 'Şampiyon',     color: '#fbbf24', rarity: 'legendary', source: 'score',   req: 10000 },
  { id: 'immortal',  name: 'Ölümsüz',      color: '#7df9ff', rarity: 'mythic',    source: 'playtime',req: 1800  },
  { id: 'hunter',    name: 'Avcı',         color: '#84cc16', rarity: 'rare',      source: 'kills',   req: 50  },
  { id: 'predator',  name: 'Yırtıcı',      color: '#dc2626', rarity: 'legendary', source: 'kills',   req: 500 },
]

const mkReward = (type, opts) => ({ type, rarity: 'common', ...opts })

export const LUCKY_BOXES = {
  bronze: {
    id: 'bronze', name: 'Bronz Sandık', price: 50, icon: '📦',
    color: '#92400e', glowColor: '#b45309',
    gradient: 'linear-gradient(135deg, #1c1003, #422006)',
    borderColor: '#92400e',
    rarityPool: { common: 65, rare: 30, epic: 5, legendary: 0, mythic: 0 },
    rewards: [
      mkReward('gold',       { amount: 30,  weight: 30, icon: '💰', name: '30 Altın',     rarity: 'common'    }),
      mkReward('gold',       { amount: 75,  weight: 20, icon: '💰', name: '75 Altın',     rarity: 'rare'      }),
      mkReward('xp',         { amount: 300, weight: 20, icon: '✨', name: '300 XP',       rarity: 'common'    }),
      mkReward('xp',         { amount: 800, weight: 12, icon: '⚡', name: '800 XP',       rarity: 'rare'      }),
      mkReward('nameEffect', { id: 'glow',  weight: 8,  icon: '💫', name: 'Parlaklık Efekti', rarity: 'rare' }),
      mkReward('frame',      { id: 'silver',weight: 6,  icon: '⭕', name: 'Gümüş Çerçeve',rarity: 'rare'     }),
      mkReward('trail',      { id: 'sparkle',weight:3,  icon: '✨', name: 'Parıltı İzi',  rarity: 'rare'      }),
      mkReward('chest',      { id: 'bronze',amount:1,   weight: 1,  icon: '📦', name: 'Bronz Sandık x1', rarity: 'epic' }),
    ]
  },
  silver: {
    id: 'silver', name: 'Gümüş Sandık', price: 150, icon: '🥈',
    color: '#475569', glowColor: '#94a3b8',
    gradient: 'linear-gradient(135deg, #0f172a, #1e293b)',
    borderColor: '#475569',
    rarityPool: { common: 30, rare: 45, epic: 22, legendary: 3, mythic: 0 },
    rewards: [
      mkReward('gold',       { amount: 80,  weight: 20, icon: '💰', name: '80 Altın',      rarity: 'rare'      }),
      mkReward('gold',       { amount: 200, weight: 12, icon: '💰', name: '200 Altın',     rarity: 'epic'      }),
      mkReward('xp',         { amount: 800, weight: 18, icon: '✨', name: '800 XP',        rarity: 'rare'      }),
      mkReward('xpBoost',    { hours: 12,   weight: 10, icon: '⚡', name: 'XP x2 (12s)',  rarity: 'epic'      }),
      mkReward('nameEffect', { id: 'sparkle',weight:9, icon: '✨', name: 'Parıltı Efekti', rarity: 'rare'     }),
      mkReward('nameEffect', { id: 'fire',   weight:7, icon: '🔥', name: 'Ateş Efekti',   rarity: 'epic'      }),
      mkReward('frame',      { id: 'gold',   weight:8, icon: '🔆', name: 'Altın Çerçeve', rarity: 'rare'      }),
      mkReward('trail',      { id: 'fire',   weight:7, icon: '🔥', name: 'Ateş İzi',      rarity: 'epic'      }),
      mkReward('trail',      { id: 'ice',    weight:6, icon: '❄️', name: 'Buz İzi',       rarity: 'epic'      }),
      mkReward('skin',       { id: 'fire',   weight:2, icon: '🔥', name: 'Ateş Skin',     rarity: 'epic'      }),
      mkReward('title',      { id: 'hunter', weight:1, icon: '🎖️', name: 'Unvan: Avcı',  rarity: 'legendary' }),
    ]
  },
  gold: {
    id: 'gold', name: 'Altın Sandık', price: 400, icon: '🏆',
    color: '#92400e', glowColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #1a0a00, #3d1f00)',
    borderColor: '#f59e0b',
    rarityPool: { common: 5, rare: 25, epic: 45, legendary: 23, mythic: 2 },
    rewards: [
      mkReward('gold',       { amount: 200, weight: 15, icon: '💰', name: '200 Altın',     rarity: 'epic'      }),
      mkReward('gold',       { amount: 600, weight: 8,  icon: '💰', name: '600 Altın',     rarity: 'legendary' }),
      mkReward('xpBoost',    { hours: 24,   weight: 12, icon: '⚡', name: 'XP x2 (24s)',  rarity: 'epic'      }),
      mkReward('nameEffect', { id: 'electric',weight:9,icon: '⚡', name: 'Elektrik Efekti',rarity: 'epic'     }),
      mkReward('nameEffect', { id: 'rainbow', weight:7,icon: '🌈', name: 'Gökkuşağı Efekti',rarity:'legendary'}),
      mkReward('frame',      { id: 'neon',   weight:8, icon: '💡', name: 'Neon Çerçeve',  rarity: 'epic'      }),
      mkReward('frame',      { id: 'diamond',weight:6, icon: '💎', name: 'Elmas Çerçeve', rarity: 'legendary' }),
      mkReward('trail',      { id: 'electric',weight:8,icon: '⚡', name: 'Elektrik İzi',  rarity: 'epic'      }),
      mkReward('trail',      { id: 'sakura', weight:6, icon: '🌸', name: 'Sakura İzi',    rarity: 'legendary' }),
      mkReward('deathEffect',{ id: 'shatter',weight:7, icon: '💥', name: 'Parçalan Efekti',rarity:'epic'      }),
      mkReward('deathEffect',{ id: 'nova',   weight:4, icon: '🌟', name: 'Süpernova Efekti',rarity:'legendary'}),
      mkReward('skin',       { id: 'galaxy', weight:5, icon: '🌌', name: 'Galaksi Skin',  rarity: 'legendary' }),
      mkReward('skin',       { id: 'neon',   weight:6, icon: '💡', name: 'Neon Skin',     rarity: 'epic'      }),
      mkReward('skill',      { id: 'speed',  uses: 3,  weight:4, icon: '⚡', name: 'Hızlanma x3', rarity: 'legendary' }),
      mkReward('chest',      { id: 'silver', amount: 1,weight:3, icon: '🥈', name: 'Gümüş Sandık x1', rarity: 'epic' }),
      mkReward('title',      { id: 'killer', weight:2, icon: '💀', name: 'Unvan: Katil',  rarity: 'legendary' }),
    ]
  },
  legendary: {
    id: 'legendary', name: 'Efsane Sandık', price: 1000, icon: '💎',
    color: '#7c3aed', glowColor: '#a855f7',
    gradient: 'linear-gradient(135deg, #120720, #2d0e5c)',
    borderColor: '#a855f7',
    rarityPool: { common: 0, rare: 5, epic: 25, legendary: 55, mythic: 15 },
    rewards: [
      mkReward('gold',       { amount: 500,  weight: 10, icon: '💰', name: '500 Altın',     rarity: 'legendary' }),
      mkReward('gold',       { amount: 1500, weight: 5,  icon: '💎', name: '1500 Altın',    rarity: 'mythic'    }),
      mkReward('xpBoost',    { hours: 48,    weight: 8,  icon: '⚡', name: 'XP x3 (48s)',  rarity: 'legendary' }),
      mkReward('nameEffect', { id: 'galaxy', weight: 8,  icon: '🌌', name: 'Galaksi Efekti', rarity: 'legendary'}),
      mkReward('nameEffect', { id: 'aurora', weight: 7,  icon: '🌠', name: 'Aurora Efekti', rarity: 'legendary' }),
      mkReward('nameEffect', { id: 'void',   weight: 3,  icon: '🕳️', name: 'Boşluk Efekti',  rarity: 'mythic'  }),
      mkReward('nameEffect', { id: 'phantom',weight: 2,  icon: '👻', name: 'Hayalet Efekti', rarity: 'mythic'   }),
      mkReward('frame',      { id: 'rainbow',weight: 7,  icon: '🌈', name: 'Gökkuşağı Çerçeve',rarity:'legendary'}),
      mkReward('frame',      { id: 'galaxy', weight: 6,  icon: '🌌', name: 'Galaksi Çerçeve',rarity:'legendary'}),
      mkReward('frame',      { id: 'void',   weight: 3,  icon: '🕳️', name: 'Boşluk Çerçeve',  rarity: 'mythic'  }),
      mkReward('frame',      { id: 'crown',  weight: 2,  icon: '👑', name: 'Taç Çerçeve',    rarity: 'mythic'   }),
      mkReward('trail',      { id: 'galaxy', weight: 7,  icon: '🌌', name: 'Galaksi İzi',   rarity: 'legendary' }),
      mkReward('trail',      { id: 'rainbow',weight: 6,  icon: '🌈', name: 'Gökkuşağı İzi', rarity: 'legendary' }),
      mkReward('trail',      { id: 'void',   weight: 3,  icon: '🕳️', name: 'Boşluk İzi',    rarity: 'mythic'    }),
      mkReward('trail',      { id: 'aurora', weight: 3,  icon: '🌠', name: 'Aurora İzi',    rarity: 'mythic'    }),
      mkReward('deathEffect',{ id: 'portal', weight: 6,  icon: '🌀', name: 'Portal Efekti', rarity: 'legendary' }),
      mkReward('deathEffect',{ id: 'void_end',weight:3,  icon: '🕳️', name: 'Boşluğa Efekti',rarity: 'mythic'   }),
      mkReward('skin',       { id: 'dragon', weight: 5,  icon: '🐉', name: 'Ejderha Skin',  rarity: 'legendary' }),
      mkReward('skin',       { id: 'void',   weight: 4,  icon: '🕳️', name: 'Void Skin',     rarity: 'legendary' }),
      mkReward('skin',       { id: 'crystal',weight: 2,  icon: '💎', name: 'Kristal Skin',  rarity: 'mythic'    }),
      mkReward('skill',      { id: 'teleport',uses:3,    weight: 3,  icon: '✨', name: 'Işınlan x3', rarity: 'legendary' }),
      mkReward('skill',      { id: 'ghost',   uses:3,    weight: 3,  icon: '👻', name: 'Hayalet x3', rarity: 'legendary' }),
      mkReward('chest',      { id: 'gold',    amount:1,  weight: 3,  icon: '🏆', name: 'Altın Sandık x1', rarity: 'legendary' }),
      mkReward('title',      { id: 'predator',weight: 2, icon: '🦁', name: 'Unvan: Yırtıcı', rarity: 'mythic'  }),
    ]
  },
  premium: {
    id: 'premium', name: 'Premium Sandık', price: 0, icon: '🌟',
    realMoney: true, priceLabel: '₺29.99',
    color: '#b45309', glowColor: '#fbbf24',
    gradient: 'linear-gradient(135deg, #1a0d00, #3d2200)',
    borderColor: '#fbbf24',
    rarityPool: { common: 0, rare: 0, epic: 15, legendary: 55, mythic: 30 },
    rewards: [
      mkReward('gold',       { amount: 2000,  weight: 8,  icon: '💰', name: '2000 Altın',   rarity: 'legendary' }),
      mkReward('gold',       { amount: 5000,  weight: 3,  icon: '💎', name: '5000 Altın',   rarity: 'mythic'    }),
      mkReward('xpBoost',    { hours: 72,     weight: 7,  icon: '⚡', name: 'XP x3 (72s)', rarity: 'legendary' }),
      mkReward('nameEffect', { id: 'void',    weight: 8,  icon: '🕳️', name: 'Boşluk Efekti', rarity: 'mythic'  }),
      mkReward('nameEffect', { id: 'phantom', weight: 7,  icon: '👻', name: 'Hayalet Efekti', rarity: 'mythic'  }),
      mkReward('nameEffect', { id: 'aurora',  weight: 8,  icon: '🌠', name: 'Aurora Efekti', rarity: 'legendary'}),
      mkReward('frame',      { id: 'crown',   weight: 8,  icon: '👑', name: 'Taç Çerçeve',  rarity: 'mythic'    }),
      mkReward('frame',      { id: 'void',    weight: 7,  icon: '🕳️', name: 'Boşluk Çerçeve',rarity: 'mythic'  }),
      mkReward('trail',      { id: 'aurora',  weight: 8,  icon: '🌠', name: 'Aurora İzi',   rarity: 'mythic'    }),
      mkReward('trail',      { id: 'void',    weight: 7,  icon: '🕳️', name: 'Boşluk İzi',   rarity: 'mythic'   }),
      mkReward('deathEffect',{ id: 'void_end',weight: 8,  icon: '🕳️', name: 'Boşluğa Efekti',rarity: 'mythic'  }),
      mkReward('skin',       { id: 'aurora',  weight: 8,  icon: '🌠', name: 'Aurora Skin',  rarity: 'legendary' }),
      mkReward('skin',       { id: 'crystal', weight: 6,  icon: '💎', name: 'Kristal Skin', rarity: 'mythic'    }),
      mkReward('skin',       { id: 'phantom', weight: 5,  icon: '👻', name: 'Phantom Skin', rarity: 'mythic'    }),
      mkReward('skill',      { id: 'teleport',uses:5,     weight: 6,  icon: '✨', name: 'Işınlan x5', rarity: 'legendary' }),
      mkReward('title',      { id: 'champion',weight: 5,  icon: '🏆', name: 'Unvan: Şampiyon',rarity:'legendary'}),
      mkReward('title',      { id: 'immortal',weight: 3,  icon: '💎', name: 'Unvan: Ölümsüz',rarity: 'mythic'  }),
    ]
  }
}

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
  return pool[pool.length - 1]
}

export function getGuaranteedRarity(boxType, pity = 0) {
  const box = LUCKY_BOXES[boxType]
  if (!box) return null
  const { rarityPool } = box
  if (pity >= 90 && rarityPool.mythic > 0) return 'mythic'
  if (pity >= 50 && rarityPool.legendary > 0) return 'legendary'
  return null
}

const useShopStore = create(
  persist(
    (set) => ({
      openBoxType: null,
      showShopPage: false,
      setShowShopPage: (v) => set({ showShopPage: v }),
      setOpenBoxType: (type) => set({ openBoxType: type }),
    }),
    { name: 'agarz-shop-v3' }
  )
)

export default useShopStore
