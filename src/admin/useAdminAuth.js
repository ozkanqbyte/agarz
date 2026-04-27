import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { checkAdminRole } from '../firebase/adminService'

export const ADMIN_URL_KEY = 'agarzadmin2024'

export default function useAdminAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const r = await checkAdminRole(u.uid)
        setUser(u)
        setRole(r)
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email, password) => {
    setError(null)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const r = await checkAdminRole(cred.user.uid)
      if (!r) {
        await signOut(auth)
        setError('Bu hesabın admin yetkisi yok.')
        return false
      }
      setUser(cred.user)
      setRole(r)
      return true
    } catch (e) {
      setError('E-posta veya şifre hatalı.')
      return false
    }
  }

  const logout = () => signOut(auth)

  return { user, role, loading, error, login, logout }
}
