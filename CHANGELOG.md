# Changelog

All notable changes to Practice Shop QA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0).

The project is currently under active development. Changes are tracked under `Unreleased` until an official release is published.

## [Unreleased]

### Added

#### Backend
- FastAPI application with PostgreSQL integration.
- REST API for product catalog management.
- User registration, authentication, and logout.
- Password hashing and role-based access control.
- Guest and authenticated shopping carts.
- Guest cart merging after registration.
- Cart item creation, quantity updates, and removal.
- Checkout and order creation.
- Idempotent checkout requests.
- Stock reservation and expiration logic.
- Order cancellation and reservation release.
- Administrative user and product management.

#### Testing
- Pytest integration tests for product/catalog API behavior, including concurrent checkout and stock protection.
- Added a backend regression test for empty Bearer authorization returning `401` instead of `500`.
- Dedicated test database setup for automated tests.
- QA test plan and manual regression scenarios for authentication, account, catalog, cart, checkout and authorization (`docs/qa/`).
- Updated the QA plan for the security-focused backend pass and added an API case for malformed authorization headers.
- Documented frontend production build check; browser automation is not set up yet.

#### Frontend
- React application initialized with Vite.
- TypeScript integration.
- React Router navigation.
- Storefront with product search, category/filter controls and catalog cards.
- Catalog reveals products in batches of 20 with a `Show more` control.
- Interactive cart preview and full cart page with checkout flow.
- Cart item selection, confirmed item removal and clearing selected items; checkout submits only selected products.
- Shared project footer on every page, About navigation, creator profile links (GitHub, LinkedIn, Instagram and Telegram) and a back-to-top control.
- Product cards show the current cart quantity beside the price and provide quantity controls synced with the cart.
- Login, registration and authenticated account page with profile/security settings.
- API proxy configuration using the `/api` prefix.

### Changed

- Refactored available stock calculation into a reusable `_get_available_stock()` helper.
- Updated cart stock validation to account for active reservations.
- Separated frontend page routes from backend API routes.
- Removed the unused legacy product `price` field; `price_cents` is the single source of truth.
- Enlarged cart typography for consistency with the catalog and account pages.
- Replaced native browser prompts for cart removal and sign-out with branded in-app confirmation dialogs; softened the add-to-cart notification to match the shop palette.

### Fixed

- Aligned product card `Add to cart` buttons despite different description lengths.
- Fixed account dashboard text and controls being undersized and difficult to read.
- Removed the duplicate cart-preview link to `/cart`.
- Replaced the redundant full-account action with `Sign out` in the account preview.
- Added sign-out confirmation in the account preview and account page.
- Closed the catalog filter popover when clicking outside it while keeping inside interactions usable.
- Restarted rotating search suggestions when returning to the homepage after navigating to another route.
- Fixed handling of empty or malformed Bearer authorization headers in authenticated routes and logout.
- Fixed cart quantity validation when multiple requests are executed concurrently.
- Fixed concurrent checkout overselling scenario.
- Resolved frontend route and backend API path conflict.
- Moved add-to-cart feedback into a centered notification that remains visible at any catalog scroll position.
- Kept the site header visible while scrolling.
- Fixed the About link so it scrolls to and briefly highlights the footer without navigating away from the current page.

### Planned

- Product favorites.
- Admin dashboard UI.
- Order tracking interface.
- Bonus points system.
- Customer support interface.
- AI-powered support assistant.

---

## Release History

No official releases yet.
