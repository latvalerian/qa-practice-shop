import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccountUser, OrderSummary } from '../types'

interface AccountPreviewProps {
  onClose: () => void
}

function AccountPreview({ onClose }: AccountPreviewProps) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [recentOrder, setRecentOrder] = useState<OrderSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.status === 401) {
          if (!cancelled) setUser(null)
          return
        }
        if (!response.ok) throw new Error('Could not load your account.')
        const account: AccountUser = await response.json()
        if (cancelled) return
        setUser(account)

        const ordersResponse = await fetch('/api/orders')
        if (ordersResponse.ok) {
          const orders: OrderSummary[] = await ordersResponse.json()
          if (!cancelled) setRecentOrder(orders[0] ?? null)
        }
      } catch {
        if (!cancelled) setError('Account details are temporarily unavailable.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAccount()
    return () => { cancelled = true }
  }, [])

  return (
    <section className="quick-panel account-preview" aria-label="Account preview">
      <div className="quick-panel-heading">
        <h2>Your account</h2>
        <button type="button" onClick={onClose} aria-label="Close account preview">×</button>
      </div>

      {isLoading ? <p className="quick-panel-message">Loading your account…</p> : error ? (
        <p className="quick-panel-message">{error}</p>
      ) : user ? (
        <>
          <div className="account-preview-user">
            <strong>{user.email.split('@')[0]}</strong>
            <span>{user.email}</span>
          </div>
          <div className="account-preview-links">
            <Link to="/account#orders" onClick={onClose}>My orders <span>›</span></Link>
            <Link to="/account#profile" onClick={onClose}>Account details <span>›</span></Link>
            <Link to="/account#security" onClick={onClose}>Security &amp; password <span>›</span></Link>
          </div>
          {recentOrder && <p className="recent-order-note">Recent order · #{recentOrder.id}</p>}
          <Link className="preview-primary" to="/account" onClick={onClose}>Open full account</Link>
        </>
      ) : (
        <div className="account-preview-guest">
          <p>Sign in to view your orders and account details.</p>
          <Link className="preview-primary" to="/login" onClick={onClose}>Sign in</Link>
          <Link className="preview-secondary" to="/login?mode=register" onClick={onClose}>Create account</Link>
        </div>
      )}
    </section>
  )
}

export default AccountPreview
