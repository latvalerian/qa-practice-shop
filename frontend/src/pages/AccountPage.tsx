import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AccountUser, OrderSummary } from '../types'

type SettingsTab = 'profile' | 'payments' | 'security'
interface AccountPageProps {
  onSignOut: () => Promise<void>
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
const displayDate = (value: string) => new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

function AccountPage({ onSignOut }: AccountPageProps) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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
      setFullName(account.full_name ?? '')
      setPhoneNumber(account.phone_number ?? '')

      const orderResponse = await fetch('/api/orders')
      if (orderResponse.ok) setOrders(await orderResponse.json())
    } catch (loadError) {
      setMessage(loadError instanceof Error ? loadError.message : 'We could not load your account.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadAccount() }, [])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingProfile(true)
    setMessage('')
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone_number: phoneNumber }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : 'We could not save your profile.')
      setUser(result as AccountUser)
      setIsSettingsOpen(false)
      setMessage('Your account details were updated.')
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'We could not save your profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSecurityMessage('')
    if (newPassword !== confirmPassword) {
      setSecurityMessage('The new passwords do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setSecurityMessage('Choose a new password that is different from your current one.')
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : 'We could not update your password.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSecurityMessage('Password updated. Other active sessions have been signed out.')
      window.dispatchEvent(new Event('cart-updated'))
    } catch (passwordError) {
      setSecurityMessage(passwordError instanceof Error ? passwordError.message : 'We could not update your password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function cancelOrder(orderId: number) {
    setMessage('')
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.detail ?? 'This order cannot be cancelled.')
      await loadAccount()
      setMessage(`Order #${orderId} was cancelled.`)
    } catch (cancelError) {
      setMessage(cancelError instanceof Error ? cancelError.message : 'This order cannot be cancelled.')
    }
  }

  async function logout() {
    try {
      await onSignOut()
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

  const firstOrder = orders[0]
  const initials = (user.full_name || user.email).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

  return (
    <main className="main account-page">
      <div className="account-page-title">
        <div><h1>Your account</h1><p>Manage your profile, security and saved payment methods.</p></div>
      </div>

      {message && <p className="account-notice" role="status">{message}</p>}

      <div className="account-dashboard">
        <aside className="account-sidebar">
          <div className="account-sidebar-user">
            <div className="account-avatar small">{initials}</div>
            <strong>{user.full_name || user.email.split('@')[0]}</strong>
            <span>{user.email}</span>
          </div>
          <nav aria-label="Account sections">
            <a className="active" href="#overview">Overview</a>
            <a href="#orders">Orders</a>
            <a href="#payments">Saved payment methods</a>
            <a href="#addresses">Addresses</a>
            <a href="#security">Security</a>
            <button type="button" onClick={() => void logout()}>Sign out</button>
          </nav>
        </aside>

        <div className="account-dashboard-content" id="overview">
          <section className="account-summary-card">
            <div className="account-avatar">{initials}</div>
            <div className="account-summary-copy">
              <h2>{user.full_name || user.email.split('@')[0]}</h2>
              <p>{user.email}<span>·</span><span className={`role-badge ${user.role === 'admin' ? 'admin' : ''}`}>{user.role === 'admin' ? 'Administrator' : 'Customer'}</span></p>
              <small>Account status: Active <span>·</span> Member since {new Date(user.created_at).getFullYear()} <span>·</span> {orders.length} recent {orders.length === 1 ? 'order' : 'orders'}</small>
            </div>
            <button type="button" className="account-outline-button" onClick={() => { setSettingsTab('profile'); setIsSettingsOpen(true) }}>Edit profile</button>
          </section>

          <div className="account-overview-grid">
            <section className="account-info-card" id="payments">
              <div className="account-card-heading"><h2>Saved payment methods</h2><span className="account-card-icon">▤</span></div>
              <div className="payment-empty-state"><span>No saved cards</span><small>Card details are not collected or stored in this practice shop.</small></div>
              <button type="button" className="account-accent-button" onClick={() => { setSettingsTab('payments'); setIsSettingsOpen(true) }}>Manage payment methods</button>
            </section>

            <section className="account-info-card" id="security">
              <div className="account-card-heading"><h2>Security</h2><span className="account-card-icon">⌑</span></div>
              <p className="security-state">Password <strong>Protected</strong></p>
              <p className="security-secondary">Passwords are stored as salted hashes and never displayed.</p>
              <div className="account-card-actions">
                <button type="button" className="account-outline-button" onClick={() => { setSettingsTab('security'); setSecurityMessage(''); setIsSettingsOpen(true) }}>Change password</button>
                <span className="disabled-security-option">Two-step verification · Not configured</span>
              </div>
            </section>
          </div>

          <section className="account-info-card recent-orders-card" id="orders">
            <div className="account-card-heading"><div className="recent-order-title"><h2>Recent order</h2>{firstOrder && <span>#{firstOrder.id} · {money(firstOrder.total_cents)}</span>}</div>
              <Link to="#orders-list">View orders</Link>
            </div>
            {firstOrder ? (
              <div className="recent-order-row">
                <span>{displayDate(firstOrder.created_at)}</span>
                <span className={`order-status status-${firstOrder.status.toLowerCase()}`}>{firstOrder.status.replace(/_/g, ' ')}</span>
                {firstOrder.status === 'PENDING_PAYMENT' && <button type="button" onClick={() => void cancelOrder(firstOrder.id)}>Cancel order</button>}
              </div>
            ) : <p className="account-empty-orders">No orders yet. <Link to="/#catalog">Start shopping</Link></p>}
          </section>

          <section className="account-info-card address-info-card" id="addresses">
            <div className="account-card-heading"><h2>Addresses</h2></div>
            <p>Delivery details are securely recorded with each order. Saved address management is not enabled yet.</p>
          </section>

          <section className="account-order-list" id="orders-list">
            <div className="account-card-heading"><h2>Order history</h2><span>{orders.length} total</span></div>
            {orders.length ? orders.map((order) => (
              <article className="account-order-row" key={order.id}>
                <div><strong>Order #{order.id}</strong><span>{displayDate(order.created_at)}</span></div>
                <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status.replace(/_/g, ' ')}</span>
                <strong>{money(order.total_cents)}</strong>
                {order.status === 'PENDING_PAYMENT' && <button type="button" onClick={() => void cancelOrder(order.id)}>Cancel order</button>}
              </article>
            )) : <p className="account-empty-orders">You have no previous orders.</p>}
          </section>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="account-settings-backdrop" onMouseDown={() => setIsSettingsOpen(false)}>
          <section className="account-settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="settings-modal-heading">
              <div><h2 id="settings-title">Manage account</h2><p>Profile, payment methods and security</p></div>
              <button type="button" aria-label="Close account settings" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            <div className="settings-tabs" role="tablist" aria-label="Account settings">
              {(['profile', 'payments', 'security'] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={settingsTab === tab} className={settingsTab === tab ? 'selected' : ''} onClick={() => setSettingsTab(tab)}>
                  {tab === 'profile' ? 'Profile' : tab === 'payments' ? 'Payment methods' : 'Security'}
                </button>
              ))}
            </div>

            {settingsTab === 'profile' && (
              <form className="settings-profile-form" onSubmit={(event) => void saveProfile(event)}>
                <div><h3>Personal details</h3>
                  <label>Full name<input required maxLength={120} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
                  <label>Email address<input type="email" value={user.email} readOnly /></label>
                  <label>Phone number<input maxLength={40} autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Add a phone number" /></label>
                </div>
                <div className="settings-form-actions"><button type="button" className="account-outline-button" onClick={() => setIsSettingsOpen(false)}>Cancel</button><button className="account-accent-button" type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving…' : 'Save changes'}</button></div>
              </form>
            )}

            {settingsTab === 'payments' && (
              <div className="settings-safe-payments">
                <h3>Payment methods</h3>
                <div className="payment-empty-large"><span className="payment-lock" aria-hidden="true">◇</span><strong>Secure card storage is not connected</strong><p>This practice shop does not collect card numbers or security codes. A payment provider must be connected before cards can be added.</p></div>
              </div>
            )}

            {settingsTab === 'security' && (
              <form className="settings-security-form" onSubmit={(event) => void changePassword(event)}>
                <div><h3>Change your password</h3><p>Choose a unique password with at least 8 characters. Changing it signs out other active sessions.</p></div>
                {securityMessage && <p className={`security-form-message ${securityMessage.startsWith('Password updated') ? 'success' : ''}`} role="status">{securityMessage}</p>}
                <label>Current password<input type="password" required minLength={8} maxLength={200} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
                <label>New password<input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
                <label>Confirm new password<input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
                <div className="settings-form-actions"><button type="button" className="account-outline-button" onClick={() => setIsSettingsOpen(false)}>Cancel</button><button className="account-accent-button" type="submit" disabled={isChangingPassword}>{isChangingPassword ? 'Updating…' : 'Update password'}</button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default AccountPage
