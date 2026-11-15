
import { useEffect, useState } from 'react'

interface Product {
  id: number
  name: string
  description: string
  price_cents: number
  image_url: string | null
  stock_quantity: number
}


function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cartMessage, setCartMessage] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products')

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

  async function handleAddToCart(productId: number) {
    try {
      const response = await fetch('/api/cart/items', {
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
    } catch (error) {
      console.error(error)
      setCartMessage('Failed to add product to cart')
    }
  }

  return (
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
  )
}

export default CatalogPage
