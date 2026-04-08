import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import usePremiumStore, { PREMIUM_PACKAGES, SKINS } from '../../store/usePremiumStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function PremiumShop() {
  const { showShop, setShowShop, ownedPackage, ownedSkins, coins, mockPurchasePackage, mockPurchaseSkin, addCoins } = usePremiumStore()
  const { currentTheme } = useGameStore()
  const { profile, updateProfile } = useAuthStore()
  const theme = getTheme(currentTheme)
  const [tab, setTab] = useState('packages')
  const [purchasing, setPurchasing] = useState(null)

  const handleBuyPackage = async (pkg) => {
    if (ownedPackage === pkg.id) { toast.error('Bu pakete zaten sahipsin!'); return }
    setPurchasing(pkg.id)
    await new Promise(r => setTimeout(r, 1500))
    const result = mockPurchasePackage(pkg.id)
    if (result.success) {
      await updateProfile({ premium: pkg.id, isGod: pkg.id === 'god' })
      toast.success(`${pkg.name} satın alındı! ${pkg.icon}`, { duration: 4000 })
    }
    setPurchasing(null)
  }

  const handleBuySkin = (skin) => {
    if (ownedSkins.includes(skin.id)) { toast.error('Bu skin\'e zaten sahipsin!'); return }
    const result = mockPurchaseSkin(skin.id)
    if (!result.success) toast.error(result.error)
    else { toast.success(`${skin.name} skin satın alındı! ${skin.icon}`); updateProfile({ skin: skin.id }) }
  }

  const handleEquipSkin = (skin) => {
    updateProfile({ skin: skin.id })
    toast.success(`${skin.name} ekipmanı takıldı!`)
  }

  if (!showShop) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-4xl max-h-screen overflow-hidden flex flex-col rounded-2xl"
          style={{ background: theme.uiBg, border: `1px solid ${theme.uiBorder}` }}>

          <div className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: theme.uiBorder }}>
            <div>
              <h2 className="text-2xl font-black text-white">💎 Premium Mağaza</h2>
              <div className="text-gray-400 text-sm">Oyun deneyimini yükselt</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <span>🪙</span>
                <span className="text-yellow-400 font-bold">{coins}</span>
                <button onClick={() => addCoins(1000)}
                  className="text-xs text-yellow-600 hover:text-yellow-400 ml-1">+1000</button>
              </div>
              <button onClick={() => setShowShop(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)' }}>
                ✕
              </button>
            </div>
          </div>

          <div className="flex border-b" style={{ borderColor: theme.uiBorder }}>
            {[
              { id: 'packages', label: '📦 Paketler' },
              { id: 'skins', label: '🎨 Skinler' },
              { id: 'coins', label: '🪙 Coin Paketi' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-3 text-sm font-bold transition-all"
                style={{
                  color: tab === t.id ? theme.uiAccent : '#6b7280',
                  borderBottom: tab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
                  background: tab === t.id ? `rgba(${theme.glowColor},0.1)` : 'transparent'
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'packages' && (
              <div className="grid md:grid-cols-3 gap-4">
                {PREMIUM_PACKAGES.map(pkg => (
                  <motion.div key={pkg.id}
                    whileHover={{ y: -4 }}
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                      background: `linear-gradient(180deg, ${pkg.color}22 0%, rgba(0,0,0,0.3) 100%)`,
                      border: `1px solid ${pkg.color}66`,
                      boxShadow: ownedPackage === pkg.id ? `0 0 30px ${pkg.color}66` : 'none'
                    }}>
                    {pkg.popular && (
                      <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: pkg.color, color: '#000' }}>
                        🔥 Popüler
                      </div>
                    )}
                    {ownedPackage === pkg.id && (
                      <div className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.3)', border: '1px solid #22c55e', color: '#4ade80' }}>
                        ✓ Sahip
                      </div>
                    )}
                    <div className="p-5">
                      <div className="text-4xl mb-2">{pkg.icon}</div>
                      <div className="font-black text-white text-xl">{pkg.name}</div>
                      <div className="text-3xl font-black mt-2 mb-4" style={{ color: pkg.color }}>{pkg.price}</div>
                      <div className="space-y-2 mb-5">
                        {pkg.features.map(f => (
                          <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                            <span style={{ color: pkg.color }}>✓</span> {f}
                          </div>
                        ))}
                      </div>
                      <motion.button
                        onClick={() => handleBuyPackage(pkg)}
                        disabled={purchasing === pkg.id || ownedPackage === pkg.id}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${pkg.color}, ${pkg.color}99)` }}>
                        {purchasing === pkg.id ? '⏳ İşleniyor...' : ownedPackage === pkg.id ? '✓ Aktif' : 'Satın Al'}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === 'skins' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {SKINS.map(skin => {
                  const owned = ownedSkins.includes(skin.id)
                  const equipped = profile?.skin === skin.id
                  const canBuy = !skin.premium || ownedPackage !== 'free'
                  return (
                    <motion.div key={skin.id}
                      whileHover={{ y: -4 }}
                      className="rounded-xl overflow-hidden text-center"
                      style={{
                        background: equipped ? `rgba(${theme.glowColor},0.2)` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${equipped ? theme.uiAccent : 'rgba(255,255,255,0.1)'}`,
                        opacity: !owned && !canBuy ? 0.5 : 1
                      }}>
                      <div className="p-4">
                        <div className="text-3xl mb-1">{skin.icon || '⬤'}</div>
                        <div className="text-white text-xs font-bold">{skin.name}</div>
                        {skin.price > 0 && !owned && (
                          <div className="text-yellow-400 text-xs mt-1">🪙 {skin.price}</div>
                        )}
                        {skin.premium && !owned && (
                          <div className="text-purple-400 text-xs">💎 Premium</div>
                        )}
                      </div>
                      <button
                        onClick={() => owned ? handleEquipSkin(skin) : handleBuySkin(skin)}
                        className="w-full py-2 text-xs font-bold transition-all"
                        style={{
                          background: equipped ? theme.uiAccent + '33' : owned ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)',
                          color: equipped ? theme.uiAccent : owned ? '#4ade80' : '#9ca3af'
                        }}>
                        {equipped ? '✓ Takılı' : owned ? 'Tak' : skin.price === 0 ? 'Al' : 'Satın Al'}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {tab === 'coins' && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { amount: 1000, price: '₺9.99', bonus: '', icon: '🪙' },
                  { amount: 5000, price: '₺39.99', bonus: '+500 Bonus', icon: '💰' },
                  { amount: 15000, price: '₺99.99', bonus: '+3000 Bonus', icon: '💎' },
                  { amount: 50000, price: '₺299.99', bonus: '+15000 Bonus', icon: '👑' },
                ].map(pack => (
                  <motion.div key={pack.amount}
                    whileHover={{ y: -4 }}
                    className="rounded-2xl p-5 text-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,191,36,0.3)' }}>
                    <div className="text-4xl mb-2">{pack.icon}</div>
                    <div className="text-2xl font-black text-yellow-400">{pack.amount.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">Coin</div>
                    {pack.bonus && (
                      <div className="text-green-400 text-xs font-bold mt-1">{pack.bonus}</div>
                    )}
                    <div className="text-white font-bold text-lg mt-3 mb-4">{pack.price}</div>
                    <motion.button
                      onClick={() => { addCoins(pack.amount + (parseInt(pack.bonus) || 0)); toast.success(`${pack.amount} coin eklendi! 🪙`) }}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="w-full py-3 rounded-xl font-bold text-black"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                      Satın Al
                    </motion.button>
                  </motion.div>
                ))}
                <div className="col-span-full rounded-xl p-4 text-center"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <div className="text-gray-400 text-sm">
                    ℹ️ Bu demo bir ödeme simülasyonudur. Gerçek ödeme entegrasyonu için Firebase + Stripe/İyzico kurulabilir.
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
