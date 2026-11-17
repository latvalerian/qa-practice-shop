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
- Dedicated test database setup for automated tests.
- QA test plan and manual regression scenarios for authentication, account, catalog, cart, checkout and authorization (`docs/qa/`).
- Documented frontend production build check; browser automation is not set up yet.

#### Frontend
- React application initialized with Vite.
- TypeScript integration.
- React Router navigation.
- Storefront with product search, category/filter controls and catalog cards.
- Interactive cart preview and full cart page with checkout flow.
- Login, registration and authenticated account page with profile/security settings.
- API proxy configuration using the `/api` prefix.

### Changed

- Refactored available stock calculation into a reusable `_get_available_stock()` helper.
- Updated cart stock validation to account for active reservations.
- Separated frontend page routes from backend API routes.

### Fixed

- Fixed cart quantity validation when multiple requests are executed concurrently.
- Fixed concurrent checkout overselling scenario.
- Resolved frontend route and backend API path conflict.

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
