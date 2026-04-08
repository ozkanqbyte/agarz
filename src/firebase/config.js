import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDYhpn6gaiv5AywwpjmLujOMUc4B2CbiMk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'agarix-513e9.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://agarix-513e9-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'agarix-513e9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'agarix-513e9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '405094393210',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:405094393210:web:4953e03b05a301d06122c3',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-2TNDBSWVSN',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app)
export const firestore = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export default app
