import { expect, test } from '@playwright/test'

test('add a product, change its quantity, and remove it from the catalog', async ({ page }) => {
  const productsResponse = await page.request.get('/api/products')
  expect(productsResponse.ok()).toBeTruthy()

  const products: { name: string; stock_quantity: number }[] = await productsResponse.json()
  const productWithEnoughStock = products.find((product) => product.stock_quantity >= 2)
  if (!productWithEnoughStock) {
    throw new Error('The catalog needs at least one product with two available units')
  }

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible()

  const productName = productWithEnoughStock.name
  const productCard = page.locator('.product').filter({ hasText: productName }).first()

  await productCard.getByRole('button', { name: 'Add to cart' }).click()

  const quantity = productCard.locator('.product-cart-quantity span')
  await expect(quantity).toHaveText('1')

  await productCard.getByRole('button', { name: `Increase ${productName} quantity` }).click()
  await expect(quantity).toHaveText('2')

  await productCard.getByRole('button', { name: `Decrease ${productName} quantity` }).click()
  await expect(quantity).toHaveText('1')

  await productCard.getByRole('button', { name: `Decrease ${productName} quantity` }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Remove item' }).click()

  await expect(productCard.locator('.product-cart-quantity')).toHaveCount(0)
  await expect(productCard.getByRole('button', { name: 'Add to cart' })).toBeEnabled()
})

test('shows only in-stock products when the filter is enabled', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Filters' }).click()
  await page.getByLabel('In stock only').check()

  const productCards = page.locator('.product')
  await expect(productCards.first()).toBeVisible()
  await expect(page.locator('.product .out-of-stock')).toHaveCount(0)
})

test('loads the next 20 products', async ({ page }) => {
  await page.goto('/')

  const productCards = page.locator('.product')
  await expect(productCards).toHaveCount(20)

  await page.getByRole('button', { name: 'Show more' }).click()
  await expect(productCards).toHaveCount(40)
})