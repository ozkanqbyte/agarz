import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  gameMode: 'ffa',
  currentTheme: 'cyberpunk',
  currentRoom: null,
  isPlaying: false,
  isPaused: false,
  score: 0,
  playerMass: 0,
  rank: 0,
  totalPlayers: 0,
  leaderboard: [],
  spectating: false,

  setGameMode: (mode) => set({ gameMode: mode }),
  setTheme: (theme) => set({ currentTheme: theme }),
  setRoom: (room) => set({ currentRoom: room }),
  setPlaying: (v) => set({ isPlaying: v }),
  setScore: (score) => set({ score }),
  setPlayerMass: (playerMass) => set({ playerMass }),
  setRank: (rank) => set({ rank }),
  setTotalPlayers: (n) => set({ totalPlayers: n }),
  setLeaderboard: (lb) => set({ leaderboard: lb }),
  setSpectating: (v) => set({ spectating: v }),
  reset: () => set({ isPlaying: false, score: 0, playerMass: 0, rank: 0, currentRoom: null, spectating: false })
}))

export default useGameStore
