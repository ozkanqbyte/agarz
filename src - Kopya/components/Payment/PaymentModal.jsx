import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://agarz-production.up.railway.app'

export default function PaymentModal({ packageId, packageName, priceLabel, uid, email, userName, onClose }) {
  const [step, setStep] = useState('loading')
  const [paytrToken, setPaytrToken] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!packageId) return
    initPayment()
  }, [packageId])

  async function initPayment() {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch(`${SERVER_URL}/payment/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, uid, email, name: userName || 'Oyuncu' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Ödeme başlatılamadı')
        setStep('error')
        return
      }
      setPaytrToken(data.token)
      setStep('form')
    } catch {
      setError('Sunucuya bağlanılamadı')
      setStep('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        style={{
          background: '#0d0d24',
          border: '1.5px solid rgba(99,102,241,0.35)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(99,102,241,0.06)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>{packageName}</div>
            <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>{priceLabel} — PayTR Güvenli Ödeme</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: 'none',
            borderRadius: 8, color: '#9ca3af', cursor: 'pointer',
            fontSize: 18, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {step === 'loading' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 60, gap: 16,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '3px solid rgba(99,102,241,0.2)',
                borderTopColor: '#6366f1',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ color: '#6b7280', fontSize: 13 }}>Ödeme formu hazırlanıyor...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>❌</div>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 15 }}>Ödeme Başlatılamadı</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{error}</div>
              <button onClick={initPayment} style={{
                background: '#6366f1', border: 'none', borderRadius: 10,
                color: '#fff', fontWeight: 800, fontSize: 13,
                padding: '10px 24px', cursor: 'pointer', marginTop: 8,
              }}>Tekrar Dene</button>
            </div>
          )}

          {step === 'form' && paytrToken && (
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
              style={{
                width: '100%',
                height: '520px',
                border: 'none',
                display: 'block',
              }}
              allow="payment"
              title="PayTR Ödeme"
            />
          )}
        </div>

        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>
            🔒 256-bit SSL · PayTR güvencesiyle · Kredi kartı · Banka kartı · Mobil ödeme
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
