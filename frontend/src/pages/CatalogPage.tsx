
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface Product {
  id: number
  name: string
  description: string
  price_cents: number
  image_url: string | null
  stock_quantity: number
}

interface CatalogPageProps {
  searchQuery: string
  searchBar: ReactNode
  quickSearches: string[]
  onQuickSearch: (query: string) => void
}

const categories = ['All products', 'Computers', 'Peripherals', 'Audio', 'Accessories'] as const
type Category = (typeof categories)[number]

const categoryKeywords: Record<Exclude<Category, 'All products'>, string[]> = {
  Computers: ['computer', 'laptop', 'desktop', 'monitor', 'graphics card', 'gpu', 'processor', 'cpu'],
  Peripherals: ['mouse', 'keyboard', 'webcam', 'monitor', 'controller'],
  Audio: ['headphone', 'headset', 'microphone', 'speaker', 'earbud'],
  Accessories: ['accessor', 'cable', 'cooling pad', 'stand', 'chair', 'adapter'],
}

function CatalogPage({ searchQuery, searchBar, quickSearches, onQuickSearch }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cartMessage, setCartMessage] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('All products')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [maxPrice, setMaxPrice] = useState('any')
  const [sortOrder, setSortOrder] = useState('popular')

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

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase().trim()
    const productText = `${product.name} ${product.description}`.toLowerCase()
    const matchesQuery = productText.includes(query)
    const matchesCategory = selectedCategory === 'All products' ||
      categoryKeywords[selectedCategory].some((keyword) => productText.includes(keyword))
    const matchesStock = !inStockOnly || product.stock_quantity > 0
    const matchesPrice = maxPrice === 'any' || product.price_cents <= Number(maxPrice) * 100

    return matchesQuery && matchesCategory && matchesStock && matchesPrice
  })

  const sortedProducts = [...filteredProducts].sort((first, second) => {
    if (sortOrder === 'price-low') return first.price_cents - second.price_cents
    if (sortOrder === 'price-high') return second.price_cents - first.price_cents
    if (sortOrder === 'name') return first.name.localeCompare(second.name)
    return 0
  })

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
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error(error)
      setCartMessage('Failed to add product to cart')
    }
  }

  return (
    <main className="main" id="home">
      <section className="catalog-hero" aria-labelledby="catalog-hero-title">
        <p className="hero-eyebrow">TECH &amp; ACCESSORIES</p>
        <h1 id="catalog-hero-title">Find what you need.</h1>
        <p className="hero-description">Great gear for work, play, and everything in between.</p>
        {searchBar}
        <div className="quick-searches" aria-label="Popular searches">
          <span>Popular:</span>
          {quickSearches.map((item) => (
            <button type="button" key={item} onClick={() => onQuickSearch(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <nav className="category-pills" aria-label="Product categories">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={selectedCategory === category ? 'selected' : ''}
            aria-pressed={selectedCategory === category}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <div className="catalog-heading" id="catalog">
        <div className="catalog-title-group">
          <h2>Catalog</h2>
          <span>{filteredProducts.length} items</span>
        </div>
        <div className="catalog-controls">
          <div className="filter-control-wrap">
            <button
              type="button"
              className={`filter-trigger ${isFilterOpen || inStockOnly || maxPrice !== 'any' ? 'selected' : ''}`}
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              Filters
              {(inStockOnly || maxPrice !== 'any') && <span className="filter-dot" aria-label="Filters active" />}
            </button>
            {isFilterOpen && (
              <div className="filter-popover">
                <p>Filter products</p>
                <label className="stock-filter">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => setInStockOnly(event.target.checked)}
                  />
                  In stock only
                </label>
                <label className="price-filter" htmlFor="max-price">Maximum price</label>
                <select id="max-price" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}>
                  <option value="any">Any price</option>
                  <option value="100">Up to $100</option>
                  <option value="250">Up to $250</option>
                  <option value="500">Up to $500</option>
                </select>
                <button
                  type="button"
                  className="clear-filters"
                  onClick={() => { setInStockOnly(false); setMaxPrice('any') }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          <label className="sort-control" aria-label="Sort products">
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="popular">Most popular first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>
      </div>

      {cartMessage && <p>{cartMessage}</p>}

      {filteredProducts.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="products">
          {sortedProducts.map((product) => (
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

              <p
                className={
                  product.stock_quantity > 0
                    ? 'in-stock'
                    : 'out-of-stock'
                }
              >
                {product.stock_quantity > 0
                  ? 'In stock'
                  : 'Out of stock'}
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
      )}

      <footer className="shop-footer">
        <div className="footer-about">
          <strong>QA Practice Shop</strong>
          <p>A learning project for practicing quality assurance on a real-world style online store.</p>
        </div>
        <div className="footer-focus">
          <span>Practice areas</span>
          <p>UI testing · REST API · SQL · Responsive testing · Automation</p>
        </div>
        <a href="https://github.com/latvalerian/qa-practice-shop" target="_blank" rel="noreferrer">
          View on GitHub <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </main>
  )
}

export default CatalogPage
