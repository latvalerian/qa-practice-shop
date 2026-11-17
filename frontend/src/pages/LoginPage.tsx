import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = location.pathname === '/register'
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (isRegister && password !== confirmPassword) {
      setMessage('The passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const body = isRegister
        ? { email, password, full_name: fullName, phone_number: phoneNumber }
        : { email, password, remember_me: rememberMe }
      const response = await fetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        const detail = typeof result?.detail === 'string' ? result.detail : 'Please check your details and try again.'
        throw new Error(detail)
      }
      window.dispatchEvent(new Event('cart-updated'))
      navigate('/account')
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'We could not complete this request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function explainPasswordReset() {
    setMessage('Password reset by email is unavailable until email delivery is configured. Contact the shop administrator to reset a local test account.')
  }

  return (
    <main className="main login-page">
      <section className={`login-card ${isRegister ? 'register-card' : ''}`}>
        <p className="hero-eyebrow">QA PRACTICE SHOP</p>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="login-intro">{isRegister ? 'Join the shop to check out faster and track your orders.' : 'Sign in to view orders and manage your account.'}</p>
        {message && <p className="cart-alert auth-message" role="alert">{message}</p>}
        <form onSubmit={(event) => void submit(event)}>
          {isRegister && (
            <>
              <label>Full name<input autoComplete="name" maxLength={120} required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></label>
              <label><span className="field-label">Phone number <span className="optional-label">Optional</span></span><input autoComplete="tel" maxLength={40} value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+1 (555) 010-2480" /></label>
            </>
          )}
          <label>Email address<input type="email" autoComplete="email" maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} maxLength={200} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {isRegister ? (
            <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={200} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" /></label>
          ) : (
            <div className="login-options">
              <label className="remember-option"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label>
              <button type="button" onClick={explainPasswordReset}>Forgot password?</button>
            </div>
          )}
          {isRegister && <p className="auth-privacy-note">Your password is stored securely and never shown in your account.</p>}
          <button className="cart-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="login-switch">
          {isRegister ? 'Already have an account?' : 'New to QA Practice Shop?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>
        <Link className="login-back-link" to="/#catalog">Continue shopping</Link>
      </section>
      <p className="auth-trust-note">Secure sign-in · Your data stays protected</p>
    </main>
  )
}

export default LoginPage
