
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartResponse } from '../types'

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
  onCartNotice: (message: string, type?: 'success' | 'error') => void
  confirmAction: (request: { title: string; message: string; confirmLabel: string }) => Promise<boolean>
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

const PRODUCTS_PER_PAGE = 20

function cartQuantityMap(cart: CartResponse) {
  return cart.items.reduce<Record<number, number>>((quantities, item) => {
    quantities[item.product_id] = item.quantity
    return quantities
  }, {})
}

function CatalogPage({ searchQuery, onCartNotice, confirmAction, searchBar, quickSearches, onQuickSearch }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cartQuantities, setCartQuantities] = useState<Record<number, number>>({})
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)
  const [selectedCategory, setSelectedCategory] = useState<Category>('All products')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterControlRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    let isCurrent = true
    const refreshCartQuantities = async () => {
      try {
        const response = await fetch('/api/cart')
        if (!response.ok) throw new Error('Could not load cart quantities.')
        const data: CartResponse = await response.json()
        if (isCurrent) setCartQuantities(cartQuantityMap(data))
      } catch (error) {
        console.error(error)
      }
    }
    const handleCartUpdated = () => { void refreshCartQuantities() }

    void refreshCartQuantities()
    window.addEventListener('cart-updated', handleCartUpdated)
    return () => {
      isCurrent = false
      window.removeEventListener('cart-updated', handleCartUpdated)
    }
  }, [])

  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE)
  }, [searchQuery, selectedCategory, inStockOnly, maxPrice, sortOrder])

  useEffect(() => {
    if (!isFilterOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!filterControlRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isFilterOpen])

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
  const visibleProducts = sortedProducts.slice(0, visibleCount)

  async function changeCartQuantity(product: Product, quantity: number) {
    const currentQuantity = cartQuantities[product.id] ?? 0
    if (busyProductId === product.id) return
    if (quantity < 1) {
      const confirmed = await confirmAction({
        title: 'Remove item from cart?',
        message: product.name,
        confirmLabel: 'Remove item',
      })
      if (!confirmed) return
    }

    setBusyProductId(product.id)
    try {
      const isNewItem = currentQuantity === 0 && quantity > 0
      const response = quantity === 0
        ? await fetch(`/api/cart/items/${product.id}`, { method: 'DELETE' })
        : isNewItem
          ? await fetch('/api/cart/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product_id: product.id, quantity }),
            })
          : await fetch(`/api/cart/items/${product.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity }),
            })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.detail ?? 'Could not update your cart.')
      }

      if (quantity === 0) {
        setCartQuantities((current) => {
          const updated = { ...current }
          delete updated[product.id]
          return updated
        })
        onCartNotice('Product removed from cart')
      } else if (response.status !== 204) {
        const data: CartResponse = await response.json()
        setCartQuantities(cartQuantityMap(data))
        if (isNewItem) onCartNotice('Product added to cart')
      }
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error(error)
      onCartNotice(error instanceof Error ? error.message : 'Could not update your cart.', 'error')
    } finally {
      setBusyProductId(null)
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
          <div className="filter-control-wrap" ref={filterControlRef}>
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

      {filteredProducts.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="products" id="product-list">
          {visibleProducts.map((product) => (
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
              <div className="product-price-row">
                <p>Price: ${(product.price_cents / 100).toFixed(2)}</p>
                {(cartQuantities[product.id] ?? 0) > 0 && (
                  <div className="product-cart-quantity" aria-label={`Quantity of ${product.name} in cart`}>
                    <button type="button" aria-label={`Decrease ${product.name} quantity`} disabled={busyProductId === product.id} onClick={() => void changeCartQuantity(product, (cartQuantities[product.id] ?? 0) - 1)}>−</button>
                    <span aria-live="polite">{cartQuantities[product.id]}</span>
                    <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={busyProductId === product.id} onClick={() => void changeCartQuantity(product, (cartQuantities[product.id] ?? 0) + 1)}>+</button>
                  </div>
                )}
              </div>

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
                onClick={() => void changeCartQuantity(product, (cartQuantities[product.id] ?? 0) + 1)}
                disabled={product.stock_quantity <= 0 || busyProductId === product.id || (cartQuantities[product.id] ?? 0) > 0}
              >
                {(cartQuantities[product.id] ?? 0) > 0 ? 'Added to cart' : 'Add to cart'}
              </button>
            </div>
          ))}
        </div>
      )}

      {visibleCount < sortedProducts.length && (
        <div className="show-more-wrap">
          <button
            type="button"
            className="show-more-button"
            aria-controls="product-list"
            onClick={() => setVisibleCount((count) => count + PRODUCTS_PER_PAGE)}
          >
            Show more
          </button>
        </div>
      )}

    </main>
  )
}

export default CatalogPage
