
import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import './App.css'

import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'

function App() {
  const [cartCount, setCartCount] = useState(0)

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

  return (
    <div className="app">
      <header className="header">
        <h1>Practice Shop</h1>

        <nav>
          <Link to="/">Catalog</Link>
          <Link to="/cart">Cart ({cartCount})</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  )
}

export default App
