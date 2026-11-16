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
- Pytest test suite for API functionality.
- Database isolation for automated tests.
- Authentication and authorization tests.
- Shopping cart and checkout tests.
- Stock reservation and inventory validation tests.
- Concurrent cart addition test.
- Concurrent checkout test to verify overselling protection.

#### Frontend
- React application initialized with Vite.
- TypeScript integration.
- React Router navigation.
- Catalog page.
- Cart page scaffold.
- Login page scaffold.
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

- Complete storefront UI and responsive layout.
- Product search and filtering.
- Product favorites.
- Shopping cart drawer.
- Full shopping cart page.
- User profile and account management.
- Checkout interface.
- Order history and tracking.
- Bonus points system.
- Customer support interface.
- AI-powered support assistant.

---

## Release History

No official releases yet.