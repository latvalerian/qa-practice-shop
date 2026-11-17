import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const isRegister = searchParams.get('mode') === 'register'

  function switchMode(register: boolean) {
    setMessage('')
    if (register) setSearchParams({ mode: 'register' })
    else setSearchParams({})
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    try {
      const response = await fetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.detail ?? 'We could not sign you in.')
      window.dispatchEvent(new Event('cart-updated'))
      navigate('/account')
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'We could not complete this request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="main login-page">
      <section className="login-card">
        <p className="hero-eyebrow">QA PRACTICE SHOP</p>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="login-intro">{isRegister ? 'Create an account to save your cart and manage orders.' : 'Sign in to manage your orders and account.'}</p>
        {message && <p className="cart-alert" role="alert">{message}</p>}
        <form onSubmit={(event) => void submit(event)}>
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="cart-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="login-switch">
          {isRegister ? 'Already have an account?' : 'New to QA Practice Shop?'}{' '}
          <button type="button" onClick={() => switchMode(!isRegister)}>{isRegister ? 'Sign in' : 'Create an account'}</button>
        </p>
        <Link className="login-back-link" to="/#catalog">Continue shopping</Link>
      </section>
    </main>
  )
}

export default LoginPage
