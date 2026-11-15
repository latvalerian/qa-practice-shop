
import { useEffect, useState } from 'react'
import './App.css'

interface Product {
  id: number
  name: string
  description: string
  price_cents: number
  image_url: string | null
  stock_quantity: number
}

interface CartItem {
  product_id: number
  name: string
  unit_price_cents: number
  quantity: number
  image_url: string | null
  line_total_cents: number
}

interface Cart {
  items: CartItem[]
  total_cents: number
  currency: string
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [cartMessage, setCartMessage] = useState('')
  const [cart, setCart] = useState<Cart | null>(null)
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/products')

        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const data: Product[] = await response.json()
        setProducts(data)
      } catch (error) {
        console.error(error)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    fetchCart()
  }, [])
async function fetchCart() {
  try {
    const response = await fetch('/cart')

    if (!response.ok) {
      throw new Error('Failed to fetch cart')
    }

    const data: Cart = await response.json()

    setCart(data)
  } catch (error) {
    console.error(error)
  }
}
  async function handleAddToCart(productId: number) {
    try {
      const response = await fetch('/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add product to cart')
      }

      setCartMessage('Product added to cart')
      await fetchCart()
    } catch (error) {
      console.error(error)
      setCartMessage('Failed to add product to cart')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Practice Shop</h1>
        <span>
  Cart: {cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0}
</span>
        <nav>
          <a href="/">Catalog</a>
          <a href="/cart">Cart</a>
          <a href="/login">Login</a>
        </nav>
      </header>

<main className="main">
  <h2>Products</h2>
{cartMessage && <p>{cartMessage}</p>}
  <div className="products">
    {products.map((product) => (
      <div className="product" key={product.id}>
        {product.image_url && (
  <img
    src={product.image_url}
    alt={product.name}
    className="product-image"
  />
)}
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <p>Price: ${(product.price_cents / 100).toFixed(2)}</p>
        <p className={product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}>
  {product.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
</p>

<button
  onClick={() => handleAddToCart(product.id)}
  disabled={product.stock_quantity <= 0}
>
  Add to cart
</button>
      </div>
    ))}
  </div>
</main>
    </div>
  )
}

export default App
