import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/useAuthStore'
import useGameStore from '../../store/useGameStore'
import usePremiumStore, { PREMIUM_PACKAGES, SKINS } from '../../store/usePremiumStore'
import { getTheme } from '../../themes/themes'
import toast from 'react-hot-toast'
import PaymentModal from '../Payment/PaymentModal'

const GOLD_PACKS = [
  { id: 'gold_500',  amount: 500,   bonus: '',          price: '₺9.99',   icon: '🪙', color: '#fbbf24' },
  { id: 'gold_1500', amount: 1500,  bonus: '+200 Bonus', price: '₺24.99', icon: '💰', color: '#f59e0b' },
  { id: 'gold_5000', amount: 5000,  bonus: '+1000 Bonus',price: '₺59.99', icon: '💎', color: '#a78bfa' },
]

function ConfirmModal({ item, onConfirm, onCancel, coins }) {
  const needsPayment = item?.needsPayment
  const canAfford = needsPayment || (coins >= (item?.price || 0))
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        style={{ background: 'linear-gradient(180deg,#0f0f28,#080818)', border: `2px solid ${item?.color || '#6366f1'}55`, borderRadius: 24, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: `0 0 60px ${item?.color || '#6366f1'}33` }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{item?.icon || '🛒'}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{item?.name}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{needsPayment ? `${item?.priceLabel} ödeme yapılacak` : `${item?.price?.toLocaleString()} Gold harcanacak`}</div>
        {!needsPayment && !canAfford && (
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            Yetersiz Gold! {item?.price - coins} Gold eksik.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onCancel}
            style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            İptal
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onConfirm}
            disabled={!canAfford}
            style={{ flex: 1, padding: '12px', borderRadius: 14, background: canAfford ? `linear-gradient(135deg,${item?.color || '#6366f1'},${item?.color || '#6366f1'}99)` : 'rgba(255,255,255,0.05)', border: 'none', color: canAfford ? '#fff' : '#4b5563', fontWeight: 900, fontSize: 14, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
            {needsPayment ? '💳 Öde' : '✓ Al'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function PremiumShop() {
  const { showShop, setShowShop, ownedPackage, ownedSkins, coins, mockPurchaseSkin } = usePremiumStore()
  const { currentTheme } = useGameStore()
  const { profile, updateProfile, user } = useAuthStore()
  const theme = getTheme(currentTheme)
  const [tab, setTab] = useState('packages')
  const [paymentData, setPaymentData] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  const handleBuyPackage = (pkg) => {
    if (ownedPackage === pkg.id) { toast.error('Bu pakete zaten sahipsin!'); return }
    if (!user) { toast.error('Ödeme için giriş yapmalısın!'); return }
    setConfirmItem({ name: pkg.name, icon: pkg.icon || '💎', color: pkg.color, priceLabel: pkg.price, needsPayment: true, _pkg: pkg })
  }

  const handleBuySkin = (skin) => {
    if (ownedSkins.includes(skin.id)) { updateProfile({ skin: skin.id }); toast.success(`${skin.name} takıldı!`); return }
    setConfirmItem({ name: skin.name, icon: skin.icon, color: skin.color, price: skin.price, _skin: skin })
  }

  const handleBuyGold = (pack) => {
    if (!user) { toast.error('Ödeme için giriş yapmalısın!'); return }
    setConfirmItem({ name: `${pack.amount.toLocaleString()} Gold${pack.bonus ? ' (+' + pack.bonus + ')' : ''}`, icon: pack.icon, color: pack.color, priceLabel: pack.price, needsPayment: true, _gold: pack })
  }

  const handleConfirm = () => {
    const item = confirmItem
    setConfirmItem(null)
    if (item.needsPayment) {
      if (item._gold) {
        setPaymentData({ packageId: item._gold.id, packageName: item.name, priceLabel: item.priceLabel })
      } else if (item._pkg) {
        setPaymentData({ packageId: `premium_${item._pkg.id}`, packageName: item._pkg.name, priceLabel: item._pkg.price })
      }
    } else if (item._skin) {
      const result = mockPurchaseSkin(item._skin.id)
      if (!result.success) toast.error(result.error)
      else { toast.success(`${item._skin.name} satın alındı! ${item._skin.icon}`); updateProfile({ skin: item._skin.id }) }
    }
  }

  if (!showShop) return null

  const pkgTier = PREMIUM_PACKAGES.find(p => p.id === ownedPackage)?.tier || 0

  return (
    <AnimatePresence>
      <motion.div key="shop-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', fontFamily: '"Exo 2",sans-serif' }}>

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
          style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#0a0a1f,#05050f)', overflow: 'hidden' }}>

          {/* HEADER */}
          <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(5,5,20,0.98)', backdropFilter: 'blur(20px)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>💎 Premium Mağaza</div>
              <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600, marginTop: 2 }}>Oyun deneyimini yükselt</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 14, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span style={{ fontSize: 18 }}>🪙</span>
              <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 16 }}>{coins.toLocaleString()}</span>
            </div>
            {ownedPackage !== 'free' && (
              <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', fontWeight: 900, fontSize: 12 }}>
                ✦ {PREMIUM_PACKAGES.find(p => p.id === ownedPackage)?.name || 'Premium'}
              </div>
            )}
            <motion.button whileHover={{ scale: 1.05, background: 'rgba(239,68,68,0.2)' }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowShop(false)}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </motion.button>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,16,0.9)' }}>
            {[
              { id: 'packages', label: '💎 Paketler' },
              { id: 'skins',    label: '🎨 Skinler' },
              { id: 'gold',     label: '🪙 Gold Al' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: '"Exo 2",sans-serif',
                  color: tab === t.id ? theme.uiAccent : '#4b5563',
                  background: tab === t.id ? `rgba(${theme.glowColor},0.08)` : 'transparent',
                  borderBottom: tab === t.id ? `2px solid ${theme.uiAccent}` : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* CONTENT */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, scrollbarWidth: 'thin' }}>

            {/* PACKAGES */}
            {tab === 'packages' && (
              <div>
                {ownedPackage !== 'free' && (
                  <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 16, background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(236,72,153,0.08))', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28 }}>✦</span>
                    <div>
                      <div style={{ color: '#a78bfa', fontWeight: 900, fontSize: 14 }}>{PREMIUM_PACKAGES.find(p => p.id === ownedPackage)?.name} — Aktif</div>
                      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Tüm skin ve özelliklerden yararlanıyorsun</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {PREMIUM_PACKAGES.map(pkg => {
                    const owned = ownedPackage === pkg.id
                    const isUpgrade = !owned && (PREMIUM_PACKAGES.find(p => p.id === ownedPackage)?.tier || 0) < pkg.tier
                    return (
                      <motion.div key={pkg.id} whileHover={{ y: -4, boxShadow: `0 16px 40px ${pkg.color}33` }}
                        style={{
                          borderRadius: 20, overflow: 'hidden', position: 'relative',
                          background: `linear-gradient(160deg,${pkg.color}18 0%,rgba(5,5,15,0.95) 60%)`,
                          border: `1px solid ${owned ? pkg.color + '88' : pkg.color + '33'}`,
                          boxShadow: owned ? `0 0 24px ${pkg.color}44` : 'none',
                        }}>
                        {pkg.popular && !owned && (
                          <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', borderRadius: 20, background: pkg.color, color: '#000', fontSize: 10, fontWeight: 900 }}>🔥 POPÜLER</div>
                        )}
                        {pkg.bestValue && !owned && (
                          <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', borderRadius: 20, background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 900 }}>⭐ EN İYİ</div>
                        )}
                        {owned && (
                          <div style={{ position: 'absolute', top: 12, left: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.25)', border: '1px solid #22c55e', color: '#4ade80', fontSize: 10, fontWeight: 900 }}>✓ AKTİF</div>
                        )}
                        <div style={{ padding: '20px 18px' }}>
                          <div style={{ fontSize: 36, marginBottom: 8 }}>{pkg.icon || '💎'}</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{pkg.name}</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: pkg.color, marginBottom: 14 }}>{pkg.price}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
                            {pkg.features.map(f => (
                              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#9ca3af' }}>
                                <span style={{ color: pkg.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                          <motion.button whileHover={{ scale: owned ? 1 : 1.03 }} whileTap={{ scale: owned ? 1 : 0.97 }}
                            onClick={() => !owned && handleBuyPackage(pkg)}
                            disabled={owned}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 14, border: 'none', fontWeight: 900, fontSize: 13, cursor: owned ? 'default' : 'pointer', fontFamily: '"Exo 2",sans-serif',
                              background: owned ? 'rgba(34,197,94,0.15)' : `linear-gradient(135deg,${pkg.color},${pkg.color}bb)`,
                              color: owned ? '#4ade80' : '#fff',
                            }}>
                            {owned ? '✓ Aktif' : isUpgrade ? '↑ Yükselt' : 'Satın Al'}
                          </motion.button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SKINS */}
            {tab === 'skins' && (
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 16 }}>
                  Sahip olduğun skinler ({ownedSkins.length}/{SKINS.length}) — Gold ile yeni skinler al
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {SKINS.map(skin => {
                    const owned = ownedSkins.includes(skin.id)
                    const equipped = profile?.skin === skin.id
                    const locked = skin.premium && pkgTier < skin.tier && !owned
                    return (
                      <motion.div key={skin.id} whileHover={{ y: -3, boxShadow: `0 8px 24px ${skin.color}44` }}
                        onClick={() => !locked && handleBuySkin(skin)}
                        style={{
                          borderRadius: 16, overflow: 'hidden', cursor: locked ? 'not-allowed' : 'pointer',
                          background: equipped ? `${skin.color}22` : owned ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                          border: `2px solid ${equipped ? skin.color : owned ? skin.color + '44' : 'rgba(255,255,255,0.08)'}`,
                          opacity: locked ? 0.45 : 1,
                          padding: '14px 10px',
                          textAlign: 'center',
                          position: 'relative',
                        }}>
                        {equipped && (
                          <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        )}
                        <div style={{ fontSize: 32, marginBottom: 6 }}>{skin.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: owned ? '#e2e8f0' : '#6b7280', marginBottom: 4 }}>{skin.name}</div>
                        {skin.exclusive && (
                          <div style={{ fontSize: 10, color: skin.color, fontWeight: 900 }}>ÖZEL</div>
                        )}
                        {!owned && !skin.exclusive && (
                          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>🪙 {skin.price.toLocaleString()}</div>
                        )}
                        {owned && !equipped && (
                          <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 800 }}>Tak</div>
                        )}
                        {equipped && (
                          <div style={{ fontSize: 10, color: skin.color, fontWeight: 900 }}>✓ TAKİLI</div>
                        )}
                        {locked && (
                          <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700 }}>🔒 Premium</div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* GOLD */}
            {tab === 'gold' && (
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
                  Gold ile skin ve özellikler satın al. Mevcut bakiyen: <span style={{ color: '#fbbf24', fontWeight: 900 }}>🪙 {coins.toLocaleString()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {GOLD_PACKS.map(pack => (
                    <motion.div key={pack.id} whileHover={{ y: -4, boxShadow: `0 16px 40px ${pack.color}33` }}
                      style={{ borderRadius: 20, padding: '24px', background: `linear-gradient(160deg,${pack.color}18,rgba(5,5,15,0.95))`, border: `1px solid ${pack.color}44`, textAlign: 'center' }}>
                      <div style={{ fontSize: 48, marginBottom: 10 }}>{pack.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', marginBottom: 4 }}>{pack.amount.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: pack.bonus ? 4 : 12 }}>Gold</div>
                      {pack.bonus && (
                        <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 800, marginBottom: 12 }}>+ {pack.bonus}</div>
                      )}
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 16 }}>{pack.price}</div>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleBuyGold(pack)}
                        style={{ width: '100%', padding: '12px', borderRadius: 14, border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: '"Exo 2",sans-serif', background: `linear-gradient(135deg,${pack.color},${pack.color}aa)`, color: '#000' }}>
                        Satın Al
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmItem && (
          <ConfirmModal
            key="confirm"
            item={confirmItem}
            coins={coins}
            onConfirm={handleConfirm}
            onCancel={() => setConfirmItem(null)}
          />
        )}
      </AnimatePresence>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {paymentData && (
          <PaymentModal
            key="payment"
            packageId={paymentData.packageId}
            packageName={paymentData.packageName}
            priceLabel={paymentData.priceLabel}
            uid={user?.uid}
            email={user?.email}
            userName={user?.displayName || user?.email}
            onClose={() => setPaymentData(null)}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
