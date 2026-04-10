import { ref as dbRef, get, set } from 'firebase/database'
import { doc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
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

export async function fbSaveInventory(uid, data) {
  if (!uid) return
  try {
    await set(dbRef(db, `users/${uid}/gameData/inventory`), {
      ownedFrames: data.ownedFrames || [],
      ownedNameEffects: data.ownedNameEffects || [],
      ownedSkills: data.ownedSkills || {},
      ownedSkins: data.ownedSkins || ['default'],
      activeNameEffect: data.activeNameEffect || null,
      activeFrame: data.activeFrame || null,
      ownedDeathEffects: data.ownedDeathEffects || [],
      ownedTrailEffects: data.ownedTrailEffects || [],
      activeDeathEffect: data.activeDeathEffect || null,
      activeTrailEffect: data.activeTrailEffect || null,
      savedAt: Date.now(),
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
      clan: entry.clan || null,
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

export async function fbGetWeeklyLeaderboard(limitN = 50) {
  try {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const q = query(collection(firestore, 'leaderboard'), orderBy('score', 'desc'), limit(200))
    const snap = await getDocs(q)
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(d => (d.updatedAt || 0) >= weekAgo)
      .slice(0, limitN)
  } catch { return [] }
}

export async function fbGetFriendsLeaderboard(friendUids = []) {
  if (!friendUids.length) return []
  try {
    const q = query(collection(firestore, 'leaderboard'), orderBy('score', 'desc'), limit(500))
    const snap = await getDocs(q)
    const uidSet = new Set(friendUids)
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(d => uidSet.has(d.uid))
      .slice(0, 50)
  } catch { return [] }
}

export async function fbGetClanLeaderboard(clanName, limitN = 50) {
  if (!clanName) return []
  try {
    const q = query(collection(firestore, 'leaderboard'), orderBy('score', 'desc'), limit(500))
    const snap = await getDocs(q)
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(d => d.clan === clanName)
      .slice(0, limitN)
  } catch { return [] }
}

export async function fbHydrateAllStores(uid) {
  const data = await fbLoadGameData(uid)
  if (!data) return

  try {
    const { default: useProgressStore } = await import('../store/useProgressStore')
    if (data.progress) {
      const local = useProgressStore.getState()
      const fbCoins = data.progress.coins || 0
      const localCoins = local.coins || 0
      if (localCoins > fbCoins * 2 + 500) {
        data.progress.coins = fbCoins
      }
      useProgressStore.getState()._hydrate(data.progress)
    }
    if (data.inventory) {
      useProgressStore.getState()._hydrateInventory(data.inventory)
    }
  } catch {}

  try {
    const { default: usePremiumStore } = await import('../store/usePremiumStore')
    if (data.premium) {
      usePremiumStore.getState()._hydrate(data.premium)
    }
    if (data.inventory?.ownedSkins?.length) {
      usePremiumStore.getState()._hydrate({ ownedSkins: data.inventory.ownedSkins })
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
