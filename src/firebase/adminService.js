import { ref as dbRef, get, set, onValue, off } from 'firebase/database'
import { db } from './config'

const SERVER = import.meta.env.VITE_SERVER_URL || 'https://agarz-production.up.railway.app'
export const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'AGARZ_ADMIN_SECRET_2024'

function headers() {
  return { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_SECRET }
}

async function api(path, opts = {}) {
  const res = await fetch(`${SERVER}${path}`, { headers: headers(), ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
  return res.json()
}

export const adminApi = {
  health:       () => api('/api/admin/health'),
  stats:        () => api('/api/admin/stats'),
  players:      () => api('/api/admin/players'),
  logs:         () => api('/api/admin/logs'),
  announcements: () => api('/api/admin/announcements'),
  config:       () => api('/api/admin/config'),
  roles:        () => api('/api/admin/roles'),

  ban: (uid, reason, duration, adminUid) =>
    api('/api/admin/ban', { method: 'POST', body: JSON.stringify({ uid, reason, duration, adminUid }) }),
  unban: (uid, adminUid) =>
    api('/api/admin/unban', { method: 'POST', body: JSON.stringify({ uid, adminUid }) }),
  deletePlayer: (uid, adminUid) =>
    api('/api/admin/delete-player', { method: 'POST', body: JSON.stringify({ uid, adminUid }) }),
  giveCoins: (uid, amount, adminUid) =>
    api('/api/admin/give-coins', { method: 'POST', body: JSON.stringify({ uid, amount, adminUid }) }),
  giveCoinsAll: (amount, adminUid) =>
    api('/api/admin/give-coins-all', { method: 'POST', body: JSON.stringify({ amount, adminUid }) }),
  setPremium: (uid, packageId, adminUid) =>
    api('/api/admin/set-premium', { method: 'POST', body: JSON.stringify({ uid, packageId, adminUid }) }),
  addCosmetic: (uid, type, itemId, adminUid) =>
    api('/api/admin/add-cosmetic', { method: 'POST', body: JSON.stringify({ uid, type, itemId, adminUid }) }),
  kick: (uid, reason) =>
    api('/api/admin/kick', { method: 'POST', body: JSON.stringify({ uid, reason }) }),
  freeze: (uid, freeze) =>
    api('/api/admin/freeze', { method: 'POST', body: JSON.stringify({ uid, freeze }) }),
  announce: (message, targetUid, type, adminUid) =>
    api('/api/admin/announce', { method: 'POST', body: JSON.stringify({ message, targetUid, type, adminUid }) }),
  setConfig: (key, value, adminUid) =>
    api('/api/admin/config', { method: 'POST', body: JSON.stringify({ key, value, adminUid }) }),
  setRole: (uid, role, adminUid) =>
    api('/api/admin/set-role', { method: 'POST', body: JSON.stringify({ uid, role, adminUid }) }),
}

export async function checkAdminRole(uid) {
  if (!uid) return null
  try {
    const snap = await get(dbRef(db, `adminRoles/${uid}`))
    if (snap.exists()) return snap.val().role
    return null
  } catch { return null }
}

export async function setAdminRole(uid, role) {
  await set(dbRef(db, `adminRoles/${uid}`), { role, grantedAt: Date.now() })
}
