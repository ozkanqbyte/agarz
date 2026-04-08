import { ref as dbRef, set, get } from 'firebase/database'
import { doc, setDoc, collection, query, orderBy, limit, getDocs, getDoc } from 'firebase/firestore'
import { db, firestore } from './config'

export async function fbLoadGameData(uid) {
  if (!uid) return null
  try {
    const snap = await get(dbRef(db, `users/${uid}/gameData`))
    return snap.exists() ? snap.val() : null
  } catch { return null }
}

export async function fbSaveProgress(uid, data) {
  if (!uid) return
  try {
    await set(dbRef(db, `users/${uid}/gameData/progress`), {
      xp: data.xp || 0,
      level: data.level || 1,
      prestige: data.prestige || 0,
      totalXP: data.totalXP || 0,
      coins: data.coins || 0,
      totalKills: data.totalKills || 0,
      highScore: data.highScore || 0,
      gamesPlayed: data.gamesPlayed || 0,
      totalViruses: data.totalViruses || 0,
      totalPlayTime: data.totalPlayTime || 0,
      earnedBadges: data.earnedBadges || [],
      pendingLootBoxes: data.pendingLootBoxes || 0,
    })
  } catch {}
}

export async function fbSavePremium(uid, data) {
  if (!uid) return
  try {
    await set(dbRef(db, `users/${uid}/gameData/premium`), {
      ownedSkins: data.ownedSkins || ['default'],
      ownedPackage: data.ownedPackage || 'free',
      coins: data.coins || 0,
    })
  } catch {}
}

export async function fbSaveBattlePass(uid, data) {
  if (!uid) return
  try {
    await set(dbRef(db, `users/${uid}/gameData/battlepass`), {
      currentTier: data.currentTier || 0,
      bpXP: data.bpXP || 0,
      isPremium: data.isPremium || false,
      seasonNumber: data.seasonNumber || 1,
      claimedFree: data.claimedFree || [],
      claimedPremium: data.claimedPremium || [],
      seasonEnd: data.seasonEnd || null,
    })
  } catch {}
}

export async function fbSaveQuests(uid, data) {
  if (!uid) return
  try {
    await set(dbRef(db, `users/${uid}/gameData/quests`), {
      quests: data.quests || [],
      lastReset: data.lastReset || 0,
    })
  } catch {}
}

export async function fbUpdateLeaderboard(uid, entry) {
  if (!uid || !entry.name) return
  try {
    await setDoc(doc(firestore, 'leaderboard', uid), {
      name: entry.name,
      score: entry.score || 0,
      level: entry.level || 1,
      prestige: entry.prestige || 0,
      color: entry.color || '#6366f1',
      updatedAt: Date.now(),
    })
  } catch {}
}

export async function fbGetLeaderboard(limitN = 100) {
  try {
    const q = query(collection(firestore, 'leaderboard'), orderBy('score', 'desc'), limit(limitN))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }))
  } catch { return [] }
}

export async function fbHydrateAllStores(uid) {
  const data = await fbLoadGameData(uid)
  if (!data) return

  try {
    const { default: useProgressStore } = await import('../store/useProgressStore')
    if (data.progress) {
      useProgressStore.getState()._hydrate(data.progress)
    }
  } catch {}

  try {
    const { default: usePremiumStore } = await import('../store/usePremiumStore')
    if (data.premium) {
      usePremiumStore.getState()._hydrate(data.premium)
    }
  } catch {}

  try {
    const { default: useBattlePassStore } = await import('../store/useBattlePassStore')
    if (data.battlepass) {
      useBattlePassStore.getState()._hydrate(data.battlepass)
    }
  } catch {}

  try {
    const { default: useQuestStore } = await import('../store/useQuestStore')
    if (data.quests) {
      useQuestStore.getState()._hydrate(data.quests)
    }
  } catch {}
}
