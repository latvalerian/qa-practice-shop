import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { CartResponse } from '../types'

const emptyCart: CartResponse = { items: [], total_cents: 0, currency: 'USD' }
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

interface CartPageProps {
  confirmAction: (request: { title: string; message: string; confirmLabel: string }) => Promise<boolean>
}

function CartPage({ confirmAction }: CartPageProps) {
  const [cart, setCart] = useState<CartResponse>(emptyCart)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [isClearingSelected, setIsClearingSelected] = useState(false)
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
      setSelectedProductIds((selected) => {
        const availableIds = new Set(data.items.map((item) => item.product_id))
        const previousIds = new Set(selected)
        return [
          ...selected.filter((id) => availableIds.has(id)),
          ...data.items.map((item) => item.product_id).filter((id) => !previousIds.has(id)),
        ]
      })
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'We could not load your cart.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadCart() }, [])

  async function updateQuantity(productId: number, quantity: number) {
    if (quantity < 1) {
      const item = cart.items.find((cartItem) => cartItem.product_id === productId)
      const confirmed = await confirmAction({
        title: 'Remove item from cart?',
        message: item?.name ?? 'This item will be removed from your cart.',
        confirmLabel: 'Remove item',
      })
      if (!confirmed) return
    }
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
    const item = cart.items.find((cartItem) => cartItem.product_id === productId)
    const confirmed = await confirmAction({
      title: 'Remove item from cart?',
      message: item?.name ?? 'This item will be removed from your cart.',
      confirmLabel: 'Remove item',
    })
    if (!confirmed) return
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
    if (selectedProductIds.length === 0) {
      setCheckoutMessage('Select at least one item to continue to checkout.')
      return
    }
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
          product_ids: selectedProductIds,
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
  const selectedItems = cart.items.filter((item) => selectedProductIds.includes(item.product_id))
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.line_total_cents, 0)
  const allSelected = cart.items.length > 0 && selectedItems.length === cart.items.length

  function toggleProduct(productId: number) {
    setSelectedProductIds((selected) => selected.includes(productId)
      ? selected.filter((id) => id !== productId)
      : [...selected, productId])
    setCheckoutMessage('')
  }

  async function clearSelectedItems() {
    const count = selectedItems.length
    if (count === 0) return
    const confirmed = await confirmAction({
      title: count === cart.items.length ? 'Clear cart?' : 'Remove selected items?',
      message: count === cart.items.length
        ? 'All items will be removed from your cart.'
        : `${count} selected ${count === 1 ? 'item will' : 'items will'} be removed from your cart.`,
      confirmLabel: count === cart.items.length ? 'Clear cart' : 'Remove selected',
    })
    if (!confirmed) return
    setIsClearingSelected(true)
    setError('')
    try {
      for (const item of selectedItems) {
        const response = await fetch(`/api/cart/items/${item.product_id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Could not remove all selected items.')
      }
      await loadCart()
      window.dispatchEvent(new Event('cart-updated'))
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Could not clear selected items.')
      await loadCart()
    } finally {
      setIsClearingSelected(false)
    }
  }

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
            <div className="cart-selection-toolbar">
              <label><input type="checkbox" checked={allSelected} disabled={isClearingSelected} onChange={(event) => setSelectedProductIds(event.target.checked ? cart.items.map((item) => item.product_id) : [])} /> Select all</label>
              <button type="button" onClick={() => void clearSelectedItems()} disabled={selectedItems.length === 0 || isClearingSelected}>{isClearingSelected ? 'Clearing…' : 'Clear cart'}</button>
            </div>
            {cart.items.map((item) => (
              <article className="cart-line" key={item.product_id}>
                <input className="cart-item-checkbox" type="checkbox" aria-label={`Select ${item.name}`} checked={selectedProductIds.includes(item.product_id)} disabled={isClearingSelected} onChange={() => toggleProduct(item.product_id)} />
                <div className="cart-line-image">
                  {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>{item.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="cart-line-details">
                  <h2>{item.name}</h2>
                  <p>Unit price {money(item.unit_price_cents)}</p>
                </div>
                <div className="cart-line-actions">
                  <button type="button" className="cart-remove-icon" aria-label={`Remove ${item.name}`} title="Remove item" onClick={() => void removeItem(item.product_id)} disabled={isClearingSelected || busyProductId === item.product_id}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 3v7m6-7v7" /></svg>
                  </button>
                  <div className="quantity-stepper" aria-label={`Quantity for ${item.name}`}>
                    <button type="button" aria-label="Decrease quantity" onClick={() => void updateQuantity(item.product_id, item.quantity - 1)} disabled={isClearingSelected || busyProductId === item.product_id}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => void updateQuantity(item.product_id, item.quantity + 1)} disabled={isClearingSelected || busyProductId === item.product_id}>+</button>
                  </div>
                </div>
                <strong className="cart-line-price">{money(item.line_total_cents)}</strong>
              </article>
            ))}
          </section>

          <aside className="order-summary">
            <h2>Order summary</h2>
            <div><span>Selected subtotal</span><strong>{money(selectedTotal)}</strong></div>
            <div><span>Shipping</span><strong>Free</strong></div>
            <div><span>Estimated tax</span><span>Calculated at checkout</span></div>
            <div className="summary-total"><span>Total</span><strong>{money(selectedTotal)}</strong></div>

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
