import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { ref as dbRef, set as fbSet, get, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '../firebase/config'

let _offlineGuest = false

const makeDefaultProfile = (uid, name) => ({
  uid,
  name: name || 'Player',
  level: 1,
  xp: 0,
  premium: 'free',
  clan: null,
  isGod: false,
  isGuest: false,
  skin: 'default',
  theme: 'cyberpunk',
  color: '#' + ['6366f1','8b5cf6','ec4899','06b6d4','10b981','f59e0b','ef4444'][Math.floor(Math.random()*7)],
  createdAt: Date.now(),
  stats: { gamesPlayed: 0, highScore: 0, kills: 0, totalMass: 0 },
  friends: {},
  badges: []
})

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  isGuest: false,

  init: () => {
    let unsub
    try {
      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (_offlineGuest) {
          set({ loading: false })
          return
        }
        if (firebaseUser) {
          set({ user: firebaseUser, loading: false, isGuest: firebaseUser.isAnonymous })
          get().loadProfile(firebaseUser.uid)
        } else {
          if (!get().isGuest) {
            set({ user: null, profile: null, loading: false, isGuest: false })
          } else {
            set({ loading: false })
          }
        }
      })
    } catch (e) {
      set({ loading: false })
    }
    return unsub
  },

  loadProfile: (uid) => {
    try {
      const profileRef = dbRef(db, `users/${uid}/profile`)
      return onValue(profileRef, (snap) => {
        if (snap.exists()) {
          set({ profile: snap.val() })
        } else {
          const defaultProfile = makeDefaultProfile(uid, auth.currentUser?.displayName || 'Player')
          fbSet(profileRef, defaultProfile).catch(() => {})
          set({ profile: defaultProfile })
        }
      })
    } catch (e) {}
  },

  register: async (email, password, displayName) => {
    set({ error: null })
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName })
      const profile = makeDefaultProfile(cred.user.uid, displayName)
      await fbSet(dbRef(db, `users/${cred.user.uid}/profile`), profile)
      return { success: true }
    } catch (e) {
      set({ error: e.message })
      return { success: false, error: e.message }
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (e) {
      set({ error: e.message })
      return { success: false, error: e.message }
    }
  },

  loginWithGoogle: async () => {
    set({ error: null })
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const profileRef = dbRef(db, `users/${cred.user.uid}/profile`)
      const snap = await get(profileRef)
      if (!snap.exists()) {
        await fbSet(profileRef, makeDefaultProfile(cred.user.uid, cred.user.displayName))
      }
      return { success: true }
    } catch (e) {
      set({ error: e.message })
      return { success: false, error: e.message }
    }
  },

  loginAsGuest: async (guestName) => {
    set({ error: null })
    const name = (guestName || 'Misafir').trim().slice(0, 20) || 'Misafir'

    try {
      const cred = await signInAnonymously(auth)
      await updateProfile(cred.user, { displayName: name })
      const profile = makeDefaultProfile(cred.user.uid, name)
      profile.isGuest = true
      fbSet(dbRef(db, `users/${cred.user.uid}/profile`), profile).catch(() => {})
      set({ user: cred.user, profile, loading: false, isGuest: true })
      return { success: true }
    } catch (e) {
      const guestId = 'guest_' + Math.random().toString(36).slice(2, 10)
      const fakeUser = { uid: guestId, displayName: name, isAnonymous: true, email: null }
      const profile = makeDefaultProfile(guestId, name)
      profile.isGuest = true
      _offlineGuest = true
      set({ user: fakeUser, profile, loading: false, isGuest: true })
      return { success: true }
    }
  },

  logout: async () => {
    _offlineGuest = false
    try { await signOut(auth) } catch (_) {}
    set({ user: null, profile: null, isGuest: false })
  },

  updateProfile: async (updates) => {
    const { user, profile, isGuest } = get()
    if (!user) return
    const merged = { ...profile, ...updates }
    set({ profile: merged })
    if (!isGuest && !_offlineGuest) {
      fbSet(dbRef(db, `users/${user.uid}/profile`), merged).catch(() => {})
    }
  }
}))

export default useAuthStore
