import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useProgressStore from './useProgressStore'

export const QUEST_POOL = [
  { id: 'eat_5', title: '5 Düşman Ye', desc: 'Bu oyunda 5 düşman ye', icon: '🍽️', target: 5, type: 'kills', reward: { coins: 50, lootbox: 1 } },
  { id: 'eat_10', title: '10 Düşman Ye', desc: 'Bu oyunda 10 düşman ye', icon: '⚔️', target: 10, type: 'kills', reward: { coins: 100, lootbox: 1 } },
  { id: 'eat_20', title: '20 Düşman Ye', desc: 'Bu oyunda 20 düşman ye', icon: '💥', target: 20, type: 'kills', reward: { coins: 200, lootbox: 2 } },
  { id: 'reach_1000', title: '1000 Kütleye Ulaş', desc: '1000 kütleye ulaş', icon: '⭐', target: 1000, type: 'score', reward: { coins: 80 } },
  { id: 'reach_5000', title: '5000 Kütleye Ulaş', desc: '5000 kütleye ulaş', icon: '🌟', target: 5000, type: 'score', reward: { coins: 200, lootbox: 2 } },
  { id: 'reach_10000', title: '10000 Kütleye Ulaş', desc: '10000 kütleye ulaş', icon: '👑', target: 10000, type: 'score', reward: { coins: 400, lootbox: 3 } },
  { id: 'eat_virus', title: '3 Diken Ye', desc: 'Üç diken ye', icon: '🌿', target: 3, type: 'viruses', reward: { coins: 60, lootbox: 1 } },
  { id: 'eat_virus_10', title: '10 Diken Ye', desc: 'On diken ye', icon: '☠️', target: 10, type: 'viruses', reward: { coins: 150, lootbox: 1 } },
  { id: 'play_3', title: '3 Oyun Oyna', desc: 'Üç oyun oyna', icon: '🎮', target: 3, type: 'games', reward: { coins: 40 } },
  { id: 'play_5', title: '5 Oyun Oyna', desc: 'Beş oyun oyna', icon: '🕹️', target: 5, type: 'games', reward: { coins: 80 } },
  { id: 'split_10', title: '10 Kez Böl', desc: 'Hücreni 10 kez böl', icon: '✂️', target: 10, type: 'splits', reward: { coins: 30 } },
  { id: 'split_30', title: '30 Kez Böl', desc: 'Hücreni 30 kez böl', icon: '💫', target: 30, type: 'splits', reward: { coins: 60 } },
  { id: 'earn_xp_500', title: '500 XP Kazan', desc: '500 XP kazan', icon: '✨', target: 500, type: 'xp', reward: { coins: 50 } },
  { id: 'earn_xp_2000', title: '2000 XP Kazan', desc: '2000 XP kazan', icon: '⚡', target: 2000, type: 'xp', reward: { coins: 120, lootbox: 1 } },
  { id: 'survive_5min', title: '5 Dakika Hayatta Kal', desc: '5 dakika hayatta kal', icon: '🛡️', target: 300, type: 'playtime', reward: { coins: 70 } },
]

const useQuestStore = create(
  persist(
    (set, get) => ({
      quests: [],
      lastReset: 0,

      selectDailyQuests: () => {
        const shuffled = [...QUEST_POOL].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, 5).map(q => ({
          ...q,
          progress: 0,
          completed: false,
          claimed: false,
        }))
        set({ quests: selected, lastReset: Date.now() })
      },

      checkReset: () => {
        const { lastReset, selectDailyQuests } = get()
        const now = Date.now()
        if (now - lastReset > 24 * 60 * 60 * 1000) {
          selectDailyQuests()
        }
      },

      updateProgress: (type, amount = 1) => {
        set(s => ({
          quests: s.quests.map(q => {
            if (q.type !== type || q.completed) return q
            const newProgress = Math.min(q.progress + amount, q.target)
            return { ...q, progress: newProgress, completed: newProgress >= q.target }
          })
        }))
      },

      claimQuest: (id) => {
        const { quests } = get()
        const quest = quests.find(q => q.id === id)
        if (!quest || !quest.completed || quest.claimed) return false

        const progressStore = useProgressStore.getState()
        if (quest.reward.coins) progressStore.addCoins(quest.reward.coins)
        if (quest.reward.lootbox) {
          for (let i = 0; i < quest.reward.lootbox; i++) progressStore.addLootBox()
        }

        set(s => ({
          quests: s.quests.map(q => q.id === id ? { ...q, claimed: true } : q)
        }))
        return true
      },

      _hydrate: (data) => {
        if (!data) return
        const now = Date.now()
        const { lastReset } = get()
        if (data.lastReset > lastReset && data.quests?.length > 0) {
          if (now - data.lastReset < 24 * 60 * 60 * 1000) {
            set({ quests: data.quests, lastReset: data.lastReset })
          }
        }
      },
    }),
    { name: 'agarz-quests' }
  )
)

export default useQuestStore
