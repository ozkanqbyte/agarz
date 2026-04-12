import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useProgressStore from '../../store/useProgressStore'
import usePremiumStore from '../../store/usePremiumStore'
import useAuthStore from '../../store/useAuthStore'
import { fbSavePremium } from '../../firebase/syncService'

export default function PaymentResultPage({ success }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [applied, setApplied] = useState(false)

  const { addCoins } = useProgressStore()
  const { mockPurchasePackage } = usePremiumStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!success || applied) return
    const uid = searchParams.get('uid')
    const gold = parseInt(searchParams.get('gold') || '0', 10)
    const premium = searchParams.get('premium')

    if (!uid || uid !== user?.uid) return

    if (gold > 0) {
      addCoins(gold)
    }
    if (premium) {
      mockPurchasePackage(premium)
    }
    setApplied(true)
  }, [success, user])

  return (
    <div style={{
      minHeight: '100vh', background: '#07071a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: '#0d0d24',
          border: `1.5px solid ${success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 24,
          padding: '48px 40px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}
      >
        <div style={{ fontSize: 64 }}>{success ? '🎉' : '❌'}</div>
        <div style={{
          fontWeight: 900, fontSize: 22, color: '#fff',
          letterSpacing: 1,
        }}>
          {success ? 'Ödeme Başarılı!' : 'Ödeme Başarısız'}
        </div>
        <div style={{ color: success ? '#4ade80' : '#f87171', fontSize: 14, fontWeight: 700 }}>
          {success
            ? 'Gold / Premium hesabınıza eklendi!'
            : 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.'}
        </div>
        {success && (
          <div style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 12, padding: '12px 20px',
            color: '#86efac', fontSize: 13, fontWeight: 600,
          }}>
            ✅ Gold & paket hesabınıza aktarıldı
          </div>
        )}
        <motion.button
          onClick={() => navigate('/shop')}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          style={{
            marginTop: 8,
            background: success ? '#22c55e' : '#6366f1',
            border: 'none', borderRadius: 12,
            color: '#fff', fontWeight: 900, fontSize: 14,
            padding: '13px 32px', cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          {success ? 'MAĞAZAYA DÖN' : 'TEKRAR DENE'}
        </motion.button>
        <button
          onClick={() => navigate('/menu')}
          style={{
            background: 'none', border: 'none',
            color: '#4b5563', fontSize: 12, cursor: 'pointer',
            textDecoration: 'underline', fontWeight: 600,
          }}
        >
          Ana Menüye Dön
        </button>
      </motion.div>
    </div>
  )
}
