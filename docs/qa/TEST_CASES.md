# QA Practice Shop — Manual Test Scenarios

This file is a version-controlled smoke/regression checklist, not a full test-management database. Each scenario gives a short action and observable result. Record the build, browser and outcome in the run record. For a formal test case, expand the scenario with exact test data and numbered steps before execution.

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

- **Action:** Sign out, then open `/account` directly.
- **Expected:** The session is cleared and the page asks the user to sign in.

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

## Catalog and cart

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

- **Action:** Select each category, stock/price filters and sort option; then clear filters.
- **Expected:** Product list and result count reflect selections; clearing restores the full result set.

### CART-07 — Search and popular-search chips · P2

- **Action:** Search for a matching term, use a popular-search chip, then search for a term with no matches. Check focus and keyboard interaction.
- **Expected:** Matching products are shown; no-match state is clear; input, suggestions and keyboard controls work.

## Checkout, orders and authorization

### ORDER-01 — Guest checkout · P1

- **Action:** Start checkout while signed out.
- **Expected:** Checkout is blocked and sign-in is offered; cart contents remain.

### ORDER-02 — Successful checkout · P1

- **Action:** As an authenticated user, submit valid delivery details for a non-empty cart.
- **Expected:** One pending-payment order is created, stock is reserved, and the cart is cleared.

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

| Date | Commit/build | Browser | Cases run | Result / defect links |
|---|---|---|---|---|
|  |  |  |  |  |
