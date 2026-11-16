
import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import './App.css'

import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'

const searchSuggestions = [
  'Gaming Monitor',
  'Wireless Gaming Mouse',
  'Mechanical Keyboard',
  'Gaming Headset',
  'Graphics Card',
  'Gaming Laptop',
  'Wireless Headphones',
  'Gaming Chair',
  'Webcam',
  'USB Microphone',
  'Computer Accessories',
]

const popularSearches = [
  'RTX 5080 Ti',
  'MSI Monitor',
  'Logitech G502 Mouse',
  'ASUS ROG Keyboard',
  'Laptop Cooling Pad',
  'Intel Core i9',
]

function App() {
  const [cartCount, setCartCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">
            Practice<span>Shop</span>
          </Link>

          
<div
  className={`header-search ${isSearchFocused ? 'focused' : ''}`}
  onClick={() => searchInputRef.current?.focus()}
>
  <span className="search-icon">⌕</span>

  <label className="search-label" htmlFor="product-search">
  Search
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
            transition: isTransitionEnabled
              ? 'transform 0.45s ease'
              : 'none',
          }}
          onTransitionEnd={() => {
            if (suggestionIndex === searchSuggestions.length) {
              setIsTransitionEnabled(false)
              setSuggestionIndex(0)
            }
          }}
        >
          {[...searchSuggestions, searchSuggestions[0]].map(
            (suggestion, index) => (
              <div className="suggestion-item" key={index}>
                {suggestion}
              </div>
            )
          )}
        </div>
      </div>
    )}
  </div>

  <button
    className="search-filter"
    type="button"
    aria-label="Filters"
    onClick={(event) => event.stopPropagation()}
  >
    ☷
  </button>

  {isSearchFocused && !searchQuery && (
    <div
      className="search-dropdown"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="dropdown-title">Popular searches</p>

      {popularSearches.map((item) => (
        <button
          type="button"
          className="popular-search-item"
          key={item}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setSearchQuery(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )}
</div>

          <nav className="header-actions">
            <Link to="/">Catalog</Link>
            <Link to="/cart">Cart ({cartCount})</Link>
            <Link to="/login">Account</Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={<CatalogPage searchQuery={searchQuery} />}
        />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  )
}

export default App
