import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CartResponse } from '../types'

interface CartPreviewProps {
  cart: CartResponse
  isLoading: boolean
  onClose: () => void
  onUpdateQuantity: (productId: number, quantity: number) => Promise<void>
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function CartPreview({ cart, isLoading, onClose, onUpdateQuantity }: CartPreviewProps) {
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  async function changeQuantity(productId: number, quantity: number) {
    setBusyProductId(productId)
    setError('')
    try {
      await onUpdateQuantity(productId, quantity)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this item.')
    } finally {
      setBusyProductId(null)
    }
  }

  return (
    <section className="quick-panel cart-preview" aria-label="Cart preview">
      <div className="quick-panel-heading">
        <h2>Your bag · {itemCount} {itemCount === 1 ? 'item' : 'items'}</h2>
        <button type="button" onClick={onClose} aria-label="Close cart preview">×</button>
      </div>

      {isLoading ? (
        <p className="quick-panel-message">Loading your cart…</p>
      ) : cart.items.length === 0 ? (
        <div className="quick-panel-empty">
          <p>Your cart is empty.</p>
          <span>Find something you love in the catalog.</span>
        </div>
      ) : (
        <>
          {error && <p className="cart-alert" role="alert">{error}</p>}
          <div className="preview-items">
            {cart.items.slice(0, 4).map((item) => (
              <article className="preview-item" key={item.product_id}>
                <div className="preview-thumb">
                  {item.image_url ? <img src={item.image_url} alt="" /> : <span>{item.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="preview-item-copy">
                  <strong>{item.name}</strong>
                  <div className="preview-quantity">
                    <button type="button" aria-label={`Decrease ${item.name}`} disabled={busyProductId === item.product_id} onClick={() => void changeQuantity(item.product_id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name}`} disabled={busyProductId === item.product_id} onClick={() => void changeQuantity(item.product_id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <strong className="preview-item-price">{money(item.line_total_cents)}</strong>
              </article>
            ))}
            {cart.items.length > 4 && <p className="preview-more">And {cart.items.length - 4} more items</p>}
          </div>
          <div className="preview-subtotal"><span>Subtotal</span><strong>{money(cart.total_cents)}</strong></div>
          <Link className="preview-primary" to="/cart" onClick={onClose}>Checkout</Link>
          <Link className="preview-secondary" to="/cart" onClick={onClose}>View full cart</Link>
        </>
      )}

      {cart.items.length === 0 && !isLoading && (
        <Link className="preview-primary" to="/#catalog" onClick={onClose}>Continue shopping</Link>
      )}
    </section>
  )
}

export default CartPreview
