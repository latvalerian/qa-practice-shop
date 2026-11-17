import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { CartResponse } from '../types'

const emptyCart: CartResponse = { items: [], total_cents: 0, currency: 'USD' }
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function CartPage() {
  const [cart, setCart] = useState<CartResponse>(emptyCart)
  const [isLoading, setIsLoading] = useState(true)
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [orderId, setOrderId] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  async function loadCart() {
    try {
      const response = await fetch('/api/cart')
      if (!response.ok) throw new Error('We could not load your cart. Please try again.')
      const data: CartResponse = await response.json()
      setCart(data)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'We could not load your cart.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadCart() }, [])

  async function updateQuantity(productId: number, quantity: number) {
    setBusyProductId(productId)
    setError('')
    try {
      if (quantity < 1) {
        const response = await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Could not remove this item.')
        await loadCart()
      } else {
        const response = await fetch(`/api/cart/items/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.detail ?? 'Could not update the quantity.')
        setCart(data as CartResponse)
      }
      window.dispatchEvent(new Event('cart-updated'))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update your cart.')
    } finally {
      setBusyProductId(null)
    }
  }

  async function removeItem(productId: number) {
    setBusyProductId(productId)
    setError('')
    try {
      const response = await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not remove this item.')
      await loadCart()
      window.dispatchEvent(new Event('cart-updated'))
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Could not remove this item.')
    } finally {
      setBusyProductId(null)
    }
  }

  async function beginCheckout() {
    setCheckoutMessage('')
    try {
      const response = await fetch('/api/auth/me')
      if (response.status === 401) {
        setCheckoutMessage('Please sign in or create an account before checkout.')
        return
      }
      if (!response.ok) throw new Error('We could not verify your account. Please try again.')
      setCheckoutOpen(true)
    } catch (checkoutError) {
      setCheckoutMessage(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable right now.')
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPlacingOrder) return
    setIsPlacingOrder(true)
    setCheckoutMessage('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          shipping_address: shippingAddress,
          idempotency_key: crypto.randomUUID(),
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status === 401) setCheckoutMessage('Your session expired. Please sign in again.')
        else throw new Error(result?.detail ?? 'We could not place this order.')
        return
      }
      setOrderId(result.id)
      setCheckoutOpen(false)
      await loadCart()
      window.dispatchEvent(new Event('cart-updated'))
    } catch (orderError) {
      setCheckoutMessage(orderError instanceof Error ? orderError.message : 'We could not place this order.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <main className="main cart-page">
      <div className="cart-page-title">
        <div><h1>Your cart</h1><span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span></div>
        <Link to="/#catalog">Continue shopping</Link>
      </div>

      {error && <p className="cart-alert" role="alert">{error}</p>}
      {orderId && <div className="cart-success" role="status">Order #{orderId} was created with pending payment status. Payment is not connected yet.</div>}

      {isLoading ? <p className="cart-loading">Loading your cart…</p> : cart.items.length === 0 ? (
        <section className="empty-cart">
          <div className="empty-cart-icon" aria-hidden="true">▱</div>
          <h2>Your cart is empty</h2>
          <p>Explore the catalog and add something you need.</p>
          <Link className="cart-primary-button" to="/#catalog">Browse products</Link>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Cart items">
            {cart.items.map((item) => (
              <article className="cart-line" key={item.product_id}>
                <div className="cart-line-image">
                  {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>{item.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="cart-line-details">
                  <h2>{item.name}</h2>
                  <p>Unit price {money(item.unit_price_cents)}</p>
                  <button type="button" className="cart-remove" onClick={() => void removeItem(item.product_id)} disabled={busyProductId === item.product_id}>Remove</button>
                </div>
                <div className="quantity-stepper" aria-label={`Quantity for ${item.name}`}>
                  <button type="button" aria-label="Decrease quantity" onClick={() => void updateQuantity(item.product_id, item.quantity - 1)} disabled={busyProductId === item.product_id}>−</button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => void updateQuantity(item.product_id, item.quantity + 1)} disabled={busyProductId === item.product_id}>+</button>
                </div>
                <strong className="cart-line-price">{money(item.line_total_cents)}</strong>
              </article>
            ))}
          </section>

          <aside className="order-summary">
            <h2>Order summary</h2>
            <div><span>Subtotal</span><strong>{money(cart.total_cents)}</strong></div>
            <div><span>Shipping</span><strong>Free</strong></div>
            <div><span>Estimated tax</span><span>Calculated at checkout</span></div>
            <div className="summary-total"><span>Total</span><strong>{money(cart.total_cents)}</strong></div>

            {checkoutMessage && <p className="checkout-message" role="alert">{checkoutMessage} {checkoutMessage.includes('sign in') && <Link to="/login">Sign in</Link>}</p>}

            {checkoutOpen ? (
              <form className="checkout-form" onSubmit={submitOrder}>
                <h3>Delivery details</h3>
                <label>Full name<input required minLength={1} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></label>
                <label>Phone<input required minLength={3} value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} /></label>
                <label>Shipping address<textarea required minLength={5} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} /></label>
                <button className="cart-primary-button" type="submit" disabled={isPlacingOrder}>{isPlacingOrder ? 'Placing order…' : 'Place order'}</button>
                <button className="checkout-cancel" type="button" onClick={() => setCheckoutOpen(false)}>Back to cart</button>
              </form>
            ) : (
              <button type="button" className="cart-primary-button" onClick={() => void beginCheckout()}>Proceed to checkout</button>
            )}
            <p className="summary-footnote">Order total is confirmed before payment.</p>
          </aside>
        </div>
      )}
    </main>
  )
}

export default CartPage
