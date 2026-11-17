import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AccountUser, OrderSummary } from '../types'

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function AccountPage() {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function loadAccount() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/me')
      if (response.status === 401) {
        setUser(null)
        return
      }
      if (!response.ok) throw new Error('We could not load your account.')
      const account: AccountUser = await response.json()
      setUser(account)

      const orderResponse = await fetch('/api/orders')
      if (orderResponse.ok) setOrders(await orderResponse.json())
    } catch (loadError) {
      setMessage(loadError instanceof Error ? loadError.message : 'We could not load your account.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadAccount() }, [])

  async function cancelOrder(orderId: number) {
    setMessage('')
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.detail ?? 'This order cannot be cancelled.')
      await loadAccount()
    } catch (cancelError) {
      setMessage(cancelError instanceof Error ? cancelError.message : 'This order cannot be cancelled.')
    }
  }

  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('We could not sign you out. Please try again.')
      window.dispatchEvent(new Event('cart-updated'))
      navigate('/login')
    } catch (logoutError) {
      setMessage(logoutError instanceof Error ? logoutError.message : 'We could not sign you out.')
    }
  }

  if (isLoading) return <main className="main account-page"><p>Loading your account…</p></main>

  if (!user) {
    return (
      <main className="main account-page">
        <section className="account-guest-card">
          <h1>Your account</h1>
          <p>Sign in to view your orders and manage your account.</p>
          {message && <p className="cart-alert" role="alert">{message}</p>}
          <Link className="cart-primary-button" to="/login">Sign in</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="main account-page">
      <div className="account-page-heading">
        <div><p className="hero-eyebrow">YOUR ACCOUNT</p><h1>Welcome back</h1><span>{user.email}</span></div>
        <button type="button" className="account-logout" onClick={() => void logout()}>Sign out</button>
      </div>
      {message && <p className="cart-alert" role="alert">{message}</p>}
      <section className="account-section" id="profile">
        <h2>Account details</h2>
        <div className="account-detail-row"><span>Email address</span><strong>{user.email}</strong></div>
      </section>
      <section className="account-section" id="orders">
        <div className="account-section-heading"><h2>My orders</h2><span>{orders.length} total</span></div>
        {orders.length ? (
          <div className="account-orders">
            {orders.map((order) => (
              <article className="account-order-row" key={order.id}>
                <div><strong>Order #{order.id}</strong><span>{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status.replace(/_/g, ' ')}</span>
                <strong>{money(order.total_cents)}</strong>
                {order.status === 'PENDING_PAYMENT' && <button type="button" onClick={() => void cancelOrder(order.id)}>Cancel order</button>}
              </article>
            ))}
          </div>
        ) : <p className="account-empty-orders">You have no orders yet. <Link to="/#catalog">Browse the catalog</Link></p>}
      </section>
      <section className="account-section account-security" id="security">
        <h2>Security</h2>
        <p>Password management is not available yet. Your account is protected by a secure session.</p>
      </section>
    </main>
  )
}

export default AccountPage
