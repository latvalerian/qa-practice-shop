# QA Practice Shop — Manual Test Scenarios

This file is a version-controlled smoke/regression checklist, not a full test-management database. Each scenario gives a short action and observable result. `UI` cases are manual browser checks; `API` cases call the backend directly and do not require the frontend. Record the build, browser (for UI cases) and outcome in the run record. For a formal test case, expand the scenario with exact test data and numbered steps before execution.

Mark each run `PASS`, `FAIL`, `BLOCKED` or `NOT RUN`. Do not put credentials, tokens, cookies or real payment details in this file or in screenshots.

## Authentication and account

### AUTH-01 — Register a new customer · P1

- **Action:** Register with a new email, full name, matching password and optional phone; reload the account page.
- **Expected:** The account is created and signed in. Profile data persists, and the guest cart is merged.

### AUTH-02 — Register with an email already in use · P1

- **Action:** Submit registration using an existing account email.
- **Expected:** Registration is rejected with a clear message; the existing account is unchanged.

### AUTH-03 — Password confirmation mismatch · P1

- **Action:** Submit registration with different password and confirmation values.
- **Expected:** Submission is blocked and the mismatch is identified.

### AUTH-04 — Sign in with valid and invalid credentials · P1

- **Action:** Sign in once with valid credentials and once with an incorrect password.
- **Expected:** Valid credentials start a session. Invalid credentials show a generic error and do not expose the password or token.

### AUTH-05 — Sign out and revisit the account · P1

- **Action:** Choose sign out from the account preview and account page; cancel once, then confirm and open `/account` directly.
- **Expected:** An in-site confirmation dialog appears. Cancel keeps the session active; confirming clears it and the page asks the user to sign in.

### AUTH-06 — Remember me behavior · P2

- **Action:** Sign in with Remember me off, then on; inspect behavior after closing/reopening the browser.
- **Expected:** Off uses a browser-session cookie and shorter server expiry; on persists for the configured longer session.

### AUTH-07 — Change password · P1

- **Action:** Try a wrong current password, mismatched confirmation, then valid values. If possible, keep a second session open.
- **Expected:** Invalid changes are rejected. A successful change keeps the current session, revokes other sessions, and the new password works on the next sign-in.

### AUTH-08 — Update profile · P1

- **Action:** Change the profile name and phone, save, then reload the account page.
- **Expected:** New values persist; email remains read-only.

### AUTH-09 — Customer and administrator roles · P2

- **Action:** Sign in with each role and inspect the account page and role-restricted actions.
- **Expected:** The correct role is shown; customer-facing profile controls cannot change the role.

### AUTH-10 — Invalid registration values · P1

- **Action:** Submit malformed email, whitespace-only name and malformed phone through both UI and API.
- **Expected:** Invalid data is rejected consistently by the browser and server.

**Known gap:** The API currently checks email length but not email syntax, trims names without rejecting a blank result, and only trims phone text. Record the API-accepted invalid values as defects; browser validation alone is not sufficient.

### AUTH-11 — Empty or malformed Bearer authorization · P1 · API

- **Action:** Send `GET /auth/me` with `Authorization: Bearer ` (empty token), then with a malformed authorization scheme/token.
- **Expected:** The API returns `401 Unauthorized` without a server error or traceback. No protected account data is returned.
- **Automation:** The backend suite includes a regression check for the empty Bearer-token parsing path; this manual case checks the HTTP response boundary.

### AUTH-12 — Confirm sign-out from account preview and account page · P1

- **Action:** Open the account preview or account page and choose `Sign out`. Cancel the confirmation once, then choose sign out again and confirm.
- **Expected:** Cancel keeps the session active. Confirming clears the session and routes to sign-in. Both sign-out controls remain available.

### ACC-01 — Account page readability and responsive layout · P2

- **Action:** Open the account page on desktop and mobile widths. Review the profile card, sidebar, payment/security cards, order history and settings dialog.
- **Expected:** Text and controls are readable and consistent with the storefront; sections fit the viewport without horizontal overflow.

## Catalog and cart

### CAT-03 — Add-to-cart feedback at any scroll position · P2

- **Action:** Add a product from the top row, then scroll down and add another product.
- **Expected:** A centered confirmation appears over the viewport in both cases and dismisses automatically.

### CAT-04 — Adjust cart quantity from product cards · P1

- **Action:** Add a product, increase its quantity, decrease it, then decrease from one to zero; cancel the site confirmation once, then confirm removal.
- **Expected:** The card shows the current cart quantity beside the price, `+` and `−` update the cart and header count, and confirming removal at one clears the count. Cancel keeps the product in the cart.

### NAV-01 — Sticky header and back-to-top control · P2

- **Action:** Scroll down a long page, use the header actions, then use the arrow that appears near the bottom corner.
- **Expected:** The header remains visible while scrolling; the arrow returns the page smoothly to the top and is hidden near the top.

### NAV-02 — About link and shared footer · P2

- **Action:** Select `About` from the catalog, cart and account pages, including once while the footer is already visible; inspect the footer links.
- **Expected:** The current route is preserved and the page moves directly to the footer. If already visible, the footer is briefly highlighted. Footer links appear in one row and include GitHub, LinkedIn, Instagram and Telegram.

### CART-11 — Cart typography and responsive sizing · P2

- **Action:** Review the cart page on desktop and mobile widths, including the order summary and checkout form.
- **Expected:** Text is comfortably readable and visually consistent with the catalog and account pages, without horizontal overflow.

### CART-01 — Add an in-stock product as a guest · P1

- **Action:** Add an available product from the catalog.
- **Expected:** Header count and cart preview update; the product appears on `/cart`.

### CART-02 — Change quantity and remove a product · P1

- **Action:** Increase/decrease quantity and remove a product in the preview and full cart.
- **Expected:** Cart contents, subtotal and header count stay in sync; quantity zero removes the item.

### CART-03 — Exceed available stock · P1

- **Action:** Add or increase quantity beyond available stock.
- **Expected:** The API rejects the change, cart quantity remains valid, and a clear error is shown.

### CART-04 — Merge guest cart after sign-in · P1

- **Action:** Add products as a guest, then register or sign in.
- **Expected:** Items and quantities merge into the account cart once, without loss or duplication.

### CART-05 — Verify account data isolation · P1

- **Action:** While signed in as one user, attempt to open another user's cart or order.
- **Expected:** Another user's cart and order data are not visible.

### CART-06 — Category, filters and sorting · P2

- **Action:** Open Filters, interact with controls inside it, click elsewhere to dismiss it, then select categories, filters and sort options.
- **Expected:** Clicking inside the popover keeps it open; clicking outside closes it. Product list and result count reflect selections; clearing restores the full result set.

### CART-08 — Cart preview has one cart action · P2

- **Action:** Open the cart preview with at least one item and inspect its actions; activate `Checkout`.
- **Expected:** There is one action to continue to the full cart/checkout flow; it opens `/cart`.

### CART-09 — Confirm removing a cart item · P2

- **Action:** Use the trash icon or reduce an item quantity from one to zero in the preview or full cart; cancel once, then repeat and confirm.
- **Expected:** A branded in-site confirmation appears. Cancel keeps the item; confirmation removes only that item. The trash icon is positioned before the quantity control.

### CART-10 — Clear all or selected cart items · P1

- **Action:** Clear the cart with all items selected, then add several items and clear only a subset; cancel one confirmation before confirming the next.
- **Expected:** Confirmation cancel changes nothing; confirming removes the selected items only. Unselected items remain, and the cart preview count updates.

### CAT-01 — Show catalog products in batches · P2

- **Action:** Open the catalog with more than 20 matching products, click `Show more`, then change the search term or a filter.
- **Expected:** The first 20 products appear initially; each click reveals up to 20 more; the button disappears when all matches are shown. Changing search or filters returns the list to the first batch.

### CAT-02 — Search suggestions survive route changes · P2

- **Action:** Observe rotating suggestions, open the account or cart, then return to the homepage. Also try a matching term, a popular-search chip and a no-match query.
- **Expected:** Rotating suggestions resume from the start after returning; matching products are shown, no-match state is clear, and input, focus and keyboard controls work.

## Checkout, orders and authorization

### ORDER-01 — Guest checkout · P1

- **Action:** Start checkout while signed out.
- **Expected:** Checkout is blocked and sign-in is offered; cart contents remain.

### ORDER-02 — Successful checkout · P1

- **Action:** As an authenticated user, submit valid delivery details with all cart items selected.
- **Expected:** One pending-payment order is created, stock is reserved for ordered items, and those items are removed from the cart.

### ORDER-06 — Checkout selected cart items · P1

- **Action:** As an authenticated user, select only some cart items and place an order; then try checkout with no items selected.
- **Expected:** The order contains only selected items and the others remain in the cart. With no selection, checkout is blocked with a message asking to select at least one item.

### ORDER-03 — Empty cart or invalid delivery data · P1

- **Action:** Submit checkout with an empty cart or invalid delivery details.
- **Expected:** No order is created and a clear validation/error message is shown.

### ORDER-04 — Order history ownership · P1

- **Action:** View order history, then try to access another user's order ID.
- **Expected:** Own order is visible; another user's order is denied or not found.

### ORDER-05 — Cancel an eligible order · P2

- **Action:** Cancel a pending-payment order, then try cancelling an ineligible order.
- **Expected:** Eligible order is cancelled and reserved stock released; ineligible order cannot be cancelled.

### ADMIN-01 — Admin-only API access · P1

- **Action:** Call an admin-only API as an unauthenticated user, customer and administrator.
- **Expected:** Unauthenticated user receives unauthorized, customer receives forbidden, and administrator is allowed.

## Settings and safe limitations

### SET-01 — Payment settings · P1

- **Action:** Open payment settings and inspect available controls.
- **Expected:** The UI says a payment provider is not connected; no card number or CVV is requested or stored.

### SET-02 — Password reset · P2

- **Action:** Use the password-reset link.
- **Expected:** The UI explains email reset is unavailable and does not claim an email was sent.

### SET-03 — Keyboard access to previews and dialogs · P2

- **Action:** Open and close previews/settings dialogs using keyboard controls, including Escape where supported.
- **Expected:** Focus is visible and remains usable; close controls work.

## Execution record

| Date | Commit/build | Browser (UI only) | Cases run | Result / defect links |
|---|---|---|---|---|
|  |  |  |  |  |
