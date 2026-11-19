
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import AccountPage from './pages/AccountPage'
import AccountPreview from './components/AccountPreview'
import CartPreview from './components/CartPreview'
import type { CartResponse } from './types'

const searchSuggestions = [
  'headphones',
  'keyboard',
  'monitor',
  'mouse',
  'laptop',
]

const popularSearches = [
  'RTX 5080 Ti',
  'MSI Monitor',
  'Logitech G502 Mouse',
  'ASUS ROG Keyboard',
  'Laptop Cooling Pad',
  'Intel Core i9',
]

const quickSearches = ['Headphones', 'Keyboards', 'Monitors']

type ConfirmationRequest = {
  title: string
  message: string
  confirmLabel: string
}

function App() {
  const [cart, setCart] = useState<CartResponse>({ items: [], total_cents: 0, currency: 'USD' })
  const [isCartLoading, setIsCartLoading] = useState(false)
  const [activePreview, setActivePreview] = useState<'cart' | 'account' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true)
  const [isSiteSearchOpen, setIsSiteSearchOpen] = useState(false)
  const [siteSearchQuery, setSiteSearchQuery] = useState('')
  const [cartNotice, setCartNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null)
  const cartNoticeTimeoutRef = useRef<number | null>(null)
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null)
  const confirmationCancelRef = useRef<HTMLButtonElement>(null)
  const aboutHighlightTimeoutRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const siteSearchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  async function fetchCart() {
    setIsCartLoading(true)
    try {
      const response = await fetch('/api/cart')

      if (!response.ok) {
        throw new Error('Failed to fetch cart')
      }

      const data = await response.json()

      setCart(data as CartResponse)
    } catch (error) {
      console.error(error)
    } finally {
      setIsCartLoading(false)
    }
  }

  async function updateCartQuantity(productId: number, quantity: number) {
    if (quantity < 1) {
      const item = cart.items.find((cartItem) => cartItem.product_id === productId)
      const confirmed = await requestConfirmation({
        title: 'Remove item from cart?',
        message: item?.name ?? 'This item will be removed from your cart.',
        confirmLabel: 'Remove item',
      })
      if (!confirmed) return
    }
    const response = quantity < 1
      ? await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' })
      : await fetch(`/api/cart/items/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        })
    const data = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.detail ?? 'Could not update your cart.')
    if (data) setCart(data as CartResponse)
    else await fetchCart()
  }

  function requestConfirmation(request: ConfirmationRequest) {
    return new Promise<boolean>((resolve) => {
      confirmationResolverRef.current?.(false)
      confirmationResolverRef.current = resolve
      setConfirmation(request)
    })
  }

  function finishConfirmation(confirmed: boolean) {
    const resolve = confirmationResolverRef.current
    confirmationResolverRef.current = null
    setConfirmation(null)
    resolve?.(confirmed)
  }

  async function confirmSignOut() {
    const confirmed = await requestConfirmation({
      title: 'Sign out?',
      message: 'Are you sure you want to sign out of your account?',
      confirmLabel: 'Sign out',
    })
    if (!confirmed) return

    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw new Error('We could not sign you out. Please try again.')

    setActivePreview(null)
    window.dispatchEvent(new Event('cart-updated'))
    navigate('/login')
  }

  useEffect(() => {
    void fetchCart()
    const refreshCart = () => { void fetchCart() }
    window.addEventListener('cart-updated', refreshCart)
    return () => window.removeEventListener('cart-updated', refreshCart)
  }, [])

  useEffect(() => {
    const updateScrollState = () => setShowBackToTop(window.scrollY > 360)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  useEffect(() => () => {
    if (cartNoticeTimeoutRef.current !== null) window.clearTimeout(cartNoticeTimeoutRef.current)
    if (aboutHighlightTimeoutRef.current !== null) window.clearTimeout(aboutHighlightTimeoutRef.current)
  }, [])

  function showCartNotice(message: string, type: 'success' | 'error' = 'success') {
    if (cartNoticeTimeoutRef.current !== null) window.clearTimeout(cartNoticeTimeoutRef.current)
    setCartNotice({ message, type })
    cartNoticeTimeoutRef.current = window.setTimeout(() => setCartNotice(null), 2600)
  }

  function handleAboutClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    const footer = document.getElementById('about')
    if (!footer) return

    const footerBounds = footer.getBoundingClientRect()
    const stickyHeaderBottom = document.querySelector('.header')?.getBoundingClientRect().bottom ?? 0
    const footerIsVisible = footerBounds.bottom > stickyHeaderBottom && footerBounds.top < window.innerHeight
    if (!footerIsVisible) footer.scrollIntoView({ behavior: 'smooth', block: 'start' })

    footer.classList.remove('about-highlight')
    void footer.offsetWidth
    footer.classList.add('about-highlight')
    if (aboutHighlightTimeoutRef.current !== null) window.clearTimeout(aboutHighlightTimeoutRef.current)
    aboutHighlightTimeoutRef.current = window.setTimeout(() => footer.classList.remove('about-highlight'), 1300)
  }

  // Rotate suggestions only while the catalog route is mounted.
  useEffect(() => {
    if (location.pathname !== '/') return

    setSuggestionIndex(0)
    setIsTransitionEnabled(true)

    const interval = window.setInterval(() => {
      setSuggestionIndex((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [location.pathname])

  // Restore transition after seamless reset
  useEffect(() => {
    if (!isTransitionEnabled) {
      const frame = requestAnimationFrame(() => {
        setIsTransitionEnabled(true)
      })

      return () => cancelAnimationFrame(frame)
    }
  }, [isTransitionEnabled])

  useEffect(() => {
    if (isSiteSearchOpen) siteSearchInputRef.current?.focus()
  }, [isSiteSearchOpen])

  useEffect(() => {
    if (!confirmation) return
    confirmationCancelRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finishConfirmation(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [confirmation])

  useEffect(() => {
    if (!activePreview) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePreview(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activePreview])

  const closeSiteSearch = () => {
    setIsSiteSearchOpen(false)
    setSiteSearchQuery('')
  }

  const siteSections = [
    { title: 'Catalog', detail: 'Browse and search all products', to: '/#catalog' },
    { title: 'About', detail: 'Project goals, author and social links', to: '/#about' },
    { title: 'Cart', detail: 'Review items in your shopping cart', to: '/cart' },
    { title: 'Account', detail: 'Sign in or manage your account', to: '/account' },
  ]

  const matchingSections = siteSections.filter((section) =>
    `${section.title} ${section.detail}`.toLowerCase().includes(siteSearchQuery.trim().toLowerCase())
  )

  function searchCatalog(query: string) {
    setSearchQuery(query)
    closeSiteSearch()
    navigate('/')
    window.setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  return (
    <div className="app">
      <header className={`header ${location.pathname === '/login' || location.pathname === '/register' ? 'header-auth' : ''}`}>
        <div className="header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">Q</span> QA Practice Shop
          </Link>

          <nav className="primary-nav" aria-label="Main navigation">
            <Link to="/#catalog">Catalog</Link>
            <Link to="/#about" onClick={handleAboutClick}>About</Link>
          </nav>

          <nav className="header-actions">
            <button
              className={`icon-action ${isSiteSearchOpen ? 'active' : ''}`}
              type="button"
              aria-label="Search the site"
              aria-expanded={isSiteSearchOpen}
              onClick={() => { setActivePreview(null); setIsSiteSearchOpen(true) }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.2" /><path d="m15.4 15.4 4.1 4.1" /></svg>
            </button>
            <button
              type="button"
              className={`icon-action ${activePreview === 'cart' || location.pathname === '/cart' ? 'active' : ''}`}
              aria-label={`Open cart preview, ${cartCount} items`}
              aria-expanded={activePreview === 'cart'}
              onClick={() => {
                setActivePreview((current) => current === 'cart' ? null : 'cart')
                void fetchCart()
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
            <button
              type="button"
              className={`icon-action ${activePreview === 'account' || location.pathname === '/account' || location.pathname === '/login' ? 'active' : ''}`}
              aria-label="Open account preview"
              aria-expanded={activePreview === 'account'}
              onClick={() => setActivePreview((current) => current === 'account' ? null : 'account')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
            </button>
          </nav>
        </div>
      </header>

      {isSiteSearchOpen && (
        <div className="site-search-backdrop" onMouseDown={closeSiteSearch}>
          <section
            className="site-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-search-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeSiteSearch()
            }}
          >
            <div className="site-search-heading">
              <div>
                <p id="site-search-title">Where would you like to go?</p>
                <span>Search pages and products across QA Practice Shop</span>
              </div>
              <button type="button" className="site-search-close" onClick={closeSiteSearch} aria-label="Close site search">×</button>
            </div>
            <div className="site-search-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.2" /><path d="m15.4 15.4 4.1 4.1" /></svg>
              <input
                ref={siteSearchInputRef}
                value={siteSearchQuery}
                onChange={(event) => setSiteSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && siteSearchQuery.trim()) searchCatalog(siteSearchQuery.trim())
                }}
                placeholder="Search the site..."
                aria-label="Search pages and products"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="site-search-results">
              <p className="site-search-section-label">{siteSearchQuery ? 'Pages' : 'Explore'}</p>
              {matchingSections.map((section) => (
                <Link key={section.title} to={section.to} onClick={(event) => {
                  closeSiteSearch()
                  if (section.title === 'About') handleAboutClick(event)
                }} className="site-search-result">
                  <span className="site-search-result-icon" aria-hidden="true">{section.title === 'Cart' ? '▱' : section.title === 'Account' ? '○' : '⌕'}</span>
                  <span><strong>{section.title}</strong><small>{section.detail}</small></span>
                  <span className="site-search-arrow">↗</span>
                </Link>
              ))}
              {siteSearchQuery.trim() && (
                <button type="button" className="site-search-result catalog-search-result" onClick={() => searchCatalog(siteSearchQuery.trim())}>
                  <span className="site-search-result-icon" aria-hidden="true">⌕</span>
                  <span><strong>Search catalog for “{siteSearchQuery.trim()}”</strong><small>Find matching products</small></span>
                  <span className="site-search-arrow">↗</span>
                </button>
              )}
              {matchingSections.length === 0 && siteSearchQuery.trim() && <p className="site-search-empty">No matching pages. Search the catalog below instead.</p>}
            </div>
            <p className="site-search-hint">Search pages directly, or press Enter to search the product catalog.</p>
          </section>
        </div>
      )}

      {activePreview && (
        <>
          <div className="quick-preview-backdrop" onMouseDown={() => setActivePreview(null)} />
          <div className="quick-preview-anchor" onMouseDown={(event) => event.stopPropagation()}>
            {activePreview === 'cart' ? (
              <CartPreview cart={cart} isLoading={isCartLoading} onClose={() => setActivePreview(null)} onUpdateQuantity={updateCartQuantity} />
            ) : (
              <AccountPreview onClose={() => setActivePreview(null)} onSignOut={confirmSignOut} />
            )}
          </div>
        </>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <CatalogPage
              searchQuery={searchQuery}
              onCartNotice={showCartNotice}
              confirmAction={requestConfirmation}
              searchBar={
                <div
                  className={`header-search ${isSearchFocused ? 'focused' : ''}`}
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <span className="search-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.2" /><path d="m15.4 15.4 4.1 4.1" /></svg>
                  </span>
                  <label className="search-label" htmlFor="product-search">
                    What are you looking for? Try
                  </label>
                  <div className="search-field">
                    <input
                      id="product-search"
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      aria-label="Search products"
                    />
                    {!searchQuery && (
                      <div className="suggestion-window">
                        <div
                          className="suggestion-track"
                          style={{
                            transform: `translateY(-${suggestionIndex * 100}%)`,
                            transition: isTransitionEnabled ? 'transform 0.45s ease' : 'none',
                          }}
                          onTransitionEnd={() => {
                            if (suggestionIndex === searchSuggestions.length) {
                              setIsTransitionEnabled(false)
                              setSuggestionIndex(0)
                            }
                          }}
                        >
                          {[...searchSuggestions, searchSuggestions[0]].map((suggestion, index) => (
                            <div className="suggestion-item" key={index}>{suggestion}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {isSearchFocused && !searchQuery && (
                    <div className="search-dropdown" onClick={(event) => event.stopPropagation()}>
                      <p className="dropdown-title">Popular searches</p>
                      {popularSearches.map((item) => (
                        <button
                          type="button"
                          className="popular-search-item"
                          key={item}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setSearchQuery(item)}
                        >{item}</button>
                      ))}
                    </div>
                  )}
                </div>
              }
              quickSearches={quickSearches}
              onQuickSearch={setSearchQuery}
            />
          }
        />
        <Route path="/cart" element={<CartPage confirmAction={requestConfirmation} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage onSignOut={confirmSignOut} />} />
      </Routes>

      <footer className="shop-footer" id="about">
        <div className="footer-about">
          <strong>QA Practice Shop</strong>
          <p>A learning project for practicing quality assurance on a real-world style online store.</p>
        </div>
        <div className="footer-focus">
          <span>Practice areas</span>
          <p>UI testing · REST API · SQL · Responsive testing · Automation</p>
        </div>
        <div className="footer-links">
          <span>Project &amp; author</span>
          <a href="https://github.com/latvalerian/qa-practice-shop" target="_blank" rel="noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <a href="https://www.linkedin.com/in/valerian-latypov-8a3124448" target="_blank" rel="noreferrer">
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
          <a href="https://www.instagram.com/lat.valerian/" target="_blank" rel="noreferrer">
            Instagram <span aria-hidden="true">↗</span>
          </a>
          <a href="https://t.me/nbrthndth" target="_blank" rel="noreferrer">
            Telegram <span aria-hidden="true">↗</span>
          </a>
        </div>
      </footer>

      {cartNotice && <div className={`cart-toast ${cartNotice.type}`} role={cartNotice.type === 'error' ? 'alert' : 'status'}>{cartNotice.message}</div>}
      {confirmation && (
        <div className="site-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) finishConfirmation(false) }}>
          <section className="site-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="site-confirm-title" aria-describedby="site-confirm-message">
            <span className="site-confirm-mark" aria-hidden="true">?</span>
            <h2 id="site-confirm-title">{confirmation.title}</h2>
            <p id="site-confirm-message">{confirmation.message}</p>
            <div className="site-confirm-actions">
              <button type="button" className="site-confirm-cancel" ref={confirmationCancelRef} onClick={() => finishConfirmation(false)}>Cancel</button>
              <button type="button" className="site-confirm-accept" onClick={() => finishConfirmation(true)}>{confirmation.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
      {showBackToTop && (
        <button type="button" className="back-to-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
        </button>
      )}
    </div>
  )
}

export default App
