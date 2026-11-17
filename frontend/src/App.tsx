
import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'

const searchSuggestions = [
  'headphones',
  'keyboards',
  'monitors',
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

function App() {
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true)
  const [isSiteSearchOpen, setIsSiteSearchOpen] = useState(false)
  const [siteSearchQuery, setSiteSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const siteSearchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  async function fetchCart() {
    try {
      const response = await fetch('/api/cart')

      if (!response.ok) {
        throw new Error('Failed to fetch cart')
      }

      const data = await response.json()

      const count = data.items.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      )

      setCartCount(count)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchCart()
  }, [])

  // Rotate search suggestions every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((current) => current + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

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

  const closeSiteSearch = () => {
    setIsSiteSearchOpen(false)
    setSiteSearchQuery('')
  }

  const siteSections = [
    { title: 'Shop', detail: 'Browse the homepage and featured products', to: '/#home' },
    { title: 'Catalog', detail: 'Browse and search all products', to: '/#catalog' },
    { title: 'Cart', detail: 'Review items in your shopping cart', to: '/cart' },
    { title: 'Account', detail: 'Sign in or manage your account', to: '/login' },
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
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">Q</span> QA Practice Shop
          </Link>

          <nav className="primary-nav" aria-label="Main navigation">
            <Link to="/#home">Shop</Link>
            <Link to="/#catalog">Catalog</Link>
          </nav>

          <nav className="header-actions">
            <button
              className={`icon-action ${isSiteSearchOpen ? 'active' : ''}`}
              type="button"
              aria-label="Search the site"
              aria-expanded={isSiteSearchOpen}
              onClick={() => setIsSiteSearchOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.2" /><path d="m15.4 15.4 4.1 4.1" /></svg>
            </button>
            <Link to="/cart" className={`icon-action ${location.pathname === '/cart' ? 'active' : ''}`} aria-label={`Cart, ${cartCount} items`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
            <Link to="/login" className={`icon-action ${location.pathname === '/login' ? 'active' : ''}`} aria-label="Account">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
            </Link>
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
                <Link key={section.title} to={section.to} onClick={closeSiteSearch} className="site-search-result">
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

      <Routes>
        <Route
          path="/"
          element={
            <CatalogPage
              searchQuery={searchQuery}
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
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  )
}

export default App
