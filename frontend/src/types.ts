export interface CartItem {
  product_id: number
  name: string
  unit_price_cents: number
  quantity: number
  image_url: string | null
  line_total_cents: number
}

export interface CartResponse {
  items: CartItem[]
  total_cents: number
  currency: string
}

export interface AccountUser {
  id: number
  email: string
  role: string
}

export interface OrderSummary {
  id: number
  status: string
  total_cents: number
  currency: string
  created_at: string
}
